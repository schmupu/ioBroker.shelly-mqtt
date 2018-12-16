/* jshint -W097 */
/* jshint -W030 */
/* jshint strict:true */
/* jslint node: true */
/* jslint esversion: 6 */
'use strict';


const mqtt = require('mqtt-connection');
const net = require('net');
const types = require(__dirname + '/datapoints');


function MQTTServer(adapter) {

    if (!(this instanceof MQTTServer)) return new MQTTServer(adapter);

    let messageId = 1;

    function sendState2Client(client, topic, state, qos, retain, cb) {
        if (typeof qos === 'function') {
            cb = qos;
            qos = undefined;
        }
        if (typeof retain === 'function') {
            cb = retain;
            retain = undefined;
        }
        adapter.log.info('Send to "' + client.id + '": ' + topic + ' = ' + state);
        client.publish({ topic: topic, payload: state, qos: qos, retain: retain, messageId: messageId++ }, cb);
        messageId &= 0xFFFFFFFF;
    }


    const NO_PREFIX = '';

    let server = new net.Server();

    server.on('connection', (stream) => {

        let client;
        let ws = false;
        if (ws) {
            // client = mqtt(wsStream(stream));
        } else {
            client = mqtt(stream);
        }

        // client connected
        client.on('connect', (packet) => {
            // acknowledge the connect packet
            adapter.log.info("connect: " + JSON.stringify(packet));
            adapter.log.info("User: " + packet.username + ", Password: " + packet.password);
            adapter.log.info("Will: " + packet.will);

            // Letzer Wille speichern
            if (packet.will) {
            }

            client.connack({ returnCode: 0 });
            // client.connack({ returnCode: 0, sessionPresent });
        });


        client.on('publish', packet => {
            adapter.log.info("publish: " + JSON.stringify(packet));
            if (packet.payload) adapter.log.info("publish payload: " + packet.topic + " = " + packet.payload.toString());
            if (packet.qos === 1) {
                // send PUBACK to client
                client.puback({
                    messageId: packet.messageId
                });
            } else if (packet.qos === 2) {
                /*
                const pack = client._messages.find(e => {
                    return e.messageId === packet.messageId;
                });
                if (pack) {
                    // duplicate message => ignore
                    adapter.log.warn(`Client [${client.id}] Ignored duplicate message with ID: ${packet.messageId}`);
                    return;
                } else {
                    packet.ts = Date.now();
                    packet.cmd = 'pubrel';
                    packet.count = 0;
                    client._messages.push(packet);
                    client.pubrec({
                        messageId: packet.messageId
                    });
                    return;
                }
                */
            }

        });

        // client pinged
        client.on('pingreq', () => {
            // send a pingresp
            client.pingresp();
        });

        // response for QoS2
        client.on('pubrec', packet => {

            let pos = null;
            // remove this message from queue
            /*
            client._messages.forEach((e, i) => {
                if (e.messageId === packet.messageId) {
                    pos = i;
                    return false;
                }
            });
            */
            if (pos !== -1) {
                client.pubrel({
                    messageId: packet.messageId
                });
            } else {
                adapter.log.warn(`Client [${client.id}] Received pubrec on ${client.id} for unknown messageId ${packet.messageId}`);
            }
        });


        // response for QoS2
        client.on('pubcomp', packet => {

            let pos = null;
            // remove this message from queue
            /*
            client._messages.forEach((e, i) => {
                if (e.messageId === packet.messageId) {
                    pos = i;
                    return false;
                }
            });
            */
            if (pos !== null) {
                client._messages.splice(pos, 1);
            } else {
                adapter.log.warn(`Client [${client.id}] Received pubcomp for unknown message ID: ${packet.messageId}`);
            }
        });


        // response for QoS2
        client.on('pubrel', packet => {

            let pos = null;
            // remove this message from queue
            /*
            client._messages.forEach((e, i) => {
                if (e.messageId === packet.messageId) {
                    pos = i;
                    return false;
                }
            });
            */
            if (pos !== -1) {
                client.pubcomp({
                    messageId: packet.messageId
                });
               //  receivedTopic(client._messages[pos], client);
            } else {
                adapter.log.warn(`Client [${client.id}] Received pubrel on ${client.id} for unknown messageId ${packet.messageId}`);
            }
        });

        // response for QoS1
        client.on('puback', packet => {


            // remove this message from queue
            let pos = null;
            // remove this message from queue
            /*
            client._messages.forEach((e, i) => {
                if (e.messageId === packet.messageId) {
                    pos = i;
                    return false;
                }
            });
            */
            if (pos !== null) {
                adapter.log.debug(`Client [${client.id}] Received puback for ${client.id} message ID: ${packet.messageId}`);
                client._messages.splice(pos, 1);
            } else {
                adapter.log.warn(`Client [${client.id}] Received puback for unknown message ID: ${packet.messageId}`);
            }
        });


        client.on('unsubscribe', (packet) => {
            client.unsuback({ messageId: packet.messageId });
        });

        // client subscribed
        client.on('subscribe', (packet) => {
            // send a suback with messageId and granted QoS le^el
            adapter.log.info("subscribe: " + JSON.stringify(packet));
            const granted = [];
            for (let i = 0; i < packet.subscriptions.length; i++) {
                granted.push(packet.subscriptions[i].qos);
                let topic = packet.subscriptions[i].topic;
                adapter.log.info("publish topic: " + topic);
            }

            if (packet.topic) adapter.log.info("subscribe topic: " + packet.topic);
            // adapter.log.info("Will: " + packet.will);
            // client.suback({ granted: [packet.qos], messageId: packet.messageId });
            /*
            sendState2Client(client,
                "shellies/shellyswitch-9F5FBB/relay/0/command",
                'on',
                0,
                false);
        */
            sendState2Client(client,
                "shellies/shellyswitch-9F5FBB/roller/0/command",
                'stop',
                0,
                false);

            client.suback({ granted: granted, messageId: packet.messageId });
        });

        // timeout idle streams after 5 minutes
        stream.setTimeout(1000 * 60 * 5);

        // connection error handling
        client.on('close', () => { 
            client.destroy(); 
        });
        client.on('error', () => { 
            client.destroy();
        });
        client.on('disconnect', () => { 
            client.destroy();
        });

        // stream timeout
        stream.on('timeout', () => { client.destroy(); });
    });

    // listen on port 1883
    server.listen(1882, "0.0.0.0", () => {
    });

    return this;
}

module.exports = MQTTServer;