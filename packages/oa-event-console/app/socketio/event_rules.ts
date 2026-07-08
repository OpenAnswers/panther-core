//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Event Rules SocketIO messages

// ## Messages for managing the different types of event rules

// There are two main classes of event_rules, server and agent.
// Server has a global rule set and multiple group rule sets
// Agent has a single rule set but any number of other attributes
// All data type logic should be in EventRules or the AgentX classes
// from oa-event-rules

// Modules
const { logger, debug } = require('oa-logging')('oa:event:socketio:event_rules');

const moment = require('moment');
const Promise = require('bluebird');
const { Mongoose } = require('../../lib/mongoose');
const _ = require('lodash');

// OA modules
const Errors = require('oa-errors');
const { EventRules, Agents, Group, Rule, RuleSet } = require('oa-event-rules');
const { Activities } = require('../../lib/activities');
const { SocketIO } = require('../../lib/socketio');

const config = require('../../lib/config').get_instance();

// ###### rule_set_lookup( type, group_name )
//
// Return a rule set for a type and optionally group in the `server` type case
//
const rule_set_lookup = function (request) {
  // Check the server has configured rules for this type properly
  const { type, sub_type, group } = request;
  let rule_set = null;

  switch (type) {
    // Server
    case 'server':
      switch (sub_type) {
        case 'globals':
          if (group) {
            throw new Errors.SocketMsgError("Can't group in globals");
          }
          rule_set = config.rules[type].globals;
          break;

        case 'groups':
          if (!group) {
            throw new Errors.SocketMsgError('No group was passed to the server');
          }
          var group_obj = config.rules[type].has_group(group);
          if (!group_obj) {
            throw new Errors.SocketMsgError(`No group [${group}] configured on the server`);
          }
          rule_set = group_obj.rules;
          break;

        default:
          throw new Errors.SocketMsgError(`No rule set configured on [server] for type [${sub_type}]`);
      }
      break;

    // Otherwise agents
    case 'agent':
      if (!config.rules[sub_type]?.agent) {
        throw new Errors.SocketMsgError(`No agent rule set configured on server for [${sub_type}]`);
      }
      rule_set = config.rules[sub_type].agent.rule_set();
      break;

    default:
      throw new Errors.SocketMsgError(`No rules type configured on server [${type}]`);
  }

  if (!(rule_set instanceof RuleSet)) {
    logger.error(`${type} ${sub_type} [${typeof rule_set}]`, rule_set, '');
    throw new Errors.SocketMsgError(`We couldn't find a valid rule set for ${type} ${sub_type} [${typeof rule_set}]`);
  }
  // Now we must have the right rule set...
  return rule_set;
};

const group_lookup = function (request) {
  let { type, sub_type, group } = request;
  if (type !== 'server') {
    throw new Errors.SocketMsgError(`Group messages should be in server [${type}]`);
  }
  if (sub_type !== 'groups') {
    throw new Errors.SocketMsgError(`Group messages should be in groups [${sub_type}]`);
  }
  if (!(group = config.rules.server.groups.get(group))) {
    throw new Errors.SocketMsgError(`No group rules on the server [${group}]`);
  }
  return group;
};

// Using a generic handler would rule out some boilerplate code
const validate_ruletype_request = function (socket, request) {
  if (!request) {
    throw new Errors.ValidationError('No request on server message');
  }
  if (!request.type) {
    throw new Errors.ValidationError('No rule type in server request');
  }
  if (request.type === 'server') {
    if (!config.rules[request.type]) {
      return (() => {
        throw new Errors.ValidationError(`No rules named [${request.type}] on server`);
      })();
    }
    return config.rules[request.type];
  } else if (request.type === 'agent') {
    if (!request.sub_type) {
      return (() => {
        throw new Errors.ValidationError('No agent name in request');
      })();
    }
    if (!config.rules[request.sub_type]) {
      return (() => {
        throw new Errors.ValidationError(`No agent rules for [${request.sub_type}] on server`);
      })();
    }
    return config.rules[request.sub_type];
  } else {
    return (() => {
      throw new Errors.ValidationError(`No rules named [${request.type}] on server`);
    })();
  }
};

// ### SocketIO route `event_rules::rule::create`

// Create a new rule on a rule set in memory

SocketIO.route_return('event_rules::rule::create', function (socket, request, socket_cb) {
  // FIXME more validations of request required
  const event_rules = validate_ruletype_request(socket, request);
  if (!request.data) {
    return (() => {
      throw new Errors.ValidationError('No data attached to server request');
    })();
  }
  const rule_set = rule_set_lookup(request);

  // Generate a single rule and add in memory
  const rule = Rule.generate(request.data.rule);
  rule_set.add(rule);
  event_rules.set_edited_flag();
  event_rules.append_edited_msg(`Created Rule: [${request.type}]/[${request.sub_type}]-> [${rule.name}]`);

  const msg = {
    status: 'success',
    message: 'Rules was created',
    type: request.type,
    sub_type: request.sub_type,
    group: request.group,
    data: rule.yaml,
  };

  SocketIO.io.emit('event_rules::edited', msg);

  const metadata = {
    type: request.sub_type,
    name: rule.name,
    rule: rule.to_yaml_obj(),
  };
  Activities.store('rules', 'create', socket.ev.user(), metadata);

  return msg;
});

// ### SocketIO route `event_rules::read`

// Dump all the event rules yaml object data straight to the client

SocketIO.route_return('event_rules::read', function (socket, data, socket_cb) {
  const event_rules = validate_ruletype_request(socket, data);
  logger.info('User [%s] exported server rules.yml', socket.ev.user());
  return event_rules.to_yaml_obj({ hash: true });
});

SocketIO.route_return('event_rules::read::raw', function (socket, data, socket_cb) {
  const event_rules = validate_ruletype_request(socket, data);
  logger.info('User [%s] exported raw server rules.yml', socket.ev.user());
  return event_rules.to_yaml({ hash: true });
});

// ### SocketIO route `event_rules::rule::update`

// Update a rule in memory, ready to be saved.

//    io.emit 'event_rules::update', {
//        type: syslogd, index: 5, hash: XXX, rule: yaml_obj
//    }, function(err,data){}

SocketIO.route_return('event_rules::rule::update', function (socket, request, socket_cb) {
  const event_rules = validate_ruletype_request(socket, request);
  debug('event_rules::rule::update', socket.id, request);
  if (!request.data) {
    throw new Errors.ValidationError('No data attached to socket request', { field: 'data' });
  }

  if (!request.data.rule) {
    throw new Errors.ValidationError('No rule information in request', { field: 'data.rule' });
  }

  if (!_.isObject(request.data.rule)) {
    throw new Errors.ValidationError('Rule must be an object', {
      field: 'data.rule',
      type: typeof request.data.rule,
    });
  }

  if (!_.isNumber(request.data.index)) {
    throw new Errors.ValidationError('An index is needed to update', {
      field: 'data.index',
      value: request.data.index,
    });
  }

  if (parseInt(request.data.index) !== request.data.index) {
    throw new Errors.ValidationError('An integer index is needed to update', {
      field: 'data.index',
      value: request.data.index,
    });
  }
  //throw new Errors.ValidationError 'Must have a check hash' unless _.isNumber(request.hash)

  if (request.type === 'server' && request.sub_type === 'group' && !request.group) {
    throw new Errors.ValidationError('A group id is needed when updating a group', { field: 'group' });
  }

  debug('got rule', request.data.rule);

  const rule_set = rule_set_lookup(request);
  const rule = Rule.generate(request.data.rule);

  rule_set.update(request.data.index, rule);
  event_rules.set_edited_flag();
  const edit_msg = `Updated rule: [${request.type}]/[${request.sub_type}]-> ` + _.get(request.data.rule, 'name');
  event_rules.append_edited_msg(edit_msg);

  // Inform all clients of great success, the promise takes care of error
  // handling and callback response.
  const msg = {
    status: 'success',
    message: 'Rules was update',
    type: request.type,
    sub_type: request.sub_type,
    group: request.group,
    data: rule.yaml,
  };

  const metadata = {
    rule: rule.yaml,
    type: request.sub_type,
    name: rule.name,
  };
  Activities.store('rules', 'update', socket.ev.user(), metadata);

  SocketIO.io.emit('event_rules::edited', msg);
  return msg;
});

// ### Socket route `event_rules::rule::delete`

// Delete a rule in memory, ready to be saved.

//    io.emit(
//      'event_rules::delete',
//      {type: "agent", sub_type: "http", index: 5},
//      function(err,data){}
//    )

//{ type: Data.rules_type, sub_type: Data.rules_id, index: ruleId }

SocketIO.route_return('event_rules::rule::delete', function (socket, request, socket_cb) {
  let msg;
  const event_rules = validate_ruletype_request(socket, request);
  const rule_set = rule_set_lookup(request);

  if (!request.data) {
    throw new Errors.ValidationError('The `data` field is needed on the request', {
      field: 'data',
      type: 'exists',
    });
  }

  if (!_.isNumber(request.data.index)) {
    throw new Errors.ValidationError('An index is needed to delete');
  }

  const { reason } = request.data;

  if (!_.isString(reason)) {
    msg = `The delete reason must be a string [${typeof reason}]`;
    const err = new Errors.ValidationError(msg, {
      field: 'reason',
      value: reason,
      format: 'string',
    });

    throw err;
  }

  //unless _.isNumber(request.hash)
  //throw new Errors.ValidationError("A hash is needed to delete")

  if (request.data.index < 0 || request.data.index > rule_set.length() - 1) {
    throw new Errors.ValidationError(`No rule at index [${request.data.index}]`);
  }

  const rule = rule_set.get(request.data.index);
  rule_set.delete_index(request.data.index);
  event_rules.set_edited_flag();

  const edit_msg = `Deleted rule: [${request.type}]/[${request.sub_type}]-> [${rule.name}] [${request.data.index}] - reason: [${reason}]`;
  event_rules.append_edited_msg(edit_msg);

  //socket.ev.info "Deleted rule group [#{request.data.group}] index [#{request.data.index}]"

  msg = {
    status: 'success',
    message: `Deleted rule from [${request.data.index}] from [${request.data.type}]`,
    type: request.type,
    sub_type: request.sub_type,
    index: request.data.index,
    group: request.data.group,
    data: rule_set,
  };

  const metadata = {
    rule: rule.to_yaml_obj({ hash: true }),
    //event_rules: rule.event_rules.hash()
    type: request.sub_type,
    name: rule.name,
  };

  Activities.store('rules', 'delete', socket.ev.user(), metadata).then(res =>
    SocketIO.io.emit('event_rules::edited', msg)
  );

  return msg;
});

// ### Socket route `event_rules::agent::update`

// Update a data item for an agent
SocketIO.route_return('event_rules::agent::update', function (socket, request, socket_cb) {
  const event_rules = validate_ruletype_request(socket, request);

  let updated = false;
  const fields = [];

  // The request data should start at the `agent:` level.
  // We can have different types of updates.

  if (request.data.identifier) {
    event_rules.agent.identifier(request.data.identifier);
    fields.push('identifier');
    updated = true;
  }

  if (request.data.field_map) {
    event_rules.agent.field_map(request.data.field_map);
    fields.push('field_map');
    updated = true;
  }

  if (request.data.field_transform) {
    event_rules.agent.field_transform(request.data.field_transform);
    fields.push('transform');
    updated = true;
  }

  if (request.data.severity_map) {
    event_rules.agent.severity_map(request.data.severity_map);
    fields.push('severity_map');
    updated = true;
  }

  let msg: any = '';
  if (updated) {
    event_rules.set_edited_flag();
    SocketIO.io.emit('event_rules::edited', msg);
    msg = {
      status: 'success',
      message: 'Rules were updated',
      type: request.type,
      sub_type: request.sub_type,
      group: request.group,
      data: event_rules.agent.to_yaml_obj(),
    };
  } else {
    msg = {
      status: 'failed',
      message: 'No fields to update',
      type: request.type,
      sub_type: request.sub_type,
      group: request.group,
    };
  }

  const metadata = {
    type: request.sub_type,
    name: fields,
  };
  //data: request.data
  Activities.store('rules', 'agent_update', socket.ev.user(), metadata);

  debug('Received request for event_rules::agent::update, ' + `returning ${event_rules.edited}`);
  return msg;
});

// ### Socket route `event_rules::group::name`

// Update a name for a group
SocketIO.route_return('event_rules::group::update_name', function (socket, request, socket_cb) {
  let err, msg;
  const event_rules = validate_ruletype_request(socket, request);
  const { groups } = event_rules;
  if (!groups) {
    throw new Error('No groups');
  }

  if (!_.isObject(request.data)) {
    throw new Errors.ValidationError('Request `data` is needed to update');
  }

  const { new_name } = request.data;
  const { previous_name } = request.data;

  if (!_.isString(previous_name)) {
    msg = `The groups previous name must be a string [${typeof previous_name}]`;
    err = new Errors.ValidationError(msg, {
      field: 'previous_name',
      value: previous_name,
      format: 'string',
    });

    throw err;
  }

  if (!_.isString(new_name)) {
    msg = `The groups new name must be a string [${typeof new_name}]`;
    throw new Errors.ValidationError(msg, {
      field: 'previous_name',
      value: previous_name,
      format: 'string',
    });
  }

  if (!new_name.match(/^\w/)) {
    throw new Errors.ValidationError(`The group name must start with an alpha numeric character [${new_name}]`);
  }

  if (!new_name.match(/^[\w ]+$/)) {
    throw new Errors.ValidationError(`The groups name must only have alphanumeric characters and spaces [${new_name}]`);
  }

  if (new_name.match(/ +$/)) {
    throw new Errors.ValidationError(
      `The group name can't end with whitespace [${new_name}] - it will be stripped out`
    );
  }

  groups.update_group_name(previous_name, new_name);
  event_rules.set_edited_flag();
  event_rules.append_edited_msg(
    `Updated name: [${request.type}]/[${request.sub_type}] [${previous_name}]->[${new_name}]`
  );
  const yaml = groups.to_yaml_obj();
  msg = {
    status: 'success',
    message: 'Group name was updated',
    type: request.type,
    sub_type: request.sub_type,
    group: new_name,
    data: yaml,
  };

  SocketIO.io.emit('event_rules::edited', msg);

  const metadata = {
    type: request.sub_type,
    name: new_name,
    previous_name,
  };
  //data: request.data
  Activities.store('rules', 'group_update', socket.ev.user(), metadata);

  return msg;
});

// ### Socket route `event_rules::group::create_name`

SocketIO.route_return('event_rules::group::create_name', function (socket, request, socket_cb) {
  let msg;
  const event_rules = validate_ruletype_request(socket, request);
  const { groups } = event_rules;
  if (!groups) {
    throw new Error('No groups');
  }

  if (!_.isObject(request.data)) {
    throw new Errors.ValidationError('Request `data` is needed to update');
  }

  const { new_name } = request.data;

  if (!_.isString(new_name)) {
    msg = `The groups new name must be a string [${typeof new_name}]`;
    throw new Errors.ValidationError(msg, {
      field: 'new_name',
      value: new_name,
      format: 'string',
    });
  }

  if (!new_name.match(/^\w/)) {
    msg = `The group name must start with an alpha numeric character [${new_name}]`;
    throw new Errors.ValidationError(msg);
  }

  if (!new_name.match(/^[\w ]+$/)) {
    msg = `The groups name must only have alphanumeric characters and spaces [${new_name}]`;
    throw new Errors.ValidationError(msg);
  }

  if (new_name.match(/ +$/)) {
    throw new Errors.ValidationError(`The group name can't end a space [${new_name}]`);
  }

  groups.add(
    Group.generate(new_name, {
      select: { none: true },
      rules: [],
    })
  );
  event_rules.set_edited_flag();
  event_rules.append_edited_msg(`Created group: [${request.type}]/[${request.sub_type}]-> [${new_name}]`);

  const yaml = groups.to_yaml_obj();
  msg = {
    status: 'success',
    message: 'Group name was updated',
    type: request.type,
    sub_type: request.sub_type,
    group: new_name,
    data: yaml,
  };

  SocketIO.io.emit('event_rules::edited', msg);

  const metadata = {
    type: request.sub_type,
    name: new_name,
  };
  //data: request.data
  Activities.store('rules', 'group_create', socket.ev.user(), metadata);

  return msg;
});

// ### Socket route `event_rules::group::update_select`

// Update a select for a group
SocketIO.route_return('event_rules::group::update_select', function (socket, request, socket_cb) {
  let err, msg;
  const event_rules = validate_ruletype_request(socket, request);
  const group = group_lookup(request);
  debug('update_select group', group);
  if (!group) {
    throw new Error('No group');
  }

  if (!_.isObject(request.data)) {
    throw new Errors.ValidationError('Request `data` is needed to update');
  }

  const { rule } = request.data;
  const { index } = request.data;

  if (!_.isObject(rule)) {
    msg = `The rule must be an object [${typeof rule}]`;
    err = new Errors.ValidationError(msg, {
      field: 'rule',
      value: rule,
      format: 'object',
    });

    throw err;
  }

  if (!_.isNumber(index) || parseInt(index) !== index) {
    msg = `The index must be an integer [${index}]`;
    throw new Errors.ValidationError(msg, {
      field: 'index',
      value: index,
      format: 'integer',
    });
  }
  try {
    group.update_select(rule, index);
  } catch (error) {
    err = error;
    debug('err', err);
    if (err instanceof Errors.ValidationError) {
      throw err;
    }
    msg = {
      status: 'failed',
      message: 'parse error',
      type: request.type,
      group: group.name,
    };
    return msg;
  }

  event_rules.set_edited_flag();
  event_rules.append_edited_msg(`Updated select: [${request.type}]/[${request.sub_type}]-> [${request.group}]`);
  const yaml = group.to_yaml_obj({ hash: true });
  msg = {
    status: 'success',
    message: 'Group select was updated',
    type: request.type,
    sub_type: request.sub_type,
    group: group.name,
    data: yaml,
  };

  SocketIO.io.emit('event_rules::edited', msg);

  const metadata = {
    type: request.sub_type,
    name: group.name,
    select: yaml,
  };
  Activities.store('rules', 'group_select', socket.ev.user(), metadata);

  return msg;
});

// ### Socket route `event_rules::group::delete`

// Delete a group
SocketIO.route_return('event_rules::group::delete', function (socket, request, socket_cb) {
  let err, msg;
  const event_rules = validate_ruletype_request(socket, request);
  const group = group_lookup(request);
  debug('update_select group', group);
  if (!group) {
    throw new Error('No group');
  }

  console.log(request);

  if (!_.isObject(request.data)) {
    throw new Errors.ValidationError('Request `data` is needed to update');
  }

  const { name } = request.data;
  const { reason } = request.data;

  if (!_.isString(name)) {
    msg = `The group name to delete must be a string [${typeof name}]`;
    err = new Errors.ValidationError(msg, {
      field: 'name',
      value: name,
      format: 'string',
    });

    throw err;
  }

  if (!_.isString(reason)) {
    msg = `The delete reason must be a string [${typeof reason}]`;
    err = new Errors.ValidationError(msg, {
      field: 'reason',
      value: reason,
      format: 'string',
    });

    throw err;
  }

  const old_group = event_rules.groups.del(name);

  event_rules.set_edited_flag();
  event_rules.append_edited_msg(
    `Deleted group: [${request.type}]/[${request.sub_type}]-> [${name}] - reason: [${reason}]`
  );
  const yaml = event_rules.groups.to_yaml_obj({ hash: true });
  msg = {
    status: 'success',
    message: 'Group was deleted',
    type: request.type,
    sub_type: request.sub_type,
    group: group.name,
    data: yaml,
  };

  SocketIO.io.emit('event_rules::edited', msg);

  const metadata = {
    type: request.sub_type,
    name: group.name,
    group: old_group,
  };
  Activities.store('rules', 'group_delete', socket.ev.user(), metadata);

  return msg;
});

// ### Socket route `event_rules::edited`

// Check if the rules have been modified "in memory"

// `event_rules::edited` will also be emitted to the clients whenever
// an in memory rule has had changes

// The flag will be reset when the changes are commited/deployed/saved to yaml

//    io.emit(
//      'event_rules::edited',
//      { type: syslogd },
//      function(err,data){}
//    )

//    socket.on 'event_rules::edited', function(data){
//       console.log(data.type)
//    }

SocketIO.route_return('event_rules::edited', function (socket, data, socket_cb) {
  const event_rules = validate_ruletype_request(socket, data);
  debug(`Received request for event_rules::edited, returning ${event_rules.edited}`);
  return { edited: event_rules.edited };
});

// ### Socket route `event_rules::save`

// Save the in memory values back to the event_rules file

//    io.emit(
//      'event_rules::save',
//      { type: 'agent', sub_type: 'syslogd' },
//      function(err,data){
//        console.log(data.saved, data.type)
//      }
//    )

SocketIO.route_return('event_rules::save', function (socket, request, socket_cb) {
  const event_rules = validate_ruletype_request(socket, request);

  const metadata = { type: request.sub_type };
  Activities.store('rules', 'deploy', socket.ev.user(), metadata);

  const rules_save = config.rules.git ? event_rules.save_yaml_git_async : event_rules.save_yaml_async;
  logger.info('Rules save. Using git[%s] push[%s]', config.rules.git, config.rules.push);

  const git_opts = {
    git_push: config.rules.push,
    user_name: socket.ev.user(),
    user_email: socket.ev.email(),
  };

  return rules_save.apply(event_rules, [event_rules.path, git_opts]).then(function (res) {
    socket.ev.info('Your rule changes have been pushed to the server.');
    return {
      saved: true,
      type: request.type,
      sub_type: request.sub_type,
    };
  });
});
// TODO verify the following works
//  .error ( e )->
//    logger.error 'Failed to save rules', e
//    return {
//      saved: false
//    }
//  .catch ( e )->
//    debug "caught error saving", e
//    throw new Errors.ValidationError "saving clash"
//    #return {
//    #  saved: false
//    #}

// ### Socket route `event_rules::discard_changes`

// Save the in memory values back to the event_rules file

//    io.emit(
//      'event_rules::discard_changes',
//      { type: 'server', sub_type: 'groups' },
//      function(err,data){
//        console.log('discarded', data.message)
//      }
//    )

SocketIO.route_return('event_rules::discard_changes', function (socket, request, socket_cb) {
  const event_rules = validate_ruletype_request(socket, request);

  event_rules.reload();

  const msg = {
    status: 'success',
    message: 'Change were discarded and rules reloaded from file',
    type: request.type,
    sub_type: request.sub_type,
  };

  const metadata = { type: request.sub_type };
  Activities.store('rules', 'discard', socket.ev.user(), metadata);

  return msg;
});

// ### Socket route `event_rules::group::move`

// Move a group to a different position in the Groups

//
SocketIO.route_return('event_rules::group::move', function (socket, request, socket_cb) {
  //  event_rules = validate_ruletype_request socket, request
  //  rule_set = rule_set_lookup request

  if (!request.data) {
    throw new Errors.ValidationError('No data in rule move request');
  }
  const { data } = request;

  if (data.old_position == null) {
    throw new Errors.ValidationError('No old_position in move request data');
  }
  if (data.old_position !== parseInt(data.old_position)) {
    throw new Errors.ValidationError('No old_position in move request data');
  }

  if (data.new_position == null) {
    throw new Errors.ValidationError('Rule move new_position should be an integer');
  }
  if (data.new_position !== parseInt(data.new_position)) {
    throw new Errors.ValidationError('Rule move new_position should be an integer');
  }

  const log_msg = `Moving rule ${data.old_position} to ${data.new_position}`;
  logger.info(log_msg);

  const server_rules = config.rules['server'];
  server_rules.groups.move(data.old_position, data.new_position);

  // Move it
  //  rule_set.move data.old_position, data.new_position
  const event_rules = config.rules.set;
  event_rules.set_edited_flag();

  //socket.ev.info "Rule moved group [#{data.group}] oldi [#{data.oldPos}] newi [#{data.newPos}] edited flag [#{event_rules.edited}]"

  const msg = {
    status: 'success',
    message: 'Group move',
    data: {
      old_position: data.old_position,
      new_position: data.new_position,
    },
  };

  SocketIO.io.emit('event_rules::edited', msg);
  return msg;
});

// ### Socket route `event_rules::rule::move`

// Move a rule to a different position in a RuleSet

//    io.emit(
//      'event_rules::rule::move',
//      { type: 'server', sub_type: 'groups' },
//      function(err,data){
//        console.log('discarded', data.message)
//      }
//    )

//
SocketIO.route_return('event_rules::rule::move', function (socket, request, socket_cb) {
  let event_rules = validate_ruletype_request(socket, request);
  const rule_set = rule_set_lookup(request);

  if (!request.data) {
    throw new Errors.ValidationError('No data in rule move request');
  }
  const { data } = request;

  if (data.old_position == null) {
    throw new Errors.ValidationError('No old_position in move request data');
  }
  if (data.old_position !== parseInt(data.old_position)) {
    throw new Errors.ValidationError('No old_position in move request data');
  }

  if (data.new_position == null) {
    throw new Errors.ValidationError('Rule move new_position should be an integer');
  }
  if (data.new_position !== parseInt(data.new_position)) {
    throw new Errors.ValidationError('Rule move new_position should be an integer');
  }

  let log_msg = `Moving rule ${data.old_position} to ${data.new_position}`;
  if (data.group != null) {
    log_msg += ` in group ${data.group}`;
  }
  logger.info(log_msg);

  // Move it
  rule_set.move(data.old_position, data.new_position);
  event_rules = config.rules.set;
  event_rules.set_edited_flag();

  //socket.ev.info "Rule moved group [#{data.group}] oldi [#{data.oldPos}] newi [#{data.newPos}] edited flag [#{event_rules.edited}]"

  const msg = {
    status: 'success',
    message: 'Rule move',
    data: {
      old_position: data.old_position,
      new_position: data.new_position,
    },
  };

  SocketIO.io.emit('event_rules::edited', msg);
  return msg;
});

// given an event_id (msg.id), run it through rules and find the components
// that match it
SocketIO.route_return('event_rules::query::id', function (socket, msg, socket_cb) {
  let id;
  if (!msg) {
    throw new Errors.SocketMsgError('No message in socket payload');
  }

  if (!msg.id) {
    throw new Errors.ValidationError('No ids in message payload');
  }

  if (!(id = Mongoose.recid_to_objectid_false(msg.id))) {
    throw new Errors.ValidationError('Invalid event id', msg.id);
  }

  // enable tracking other rule matches when querying by an event id
  const options = { tracking_matches: true };

  // find the event
  return Mongoose.alerts.findOne({ _id: id }).then(function (doc) {
    if (!doc) {
      throw new Errors.QueryError(`Requested id [${id}] wasn't there`);
    }
    debug('event_rules::query retrieved id [%s]', id, doc);
    // process the event through rules
    const processed_event = config.rules.server.run(doc, options);
    debug('event_rules::query processed event: ', processed_event);
    // return the matches
    const payload = processed_event.matches;
    return payload;
  });
});

SocketIO.route_return('event_rules::matches::read', (socket, data, socket_cb) =>
  Mongoose.rulematches
    .find({}, { _id: 0 })
    .toArray()
    .then(function (doc) {
      if (!doc) {
        throw new Errors.SocketMsgError('no message payload');
      }

      // reduce array of match objects to a single object
      const reducedmatches = _.reduce(
        doc,
        function (obj, param) {
          obj[param.rule_uuid] = param.tally;
          return obj;
        },
        {}
      );

      return reducedmatches;
    })
);
