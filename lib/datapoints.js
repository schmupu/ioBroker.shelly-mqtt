/* jshint -W097 */
/* jshint -W030 */
/* jshint strict:true */
/* jslint node: true */
/* jslint esversion: 6 */
'use strict';

let states = {};

let devices = {
  shellyswitch: {
    'Relay0.Switch': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/shellyswitch-<deviceid>/relay/0',
        cmd: 'shellies/shellyswitch-<deviceid>/relay/0/command',
        funct_out: (value) => { return value === true ? 'on' : 'off'; },
        funct_in: (value) => { return value === 'on'; }
      },
      common: {
        'name': 'Switch',
        'type': 'boolean',
        'role': 'switch',
        'read': true,
        'write': true,
        'def': false
      }
    },
    'Relay1.Switch': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/shellyswitch-<deviceid>/relay/1',
        cmd: 'shellies/shellyswitch-<deviceid>/relay/1/command',
        funct_out: (value) => { return value === true ? 'on' : 'off'; },
        funct_in: (value) => { return value === 'on'; }
      },
      common: {
        'name': 'Switch',
        'type': 'boolean',
        'role': 'switch',
        'read': true,
        'write': true,
        'def': false
      }
    },
    'Shutter.state': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/shellyswitch-<deviceid>/roller/0',
        cmd: 'shellies/shellyswitch-<deviceid>/roller/0/command'
      },
      common: {
        'name': 'Roller state',
        'type': 'string',
        'role': 'state',
        'read': true,
        'write': true,
        'states': 'close:close;open:open;stop:stop'

      }
    },
    'Shutter.Position': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/shellyswitch-<deviceid>/roller/0/pos',
        cmd: 'shellies/shellyswitch-<deviceid>/roller/0/command/pos',
        funct_out: (value) => { return value.toString(); },
        funct_in: (value) => { return value == -1 ? 101 : value; }
      },
      common: {
        'name': 'Position',
        'type': 'number',
        'role': 'level.blind',
        'read': true,
        'write': true,
        'unit': '%',
        'min': 0,
        'max': 100
      }
    },
    'Power': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/shellyswitch-<deviceid>/relay/power',
        funct_in: (value) => { return (Math.round(value * 2) / 2); }
      },
      common: {
        'name': 'Power',
        'type': 'number',
        'role': 'value.power',
        'read': true,
        'write': false,
        'def': 0,
        'unit': 'W'
      }
    },
    'Energy': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/shellyswitch-<deviceid>/relay/energy',
        funct_in: (value) => { return Math.round((value / 60) * 2) / 2; }
      },
      common: {
        'name': 'Energy',
        'type': 'number',
        'role': 'value.power',
        'read': true,
        'write': false,
        'def': 0,
        'unit': 'Wh'
      }
    },
    'online': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/shellyswitch-<deviceid>/online'
      },
      common: {
        'name': 'Online',
        'type': 'boolean',
        'role': 'indicator.reachable',
        'read': true,
        'write': false
      }
    },
    'firmware': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/announce',
        funct_in: (value) => { return value ? JSON.parse(value).new_fw : false; }
      },
      common: {
        'name': 'New firmware available',
        'type': 'boolean',
        'role': 'state',
        'read': true,
        'write': false
      }
    },
    'hostname': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
      },
      mqtt: {
        publish: 'shellies/announce',
        funct_in: (value) => { return value ? JSON.parse(value).ip : false; }
      },
      common: {
        'name': 'Device Hostname',
        'type': 'string',
        'role': 'info.ip',
        'read': true,
        'write': false
      }
    },
    'rssi': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
        publish: '/status',
        funct_in: (value) => { return value && JSON.parse(value) && JSON.parse(value).wifi_sta ? JSON.parse(value).wifi_sta.rssi : 0; }
      },
      mqtt: {
      },
      common: {
        'name': 'Device RSSI status',
        'type': 'number',
        'role': 'value',
        'read': true,
        'write': false
      }
    },
    'mode': {
      devicename: 'SHSW-21#<deviceid>#1',
      coap: {
      },
      http: {
        publish: '/settings',
        cmd: '/settings',
        funct_in: (value) => { return value && JSON.parse(value) ? JSON.parse(value).mode : undefined; },
        funct_out: (value) => { return { mode: value }; }
      },
      mqtt: {
      },
      common: {
        'name': 'Roller/Relay mode',
        'type': 'string',
        'role': 'state',
        'read': true,
        'write': true,
        'states': 'roller:roller;relay:relay'
      }
    }
  }
};

function getAll() {
  return devices;
}

// getObjectByName('shelly21')
function getObjectByName(name) {
  let all = getAll();
  return all[name] || null;
}

// getObjectByName('shelly21', 'subscribe') 
function getObjectById(name, id) {
  let obj = getObjectByName(name);
  if (obj) {
    return obj[id] || null;
  }
  return null;
}


function setStates(id, state) {
  if (state.mqtt && state.mqtt.publish) {
    let topic = state.mqtt.publish.replace('<deviceid>', id);
    if (topic) {
      state.mqtt.publish = topic;
      states[topic] = state;
    }
  }
  if (state.mqtt && state.mqtt.cmd) {
    let topic = state.mqtt.cmd.replace('<deviceid>', id);
    if (topic) {
      state.mqtt.cmd = topic;
      states[topic] = state;
    }
  }
  if (state.coap && state.coap.name) {
    let topic = state.coap.name.replace('<deviceid>', id);
    if (topic) {
      state.coap.name = topic;
      states[topic + '.' + state.state] = state;
    }
  }
  return state;
}

function getStateByTopic(id, topic) {
  if (states[topic]) return states[topic];
  for (let i in devices) {
    let types = devices[i];
    for (let j in types) {
      let state = types[j];
      if (state.mqtt && state.mqtt.publish) {
        let publish = state.mqtt.publish.replace('<deviceid>', id);
        if (topic === publish) {
          state.state = j;
          return setStates(id, state);
          // return state;
        }
      }
      if (state.mqtt && state.mqtt.subscribe) {
        let subscribe = state.mqtt.subscribe.replace('<deviceid>', id);
        if (topic === subscribe) {
          state.state = j;
          return setStates(id, state);
          // return state;
        }
      }
      if (state.coap && state.coap.name) {
        let name = state.coap.name.replace('<deviceid>', id);
        if (topic === name) {
          state.state = j;
          return setStates(id, state);
          // return state;
        }
      }
    }
  }
}

module.exports = {
  getAll: getAll,
  getObjectByName: getObjectByName,
  getObjectById: getObjectById,
  getStateByTopic: getStateByTopic
};
