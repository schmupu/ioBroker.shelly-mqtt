/* jshint -W097 */
/* jshint -W030 */
/* jshint strict:true */
/* jslint node: true */
/* jslint esversion: 6 */
'use strict';


const mqtt = require('mqtt-connection');
const net = require('net');
const types = require(__dirname + '/datapoints');


class MQTTClient {

    constructor(adapter, stream) {

        this.client = null;
        this.stream = stream;
        this.adapter = adapter;

        let ws = false;
        if (ws) {
            // client = mqtt(wsStream(stream));
        } else {
            this.client = mqtt(this.stream);
        }
        this.listen();
    }

    sendState2Client(client, topic, state, qos, retain, cb) {
        if (typeof qos === 'function') {
            cb = qos;
            qos = undefined;
        }
        if (typeof retain === 'function') {
            cb = retain;
            retain = undefined;
        }
        this.adapter.log.info('Send to "' + client.id + '": ' + topic + ' = ' + state);
        client.publish({ topic: topic, payload: state, qos: qos, retain: retain, messageId: this.messageId++ }, cb);
        this.messageId &= 0xFFFFFFFF;
    }


    listen() {
        // client connected
        this.client.on('connect', (packet) => {
            // acknowledge the connect packet
            this.adapter.log.info("connect: " + JSON.stringify(packet));
            this.adapter.log.info("User: " + packet.username + ", Password: " + packet.password);
            this.adapter.log.info("Will: " + packet.will);

            // Letzer Wille speichern
            if (packet.will) {
            }

            this.client.connack({ returnCode: 0 });
            // this.client.connack({ returnCode: 0, sessionPresent });
        });


        this.client.on('publish', packet => {
            this.adapter.log.info("publish: " + JSON.stringify(packet));
            if (packet.payload) this.adapter.log.info("publish payload: " + packet.topic + " = " + packet.payload.toString());
            if (packet.qos === 1) {
                // send PUBACK to this.client
                this.client.puback({
                    messageId: packet.messageId
                });
            } else if (packet.qos === 2) {
                /*
                const pack = this.client._messages.find(e => {
                    return e.messageId === packet.messageId;
                });
                if (pack) {
                    // duplicate message => ignore
                    this.adapter.log.warn(`Client [${this.client.id}] Ignored duplicate message with ID: ${packet.messageId}`);
                    return;
                } else {
                    packet.ts = Date.now();
                    packet.cmd = 'pubrel';
                    packet.count = 0;
                    this.client._messages.push(packet);
                    this.client.pubrec({
                        messageId: packet.messageId
                    });
                    return;
                }
                */
            }

        });

        // this.client pinged
        this.client.on('pingreq', () => {
            // send a pingresp
            this.client.pingresp();
        });

        // response for QoS2
        this.client.on('pubrec', packet => {

            let pos = null;
            // remove this message from queue
            /*
            this.client._messages.forEach((e, i) => {
                if (e.messageId === packet.messageId) {
                    pos = i;
                    return false;
                }
            });
            */
            if (pos !== -1) {
                this.client.pubrel({
                    messageId: packet.messageId
                });
            } else {
                this.adapter.log.warn(`Client [${this.client.id}] Received pubrec on ${this.client.id} for unknown messageId ${packet.messageId}`);
            }
        });


        // response for QoS2
        this.client.on('pubcomp', packet => {

            let pos = null;
            // remove this message from queue
            /*
            this.client._messages.forEach((e, i) => {
                if (e.messageId === packet.messageId) {
                    pos = i;
                    return false;
                }
            });
            */
            if (pos !== null) {
                this.client._messages.splice(pos, 1);
            } else {
                this.adapter.log.warn(`Client [${this.client.id}] Received pubcomp for unknown message ID: ${packet.messageId}`);
            }
        });


        // response for QoS2
        this.client.on('pubrel', packet => {

            let pos = null;
            // remove this message from queue
            /*
            this.client._messages.forEach((e, i) => {
                if (e.messageId === packet.messageId) {
                    pos = i;
                    return false;
                }
            });
            */
            if (pos !== -1) {
                this.client.pubcomp({
                    messageId: packet.messageId
                });
                //  receivedTopic(this.client._messages[pos], client);
            } else {
                this.adapter.log.warn(`Client [${this.client.id}] Received pubrel on ${this.client.id} for unknown messageId ${packet.messageId}`);
            }
        });

        // response for QoS1
        this.client.on('puback', packet => {


            // remove this message from queue
            let pos = null;
            // remove this message from queue
            /*
            this.client._messages.forEach((e, i) => {
                if (e.messageId === packet.messageId) {
                    pos = i;
                    return false;
                }
            });
            */
            if (pos !== null) {
                this.adapter.log.debug(`Client [${this.client.id}] Received puback for ${this.client.id} message ID: ${packet.messageId}`);
                this.client._messages.splice(pos, 1);
            } else {
                this.adapter.log.warn(`Client [${this.client.id}] Received puback for unknown message ID: ${packet.messageId}`);
            }
        });


        this.client.on('unsubscribe', (packet) => {
            this.client.unsuback({ messageId: packet.messageId });
        });

        // this.client subscribed
        this.client.on('subscribe', (packet) => {
            // send a suback with messageId and granted QoS le^el
            this.adapter.log.info("subscribe: " + JSON.stringify(packet));
            const granted = [];
            for (let i = 0; i < packet.subscriptions.length; i++) {
                granted.push(packet.subscriptions[i].qos);
                let topic = packet.subscriptions[i].topic;
                this.adapter.log.info("publish topic: " + topic);
            }

            if (packet.topic) this.adapter.log.info("subscribe topic: " + packet.topic);
            // this.adapter.log.info("Will: " + packet.will);
            // this.client.suback({ granted: [packet.qos], messageId: packet.messageId });
            /*
            sendState2Client(this.client,
                "shellies/shellyswitch-9F5FBB/relay/0/command",
                'on',
                0,
                false);
        */
            this.sendState2Client(this.client,
                "shellies/shellyswitch-9F5FBB/roller/0/command",
                'open',
                0,
                false);

            this.client.suback({ granted: granted, messageId: packet.messageId });
        });

        // timeout idle streams after 5 minutes
        this.stream.setTimeout(1000 * 60 * 5);

        // connection error handling
        this.client.on('close', () => {
            this.client.destroy();
        });
        this.client.on('error', () => {
            this.client.destroy();
        });
        this.client.on('disconnect', () => {
            this.client.destroy();
        });

        // stream timeout
        this.stream.on('timeout', () => { this.client.destroy(); });

    }

}

class MQTTServer {

    constructor(adapter) {

        if (!(this instanceof MQTTServer)) return new MQTTServer(adapter);
        this.messageId = 1;
        this.server = new net.Server();
        this.adapter = adapter;
        this.clients = [];

    }


    onStateChange(id, state) {
        /*
        this.adapter.log.debug('onStateChange ' + id + ': ' + JSON.stringify(state));
        if (server) {
            setImmediate(() => {
                for (let k in clients) {
                    if (clients.hasOwnProperty(k)) {
                        sendState2Client(clients[k], id, state, adapter.config.defaultQoS, true);
                    }
                }
                for (let clientId in persistentSessions) {
                    if (persistentSessions.hasOwnProperty(clientId) && !clients[clientId]) {
                        (function (_clientId) {
                            getMqttMessage(persistentSessions[_clientId], id, state, adapter.config.defaultQoS, true, (err, message) => {
                                message && persistentSessions[_clientId].messages.push(message);
                            });
                        })(clientId);
                    }
                }
            });
        }
        */
    }


    listen() {

        this.server.on('connection', (stream) => {
            let client = new MQTTClient(this.adapter, stream);
            this.clients.push(client);
        });


        // listen on port 1883
        this.server.listen(1882, "0.0.0.0", () => {
        });
    }

}

module.exports = {
    MQTTServer: MQTTServer
};