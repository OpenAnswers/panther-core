//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:rule:syslog');

// npm modules
const moment = require('moment');

// oa modules
const { EventRules, Syslog, Agents } = require('oa-event-rules');

const { SocketIO } = require('../../lib/socketio');
const Errors = require('../../lib/errors');

const config = require('../../lib/config').get_instance();

// ###### rule_set_lookup( group_name )
//
// Return the global ruleset, or a group if specified
//
const rule_set_lookup = function (type) {
  // Check the server is configure properly
  if (!config.rules?.[type]) {
    throw new Error(`No rule set configured on server [${type}]`);
  }
  const event_rules = config.rules[type];

  // If there is no group specified, return the "global rules"
  return event_rules.rules;
};

// Using a generic handler would rule out some boilerplate code
// not in use
const handle_rule_request = function (socket, data, cb) {
  try {
    // Get the global or group ruleset
    const rule_set = rule_set_lookup(data.type);

    return cb(rule_set);
  } catch (error) {
    if (error.name === 'ValidationError') {
      socket.ev.error(error);
      cb(error);
      return logger.error(error, error.stack);
    } else {
      socket.ev.error(error);
      cb(error);
      throw error;
    }
  }
};

// Read all Syslog info
SocketIO.route('rules::type::read', function (socket, data, socket_cb) {
  debug('got rules::type::read', data);

  try {
    let event_rules;
    if (!data) {
      throw new Errors.ValidationError('No data');
    }
    if (!data.type) {
      throw new Errors.ValidationError('No type in data');
    }
    if (!config.rules[data.type]) {
      throw new Errors.ValidationError('No type [#type]');
    }

    debug('agent read', config.rules[data.type].agent, '');
    // Dump the yaml obj straight out to the client
    const agent_rules = (event_rules = config.rules[data.type].agent);
    return socket_cb(null, agent_rules);
  } catch (error) {
    socket_cb(`${error}`);
    if (error.name === 'ValidationError') {
      return logger.error(error, error.stack);
    } else {
      throw error;
    }
  }
});

// Rules save
// Save the in memory values back to file
SocketIO.route('rules::type::save', function (socket, data, socket_cb) {
  debug('got rules::type::save', data);

  const event_rules = config.rules[data.type];
  event_rules.save_yaml_async(config.rules[`${data.type}_path`]);

  socket.ev.info('The changes made to the agent have been deployed.');

  return socket_cb(null, { saved: true });
});

// Read all Syslog info
SocketIO.route('rules::type::update', function (socket, data, socket_cb) {
  debug('got rules::type::update', data);
  try {
    if (!data) {
      throw new Errors.ValidationError('No data');
    }
    if (!data.type) {
      throw new Errors.ValidationError('No type in data');
    }
    if (!data.agent) {
      throw new Errors.ValidationError('No agent in data');
    }

    const agent_settings = Agents.types[data.type].generate(data.agent);
    return (config.rules[data.type].agent = agent_settings);
  } catch (error) {
    socket_cb(`${error}`);
    if (error.name === 'ValidationError') {
      return logger.error(error, error.stack);
    } else {
      throw error;
    }
  }
});
