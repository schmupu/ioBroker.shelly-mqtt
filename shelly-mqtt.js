/* jshint -W097 */
/* jshint -W030 */
/* jshint strict:true */
/* jslint node: true */
/* jslint esversion: 6 */
'use strict';

const utils = require('@iobroker/adapter-core');
const objectHelper = require('@apollon/iobroker-tools').objectHelper; // Get common adapter utils
const mqttServer = require(__dirname + '/lib/mqtt');
const adapterName = require('./package.json').name.split('.').pop();

let adapter;
let server;

function decrypt(key, value) {
  let result = '';
  for (let i = 0; i < value.length; ++i) {
    result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
  }
  return result;
}


function startAdapter(options) {
  options = options || {};
  options.name = adapterName;
  adapter = new utils.Adapter(options);



  adapter.on('unload', (callback) => {
    try {
      adapter.log.info('Closing Adapter');
      callback();
    } catch (e) {
      // adapter.log.error('Error');
      callback();
    }
  });


  adapter.on('message', (msg) => {

    adapter.sendTo(msg.from, msg.command, 'Execute command ' + msg.command, msg.callback);

  });

  adapter.on('stateChange', (id, state) => {
    // Warning, state can be null if it was deleted
    if (state && !state.ack) {
      let stateId = id.replace(adapter.namespace + '.', '');
      adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
      objectHelper.handleStateChange(id, state);
    }
  });

  adapter.on('ready', () => {

    adapter.getForeignObject('system.config', (err, obj) => {
      if (adapter.config.password) {
        if (obj && obj.native && obj.native.secret) {
          //noinspection JSUnresolvedVariable
          adapter.config.password = decrypt(obj.native.secret, adapter.config.password);
        } else {
          //noinspection JSUnresolvedVariable
          adapter.config.password = decrypt('Zgfr56gFe87jJOM', adapter.config.password);
        }
      }
      if (adapter.config.http_password) {
        if (obj && obj.native && obj.native.secret) {
          //noinspection JSUnresolvedVariable
          adapter.config.http_password = decrypt(obj.native.secret, adapter.config.http_password);
        } else {
          //noinspection JSUnresolvedVariable
          adapter.config.http_password = decrypt('Zgfr56gFe87jJOM', adapter.config.http_password);
        }
      }
      main();
    });

  });

  return adapter;
}

// *****************************************************************************************************
// Main
// *****************************************************************************************************
function main() {

  adapter.subscribeStates('*');
  objectHelper.init(adapter);
  server = new mqttServer.MQTTServer(adapter, objectHelper);
  server.listen();

  setInterval(() => {
    // if (server) server.onStateChange('shelly-mqtt.0.shellies.shellyswitch-9F5FBB.relay.0.command', 'on');
  }, 10000);

}

// If started as allInOne mode => return function to create instance
if (typeof module !== 'undefined' && module.parent) {
  module.exports = startAdapter;
} else {
  // or start the instance directly
  startAdapter();
}