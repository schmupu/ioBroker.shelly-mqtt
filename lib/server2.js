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


        var mqtt2 = require('mqtt-packet');
        var object = {
            cmd: 'publish',
            retain: false,
            qos: 0,
            dup: false,
            length: 10,
            topic: '"shellies/shellyswitch-9F5FBB/relay/1/command"',
            payload: 'on' // Can also be a Buffer
        };
        //mqtt2.writeToStream(stream,object);
        //adapter.log.info(mqtt2.generate(object));

    }


    const NO_PREFIX = '';

    let server = new net.Server();

    server.on('connection', (stream) => {

        let client = mqtt(stream);

        // client connected
        client.on('connect', (packet) => {
            // acknowledge the connect packet
            adapter.log.info("User: " + packet.username + ", Password: " + packet.password);
            adapter.log.info("Will: " + packet.will);
            client.connack({ returnCode: 0 });
        })

        // client published
        client.on('publish', (packet) => {
            // send a puback with messageId (for QoS > 0)
            // adapter.log.info("publish: " + JSON.stringify(packet));
            if (packet.payload) {
                adapter.log.info(packet.messageId + " // " + packet.topic + " = " + packet.payload);
            }
            //adapter.log.info("Will: " + packet.will);

            sendState2Client(client,
                "shellies/shellyswitch-9F5FBB/relay/0/command",
                'on',
                0,
                false);


            client.puback({ messageId: packet.messageId })
        })

        // client pinged
        client.on('pingreq', () => {
            // send a pingresp
            client.pingresp()
        });

        client.on('unsubscribe', (packet) => {
            client.unsuback({ messageId: packet.messageId });
        });

        // client subscribed
        client.on('subscribe', (packet) => {
            // send a suback with messageId and granted QoS le^el
            adapter.log.info("subscribe: " + JSON.stringify(packet));
            // adapter.log.info("Will: " + packet.will);
            client.suback({ granted: [packet.qos], messageId: packet.messageId })
        })

        // timeout idle streams after 5 minutes
        stream.setTimeout(1000 * 60 * 5)

        // connection error handling
        client.on('close', () => { client.destroy() })
        client.on('error', () => { client.destroy() })
        client.on('disconnect', () => { client.destroy() })

        // stream timeout
        stream.on('timeout', () => { client.destroy(); })
    })

    // listen on port 1883
    server.listen(1882, "0.0.0.0", () => {
    });

    return this;
}

module.exports = MQTTServer;