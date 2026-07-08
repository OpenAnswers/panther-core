// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Data Acquisition Class
// ===============================
// This class provides methods to fetch commonly used data from the API,
// the results of which are stored in static attributes of the class.

const Cls = (window.Data = class Data {
  static initClass() {
    this.logger = debug('oa:event:rules:shared-data');
    // Defines used when establishing a data type.
    this.TYPE_NUMBER = 0;
    this.TYPE_STRING = 1;
    this.TYPE_REGEX = 2;
    this.TYPE_UNKNOWN = 3;

    this.pages = ['globals', 'groups', 'http', 'syslog', 'graylog'];

    this.type = null;
    this.sub_type = null;

    // Arrays for the data we will be fetching.
    this.globalRules = [];

    this.groupRules = [];
    this.groups = {};
    this.groupNames = [];
    this.ruleMatches = {};

    this.agentMappings = {};
    this.agentRules = [];

    this.selectorOperators = [];
    this.selectorOperatorNames = [];

    this.actions = [];
    this.actionNames = [];

    this.fields = [];

    this.scheduleNames = [];

    // Some items act more like "options" so aren't
    // renderred in the normal UI
    this.hiddenSelectors = ['all', 'none'];
  }

  // Return the overall type
  static whichRulesPage() {
    if (Data.sub_type === 'groups') {
      return 'groups';
    } else if (Data.sub_type === 'globals') {
      return 'globals';
    } else if (Data.type === 'agent') {
      return 'agents';
    } else {
      console.log('no rules page??', this.type, this.sub_type);
      return false;
    }
  }

  // Fetch the data for a rule type from the server
  static getRules(type, sub_type) {
    type ??= this.type;
    sub_type ??= this.sub_type;
    const promise_fn = Data.getRulesPromise();
    if (!promise_fn) {
      Message.error('No way to get data for', type, sub_type);
    }

    return promise_fn()
      .then(function (response) {
        Data.logger('data done', response);
        return response;
      })
      .catch(function (error) {
        console.error('Data retrieval failed', error);
        return Message.error('Data retrieval failed - ' + error);
      });
  }

  static getRulesPromise(type, sub_type) {
    type ??= this.type;
    sub_type ??= this.sub_type;
    switch (Data.whichRulesPage()) {
      case 'globals':
        return Data.getGlobalRules;
      case 'groups':
        return Data.getGroupRules;
      case 'agents':
        return Data.getAgentRules;
      default:
        Message.error(`No rule type [${Data.whichRulesPage()}] to get from server`);
        return undefined;
    }
  }

  static getServerRules() {
    return new Promise(resolve, reject)(() =>
      socket.emit('event_rules::read', { type: 'server' }, function (error, data) {
        if (error) {
          console.error('socketio error', error.message);
          return reject(error);
        }
        Data.serverRules = data.globals;
        return resolve(data);
      })
    );
  }

  // Get Global Rules
  // ----------------
  // Fetch the current global rules via Socket.IO.
  static getGlobalRules(type) {
    type ??= 'server';
    return new Promise((resolve, reject) =>
      socket.emit('event_rules::read', { type }, function (error, data) {
        if (error) {
          console.error('socketio error', error.message);
          return reject(error);
        }
        Data.globalRules = data.globals.rules;
        Data.groups = data.groups;
        return resolve(data);
      })
    );
  }

  // Get Group Rules
  // ----------------
  // Fetch the current group rules via Socket.IO.
  static getGroupRules(type) {
    type ??= 'server';
    return new Promise((resolve, reject) =>
      socket.emit('event_rules::read', { type }, function (error, data) {
        if (error) {
          return reject(error);
        }
        Data.groupRules = data.groups;
        return resolve(data);
      })
    );
  }

  // Get Group Rules
  // ----------------
  // Fetch the current group rules via Socket.IO.
  static getAgentRules(agent_id) {
    agent_id ??= Data.sub_type;
    return new Promise(function (resolve, reject) {
      if (!agent_id) {
        reject('No agent type was provided');
      }
      const msg = {
        type: 'agent',
        sub_type: agent_id,
      };
      return socket.emit('event_rules::read', msg, function (error, data) {
        if (error) {
          return reject(error);
        }
        const rules = _.get(data, 'agent.rules');
        if (!rules) {
          reject('No agent rules');
        }
        Data.agentRules = data.agent.rules;
        Data.agentMappings = data.agent;
        return resolve(data);
      });
    });
  }

  // Get Group Names
  // ---------------
  // Returns an array of available groups.
  static getGroupNames() {
    return new Promise((resolve, reject) =>
      socket.emit('rules::groups', {}, function (error, data) {
        if (error) {
          return reject(error);
        }
        Data.groupNames = data;
        return resolve(data);
      })
    );
  }

  // Get Event Fields
  // ----------------
  // Fetch the possible event fields from the API.
  static getFields() {
    return Promise.resolve($.get('/api/fields')).then(data => (Data.fields = data.data));
  }

  // Get Selector Operators
  // ----------------------
  // Fetch the current selectors from the API.
  static getSelectorOperators() {
    return Promise.resolve($.get('/api/selects_obj')).then(function (data) {
      // Store the full results in one array, then create
      // an array with just the names for convenience later.
      Data.selectorOperators = data.data;
      return (() => {
        const result = [];
        for (var k in data.data) {
          var v = data.data[k];
          if (!Data.hiddenSelectors.includes(k)) {
            result.push(Data.selectorOperatorNames.push(k));
          }
        }
        return result;
      })();
    });
  }

  // Get Actions
  // -----------
  // Fetch the current actions from the API.
  static getActions() {
    return Promise.resolve($.get('/api/actions_obj')).then(function (data) {
      Data.actions = data.data;
      return (() => {
        const result = [];
        for (var k in data.data) {
          var v = data.data[k];
          if (!Data.hiddenSelectors.includes(k)) {
            result.push(Data.actionNames.push(k));
          }
        }
        return result;
      })();
    });
  }

  // Get Schedule Names
  // ------------------
  // Fetch the current schedule names from the API
  static getScheduleNames() {
    return new Promise((resolve, reject) =>
      socket.emit('schedules::index', {}, function (error, data) {
        if (error) {
          return reject(error);
        }
        Data.scheduleNames = data.data;
        return resolve(data.data);
      })
    );
  }

  // Determine Data Type
  // -------------------
  // Some basic string parsing to establish a data type (for YAML),
  // not a JavaScript data type. Currently unused.
  static getDataType(value) {
    if ($.type(value) === 'number') {
      return Data.TYPE_NUMBER;
    }
    if ($.type(value) === 'string') {
      if (value.charAt(0) === '/' && value.slice(-1) === '/') {
        return Data.TYPE_REGEX;
      } else {
        return Data.TYPE_STRING;
      }
    }
    return Data.TYPE_UNKNOWN;
  }

  static isRuleSetEdited() {
    let { type } = Data;
    if (type === 'agents') {
      type = 'agent';
    }
    const msg = { type, sub_type: Data.sub_type };
    return socket.emit('event_rules::edited', msg, function (error, data) {
      if (data?.edited) {
        return UI.showSaveRulesDialog();
      } else {
        return Data.logger('Weird edited data', data);
      }
    });
  }

  static getRuleMatches() {
    return new Promise((resolve, reject) =>
      socket.emit('event_rules::matches::read', {}, function (error, data) {
        if (error) {
          console.error('socketio error', error.message);
          return reject(error);
        }
        Data.ruleMatches = data;
        return resolve(data);
      })
    );
  }
});
Cls.initClass();
