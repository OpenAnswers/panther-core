//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:rule');

// node modules
const path = require('path');

// npm modules
const moment = require('moment');

// oa modules
const { EventRules, Rule, RuleSet, Select, Action } = require('oa-event-rules');
const { is_numeric, format_string } = require('oa-helpers');

const { SocketIO } = require('../../lib/socketio');
const Errors = require('../../lib/errors');

const config = require('../../lib/config').get_instance();

// ###### rule_set_lookup( group_name )
//
// Return the global ruleset, or a group if specified
//
const rule_set_lookup = function (group_name = null) {
  // Check the server is configure properly
  let group_obj;
  if (!config.rules?.set) {
    throw new Error('No rule set configured on server [config.rules.set]');
  }
  const event_rules = config.rules.set;

  // If there is no group specified, return the "global rules"
  if (!group_name) {
    debug('rules::read sending globals', event_rules.globals.rules.length);
    return event_rules.globals;
  }

  debug('rules::read groups [%s]', group_name, event_rules.groups_array);

  if ((group_obj = event_rules.has_group(group_name))) {
    debug('rules::read sending group [%s]', group_name, group_obj);
    return group_obj;
  } else {
    throw new Errors.ValidationError('No group named [#group_name]');
  }
};

// Using a generic handler would rule out some boilerplate code
// not in use
const handle_rule_request = function (socket, data, cb) {
  try {
    // Get the global or group ruleset
    const rule_set = rule_set_lookup(data.group);

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

// Rules edited
// Check if the rules have been modified "in memory"
// This message will go out to clients whenever
// an in memory rule has been changes
// It will be reset when the changes are "commited" to yaml
SocketIO.route('rules::edited', function (socket, data, socket_cb) {
  debug('got rules::edited', data);

  const event_rules = config.rules.set;
  debug(`Received request for rules::edited, returning ${event_rules.edited}`);
  return socket_cb(null, { edited: event_rules.edited });
});

// Rules save
// Save the in memory values back to file
SocketIO.route_return('rules::save', function (socket, data) {
  if (!data) {
    throw new Errors.ValidationError('No data on save message');
  }
  const type = data.type || 'server';
  if (!config.rules[type]) {
    throw new Errors.ValidationError('No type on save message data');
  }

  // Build a rules path
  const event_rules = config.rules[type];
  const event_rules_path = config.rules_path(type);

  const promised_save = !config.rules.git
    ? event_rules.save_yaml_async(event_rules_path)
    : // FIXME: check socker
      event_rules.save_yaml_git_async(event_rules_path, {
        user_name: socket.user().username,
        user_email: socket.user().email,
        git_push: config.rules.git_push,
      });

  return promised_save.then(res => ({
    saved: true,
    type,
  }));
});

// Read all
SocketIO.route('rules::read', function (socket, data, socket_cb) {
  debug('got rules::read', data);

  try {
    // Get the global or group ruleset
    const rule_set = rule_set_lookup(data.group);
    return socket_cb(null, rule_set);
  } catch (error) {
    socket_cb(`${error}`);
    if (error.name === 'ValidationError') {
      return logger.error(error, error.stack);
    } else {
      throw error;
    }
  }
});

// Get list of available groups
SocketIO.route('rules::groups', function (socket, data, socket_cb) {
  debug('got rules::groups', data);
  try {
    const groupNames = Object.keys(config.rules.set.groups.store);
    debug(`Returning group names: ${groupNames}`);
    return socket_cb(null, groupNames);
  } catch (error) {
    return socket_cb(`${error}`);
  }
});

// Read all groups
SocketIO.route('rules::get_all_group_rules', function (socket, data, socket_cb) {
  debug('got rules::get_all_group_rules', data);

  try {
    return socket_cb(null, config.rules.set.groups);
  } catch (error) {
    socket_cb(`${error}`);
    if (error.name === 'ValidationError') {
      return logger.error(error, error.stack);
    } else {
      throw error;
    }
  }
});

// Update
SocketIO.route('rule::update', function (socket, data, socket_cb) {
  try {
    // Create the rule internally
    // this needs to catch errors and return to the socket
    const rule = Rule.generate(data.rule);
    console.log(`Looking for rule set that owns ${data.group}!`);
    const rule_set = rule_set_lookup(data.group);
    console.log('Found: ');
    if (typeof rule_set.update === 'undefined') {
      rule_set.rules.update(data.index, rule);
    } else {
      rule_set.update(data.index, rule);
    }

    // Insert the rule into the in-memory model
    const event_rules = config.rules.set;
    event_rules.set_edited_flag();

    //socket.ev.info "Rule updated. group [#{data.group}] index [#{data.index}] rule [#{data.rule}]"

    // Inform the client of great success
    SocketIO.io.emit('rules::edited');
    if (socket_cb) {
      return socket_cb(null, 'yay');
    }
  } catch (error) {
    socket_cb(`${error}`);
    if (error.name === 'ValidationError' || error.name === 'ReferenceError') {
      return logger.error(error, error.stack);
    } else {
      throw error;
    }
  }
});

// Create
SocketIO.route('rule::create', function (socket, data, socket_cb) {
  debug('rule::create', data.group, data.rule);

  try {
    // Generate an internal rule
    const rule = Rule.generate(data.rule);

    // RuleSet is either group or global
    const rule_set = rule_set_lookup(data.group);
    const event_rules = config.rules.set;
    event_rules.set_edited_flag();

    // Add the rule in memory, at the end
    rule_set.add(rule);

    //socket.ev.info "Rule created. group [#{data.group}] rule [#{data.rule}]"

    SocketIO.io.emit('rules::edited');

    // Tell the client
    return socket_cb(null, {
      status: 'success',
      message: 'Rule created',
    });
  } catch (error) {
    socket_cb(`${error}`);
    if (error.name === 'ValidationError') {
      return logger.error(error, error.stack);
    } else {
      throw error;
    }
  }
});

// Read a single rule
SocketIO.route('rule::read', function (socket, data, socket_cb) {
  try {
    // RuleSet is either group or global
    const rule_set = rule_set_lookup(data.group);

    if (data.index == null) {
      Errors.throw_a(Errors.ValidationError, 'An index is needed to delete');
    }

    if (!is_numeric(data.index)) {
      Errors.throw_a(Errors.ValidationError, 'Index must be a number', data.index);
    }

    // Move the rule in the ruleset
    if (data.index > rule_set.length() - 1) {
      Errors.throw_a(Errors.ValidationError(`No rule at index [${data.index}]`));
    }

    return socket_cb(null, {
      status: 'success',
      data: rule_set[data.index],
    });
  } catch (error) {
    socket_cb(`${error}`);
    if (error.name === 'ValidationError') {
      return logger.error(error, error.stack);
    } else {
      throw error;
    }
  }
});

// Delete
SocketIO.route('rule::delete', function (socket, data, socket_cb) {
  try {
    const rule_set = rule_set_lookup(data.group);

    if (data.index == null) {
      Errors.throw_a(Errors.ValidationError, 'An index is needed to delete');
    }

    if (!is_numeric(data.index)) {
      Errors.throw_a(Errors.ValidationError, 'Index must be a number', data.index);
    }

    // Move the rule in the ruleset
    if (data.index > rule_set.length() - 1) {
      Errors.throw_a(Errors.ValidationError, 'No rule at index', data.index);
    }

    const event_rules = config.rules.set;
    event_rules.set_edited_flag();

    rule_set.delete_index(data.index);

    //socket.ev.info "Deleted rule group [#{data.group}] index [#{data.index}]"

    SocketIO.io.emit('rules::edited');

    return socket_cb(null, {
      status: 'success',
      data: rule_set,
    });
  } catch (error) {
    socket_cb(`${error}`);
    if (error.name === 'ValidationError') {
      return logger.error(error, error.stack);
    } else {
      throw error;
    }
  }
});
