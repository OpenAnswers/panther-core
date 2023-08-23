# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Event Rules SocketIO messages

# ## Messages for managing the different types of event rules

# There are two main classes of event_rules, server and agent.
# Server has a global rule set and multiple group rule sets
# Agent has a single rule set but any number of other attributes
# All data type logic should be in EventRules or the AgentX classes
# from oa-event-rules

# Modules
{logger, debug}   = require('oa-logging')('oa:event:socketio:event_rules')

moment            = require 'moment'
Promise           = require 'bluebird'
{ Mongoose }      = require '../../lib/mongoose'
_                 = require 'lodash'

# OA modules
Errors            = require 'oa-errors'
{ EventRules
  Agents
  Group
  Rule
  RuleSet }       = require 'oa-event-rules'
{ Activities }    = require '../../lib/activities'
{ SocketIO }      = require '../../lib/socketio'

config            = require('../../lib/config').get_instance()


# ###### rule_set_lookup( type, group_name )
#
# Return a rule set for a type and optionally group in the `server` type case
#
rule_set_lookup = ( request )->
  # Check the server has configured rules for this type properly
  { type, sub_type, group } = request
  rule_set = null

  switch type
    # Server
    when 'server'
    
      switch sub_type
        when 'globals'
          if group
            throw new Errors.SocketMsgError "Can't group in globals"
          rule_set = config.rules[type].globals
      
        when 'groups'
          unless group
            throw new Errors.SocketMsgError "No group was passed to the server"
          group_obj = config.rules[type].has_group(group)
          unless group_obj
            throw new Errors.SocketMsgError "No group [#{group}] configured on the server"
          rule_set = group_obj.rules
      
        else
          throw new Errors.SocketMsgError "No rule set configured on [server] for type [#{sub_type}]"

    # Otherwise agents
    when 'agent'
      unless config.rules[sub_type]?.agent
        throw new Errors.SocketMsgError "No agent rule set configured on server for [#{sub_type}]"
      rule_set = config.rules[sub_type].agent.rule_set()

    else
      throw new Errors.SocketMsgError "No rules type configured on server [#{type}]"
  
  unless rule_set instanceof RuleSet
    logger.error "#{type} #{sub_type} [#{typeof rule_set}]", rule_set, ''
    throw new Errors.SocketMsgError  "We couldn't find a valid rule set for #{type} #{sub_type} [#{typeof rule_set}]"
  # Now we must have the right rule set...
  rule_set


group_lookup = ( request )->
  { type, sub_type, group } = request
  unless type is 'server'
    throw new Errors.SocketMsgError "Group messages should be in server [#{type}]"
  unless sub_type is 'groups'
    throw new Errors.SocketMsgError "Group messages should be in groups [#{sub_type}]"
  unless group = config.rules.server.groups.get(group)
    throw new Errors.SocketMsgError "No group rules on the server [#{group}]"
  group


# Using a generic handler would rule out some boilerplate code
validate_ruletype_request = ( socket, request )->
  throw new Errors.ValidationError 'No request on server message' unless request
  throw new Errors.ValidationError 'No rule type in server request' unless request.type
  if request.type is 'server'
    unless config.rules[request.type]
      return throw new Errors.ValidationError "No rules named [#{request.type}] on server"
    config.rules[request.type]
  else if request.type is 'agent'
    unless request.sub_type
      return throw new Errors.ValidationError 'No agent name in request'
    unless config.rules[request.sub_type]
      return throw new Errors.ValidationError "No agent rules for [#{request.sub_type}] on server"
    config.rules[request.sub_type]
  else
    return throw new Errors.ValidationError "No rules named [#{request.type}] on server"

    

# ### SocketIO route `event_rules::rule::create`

# Create a new rule on a rule set in memory

SocketIO.route_return 'event_rules::rule::create', ( socket, request, socket_cb ) ->

  # FIXME more validations of request required
  event_rules = validate_ruletype_request socket, request
  unless request.data
    return throw new Errors.ValidationError "No data attached to server request"
  rule_set = rule_set_lookup request

  # Generate a single rule and add in memory
  rule = Rule.generate request.data.rule
  rule_set.add rule
  event_rules.set_edited_flag()
  event_rules.append_edited_msg "Created Rule: [#{request.type}]/[#{request.sub_type}]-> [#{rule.name}]"

  msg =
    status: 'success'
    message: 'Rules was created'
    type: request.type
    sub_type: request.sub_type
    group: request.group
    data: rule.yaml

  SocketIO.io.emit 'event_rules::edited', msg

  metadata =
    type: request.sub_type
    name: rule.name
    rule: rule.to_yaml_obj()
  Activities.store 'rules', 'create', socket.ev.user(), metadata

  return msg


# ### SocketIO route `event_rules::read`

# Dump all the event rules yaml object data straight to the client

SocketIO.route_return 'event_rules::read', ( socket, data, socket_cb ) ->
  event_rules = validate_ruletype_request socket, data
  logger.info "User [%s] exported server rules.yml", socket.ev.user()
  return event_rules.to_yaml_obj( hash: true )

SocketIO.route_return 'event_rules::read::raw', (socket, data, socket_cb)->
  event_rules = validate_ruletype_request socket, data
  logger.info "User [%s] exported raw server rules.yml", socket.ev.user()
  return event_rules.to_yaml( hash: true )



# ### SocketIO route `event_rules::rule::update`

# Update a rule in memory, ready to be saved.

#    io.emit 'event_rules::update', {
#        type: syslogd, index: 5, hash: XXX, rule: yaml_obj
#    }, function(err,data){}

SocketIO.route_return 'event_rules::rule::update', ( socket, request, socket_cb ) ->
  event_rules = validate_ruletype_request socket, request
  debug 'event_rules::rule::update', socket.id, request
  unless request.data
    throw new Errors.ValidationError "No data attached to socket request",
      field: 'data'

  unless request.data.rule
    throw new Errors.ValidationError 'No rule information in request',
      field: 'data.rule'

  unless _.isObject(request.data.rule)
    throw new Errors.ValidationError 'Rule must be an object',
      field: 'data.rule'
      type: typeof request.data.rule

  unless _.isNumber(request.data.index)
    throw new Errors.ValidationError 'An index is needed to update',
      field: 'data.index'
      value: request.data.index

  unless parseInt(request.data.index) is request.data.index
    throw new Errors.ValidationError 'An integer index is needed to update',
      field: 'data.index'
      value: request.data.index
    #throw new Errors.ValidationError 'Must have a check hash' unless _.isNumber(request.hash)

  if request.type is 'server' and request.sub_type is 'group' and not request.group
    throw new Errors.ValidationError 'A group id is needed when updating a group',
      field: 'group'

  debug 'got rule', request.data.rule

  rule_set = rule_set_lookup request
  rule = Rule.generate request.data.rule
  
  rule_set.update request.data.index, rule
  event_rules.set_edited_flag()
  edit_msg = "Updated rule: [#{request.type}]/[#{request.sub_type}]-> " + _.get(request.data.rule, "name")
  event_rules.append_edited_msg edit_msg


  # Inform all clients of great success, the promise takes care of error
  # handling and callback response.
  msg =
    status: 'success'
    message: 'Rules was update'
    type: request.type
    sub_type: request.sub_type
    group: request.group
    data: rule.yaml

  metadata =
    rule: rule.yaml
    type: request.sub_type
    name: rule.name
  Activities.store 'rules', 'update', socket.ev.user(), metadata

  SocketIO.io.emit 'event_rules::edited', msg
  return msg


# ### Socket route `event_rules::rule::delete`

# Delete a rule in memory, ready to be saved.

#    io.emit(
#      'event_rules::delete',
#      {type: "agent", sub_type: "http", index: 5},
#      function(err,data){}
#    )

#{ type: Data.rules_type, sub_type: Data.rules_id, index: ruleId }

SocketIO.route_return 'event_rules::rule::delete', ( socket, request, socket_cb )->
  event_rules = validate_ruletype_request socket, request
  rule_set = rule_set_lookup request

  unless request.data
    throw new Errors.ValidationError "The `data` field is needed on the request",
      field: 'data'
      type: 'exists'

  unless _.isNumber(request.data.index)
    throw new Errors.ValidationError("An index is needed to delete")
  
  reason = request.data.reason

  unless _.isString(reason)
    msg = "The delete reason must be a string [#{typeof reason}]"
    err = new Errors.ValidationError msg,
      field: 'reason'
      value: reason
      format: 'string'
    debug 'validation error is', err
    throw err

  #unless _.isNumber(request.hash)
    #throw new Errors.ValidationError("A hash is needed to delete")

  if request.data.index < 0 or request.data.index > rule_set.length()-1
    throw new Errors.ValidationError("No rule at index [#{request.data.index}]")

  rule = rule_set.get request.data.index
  rule_set.delete_index request.data.index
  event_rules.set_edited_flag()

  edit_msg = "Deleted rule: [#{request.type}]/[#{request.sub_type}]-> [#{rule.name}] [#{request.data.index}] - reason: [#{reason}]"
  event_rules.append_edited_msg edit_msg

  #socket.ev.info "Deleted rule group [#{request.data.group}] index [#{request.data.index}]"

  msg =
    status: 'success'
    message: "Deleted rule from [#{request.data.index}] from [#{request.data.type}]"
    type: request.type
    sub_type: request.sub_type
    index: request.data.index
    group: request.data.group
    data: rule_set

  metadata =
    rule: rule.to_yaml_obj(hash:true)
    #event_rules: rule.event_rules.hash()
    type: request.sub_type
    name: rule.name

  Activities.store 'rules', 'delete', socket.ev.user(), metadata
  .then ( res )->
    SocketIO.io.emit 'event_rules::edited', msg

  return msg


# ### Socket route `event_rules::agent::update`

# Update a data item for an agent
SocketIO.route_return 'event_rules::agent::update', ( socket, request, socket_cb ) ->
  event_rules = validate_ruletype_request socket, request

  updated = false
  fields = []

  # The request data should start at the `agent:` level.
  # We can have different types of updates.

  if request.data.identifier
    event_rules.agent.identifier( request.data.identifier )
    fields.push 'identifier'
    updated = true

  if request.data.field_map
    event_rules.agent.field_map( request.data.field_map )
    fields.push 'field_map'
    updated = true

  if request.data.field_transform
    event_rules.agent.field_transform( request.data.field_transform )
    fields.push 'transform'
    updated = true

  if request.data.severity_map
    event_rules.agent.severity_map( request.data.severity_map )
    fields.push 'severity_map'
    updated = true


  msg = ''
  if updated
    event_rules.set_edited_flag()
    SocketIO.io.emit 'event_rules::edited', msg
    msg =
      status: 'success'
      message: 'Rules were updated'
      type: request.type
      sub_type: request.sub_type
      group: request.group
      data:
        event_rules.agent.to_yaml_obj()
  else
    msg =
      status: 'failed'
      message: 'No fields to update'
      type: request.type
      sub_type: request.sub_type
      group: request.group

  metadata =
    type: request.sub_type
    name: fields
    #data: request.data
  Activities.store 'rules', 'agent_update', socket.ev.user(), metadata

  debug "Received request for event_rules::agent::update, "+
        "returning #{event_rules.edited}"
  return msg



# ### Socket route `event_rules::group::name`

# Update a name for a group
SocketIO.route_return 'event_rules::group::update_name', ( socket, request, socket_cb ) ->
  event_rules = validate_ruletype_request socket, request
  groups = event_rules.groups
  throw new Error "No groups" unless groups

  unless _.isObject(request.data)
    throw new Errors.ValidationError("Request `data` is needed to update")

  new_name = request.data.new_name
  previous_name = request.data.previous_name

  unless _.isString(previous_name)
    msg = "The groups previous name must be a string [#{typeof previous_name}]"
    err = new Errors.ValidationError msg,
      field: 'previous_name'
      value: previous_name
      format: 'string'
    debug 'validation error is', err
    throw err

  unless _.isString(new_name)
    msg = "The groups new name must be a string [#{typeof new_name}]"
    throw new Errors.ValidationError msg,
      field: 'previous_name'
      value: previous_name
      format: 'string'
    debug 'validation error is', err

  unless new_name.match(/^\w/)
    throw new Errors.ValidationError("The group name must start with an alpha numeric character [#{new_name}]")

  unless new_name.match(/^[\w ]+$/)
    throw new Errors.ValidationError("The groups name must only have alphanumeric characters and spaces [#{new_name}]")

  if new_name.match( / +$/ )
    throw new Errors.ValidationError("The group name can't end with whitespace [#{new_name}] - it will be stripped out")

  groups.update_group_name previous_name, new_name
  event_rules.set_edited_flag()
  event_rules.append_edited_msg "Updated name: [#{request.type}]/[#{request.sub_type}] [#{previous_name}]->[#{new_name}]"
  yaml = groups.to_yaml_obj()
  msg =
    status: 'success'
    message: 'Group name was updated'
    type: request.type
    sub_type: request.sub_type
    group: new_name
    data:
      yaml

  SocketIO.io.emit 'event_rules::edited', msg

  metadata =
    type: request.sub_type
    name: new_name
    previous_name: previous_name
    #data: request.data
  Activities.store 'rules', 'group_update', socket.ev.user(), metadata

  return msg


# ### Socket route `event_rules::group::create_name`

SocketIO.route_return 'event_rules::group::create_name', ( socket, request, socket_cb ) ->
  event_rules = validate_ruletype_request socket, request
  groups = event_rules.groups
  throw new Error "No groups" unless groups

  unless _.isObject(request.data)
    throw new Errors.ValidationError("Request `data` is needed to update")

  new_name = request.data.new_name

  unless _.isString(new_name)
    msg = "The groups new name must be a string [#{typeof new_name}]"
    throw new Errors.ValidationError msg,
      field: 'previous_name'
      value: previous_name
      format: 'string'
    debug 'validation error is', err

  unless new_name.match(/^\w/)
    msg = "The group name must start with an alpha numeric character [#{new_name}]"
    throw new Errors.ValidationError msg

  unless new_name.match(/^[\w ]+$/)
    msg = "The groups name must only have alphanumeric characters and spaces [#{new_name}]"
    throw new Errors.ValidationError msg

  if new_name.match( / +$/ )
    throw new Errors.ValidationError("The group name can't end a space [#{new_name}]")

  groups.add Group.generate new_name,
    select: none: true
    rules: []
  event_rules.set_edited_flag()
  event_rules.append_edited_msg "Created group: [#{request.type}]/[#{request.sub_type}]-> [#{new_name}]"

  yaml = groups.to_yaml_obj()
  msg =
    status: 'success'
    message: 'Group name was updated'
    type: request.type
    sub_type: request.sub_type
    group: new_name
    data:
      yaml

  SocketIO.io.emit 'event_rules::edited', msg

  metadata =
    type: request.sub_type
    name: new_name
    #data: request.data
  Activities.store 'rules', 'group_create', socket.ev.user(), metadata

  return msg


# ### Socket route `event_rules::group::update_select`

# Update a select for a group
SocketIO.route_return 'event_rules::group::update_select', ( socket, request, socket_cb ) ->
  event_rules = validate_ruletype_request socket, request
  group = group_lookup request
  debug 'update_select group', group
  throw new Error "No group" unless group

  unless _.isObject(request.data)
    throw new Errors.ValidationError("Request `data` is needed to update")

  rule = request.data.rule
  index = request.data.index

  unless _.isObject(rule)
    msg = "The rule must be an object [#{typeof rule}]"
    err = new Errors.ValidationError msg,
      field: 'rule'
      value: rule
      format: 'object'
    debug 'validation error is', err
    throw err

  unless _.isNumber(index) and parseInt(index) is index
    msg = "The index must be an integer [#{integer}]"
    throw new Errors.ValidationError msg,
      field: 'index'
      value: index
      format: 'integer'
  try
    group.update_select rule, index
  catch err
    debug "err", err
    if err instanceof Errors.ValidationError
      throw err
    msg =
      status: 'failed'
      message: 'parse error'
      type: request.type
      group: group.name
    return msg
    
  event_rules.set_edited_flag()
  event_rules.append_edited_msg "Updated select: [#{request.type}]/[#{request.sub_type}]-> [#{request.group}]"
  yaml = group.to_yaml_obj hash:true
  msg =
    status: 'success'
    message: 'Group select was updated'
    type: request.type
    sub_type: request.sub_type
    group: group.name
    data:
      yaml

  SocketIO.io.emit 'event_rules::edited', msg

  metadata =
    type: request.sub_type
    name: group.name
    select: yaml
  Activities.store 'rules', 'group_select', socket.ev.user(), metadata

  return msg


# ### Socket route `event_rules::group::delete`

# Delete a group
SocketIO.route_return 'event_rules::group::delete', ( socket, request, socket_cb ) ->
  event_rules = validate_ruletype_request socket, request
  group = group_lookup request
  debug 'update_select group', group
  throw new Error "No group" unless group

  console.log request

  unless _.isObject(request.data)
    throw new Errors.ValidationError("Request `data` is needed to update")

  name = request.data.name
  reason = request.data.reason

  unless _.isString(name)
    msg = "The group name to delete must be a string [#{typeof name}]"
    err = new Errors.ValidationError msg,
      field: 'name'
      value: name
      format: 'string'
    debug 'validation error is', err
    throw err
  
  unless _.isString(reason)
    msg = "The delete reason must be a string [#{typeof reason}]"
    err = new Errors.ValidationError msg,
      field: 'reason'
      value: reason
      format: 'string'
    debug 'validation error is', err
    throw err

  old_group = event_rules.groups.del name

  event_rules.set_edited_flag()
  event_rules.append_edited_msg "Deleted group: [#{request.type}]/[#{request.sub_type}]-> [#{name}] - reason: [#{reason}]"
  yaml = event_rules.groups.to_yaml_obj hash:true
  msg =
    status: 'success'
    message: 'Group was deleted'
    type: request.type
    sub_type: request.sub_type
    group: group.name
    data:
      yaml

  SocketIO.io.emit 'event_rules::edited', msg

  metadata =
    type: request.sub_type
    name: group.name
    group: old_group
  Activities.store 'rules', 'group_delete', socket.ev.user(), metadata

  return msg

# ### Socket route `event_rules::edited`

# Check if the rules have been modified "in memory"

# `event_rules::edited` will also be emitted to the clients whenever
# an in memory rule has had changes

# The flag will be reset when the changes are commited/deployed/saved to yaml

#    io.emit(
#      'event_rules::edited',
#      { type: syslogd },
#      function(err,data){}
#    )

#    socket.on 'event_rules::edited', function(data){
#       console.log(data.type)
#    }

SocketIO.route_return 'event_rules::edited', ( socket, data, socket_cb ) ->
  event_rules = validate_ruletype_request socket, data
  debug "Received request for event_rules::edited, returning #{event_rules.edited}"
  return edited: event_rules.edited


# ### Socket route `event_rules::save`

# Save the in memory values back to the event_rules file

#    io.emit(
#      'event_rules::save',
#      { type: 'agent', sub_type: 'syslogd' },
#      function(err,data){
#        console.log(data.saved, data.type)
#      }
#    )

SocketIO.route_return 'event_rules::save', ( socket, request, socket_cb )->
  event_rules = validate_ruletype_request socket, request
  
  metadata =
    type: request.sub_type
  Activities.store 'rules', 'deploy', socket.ev.user(), metadata

  rules_save = if config.rules.git then event_rules.save_yaml_git_async else event_rules.save_yaml_async
  logger.info 'Rules save. Using git[%s] push[%s]', config.rules.git, config.rules.push

  git_opts =
    git_push: config.rules.push
    user_name: socket.ev.user()
    user_email: socket.ev.email()

  rules_save.apply event_rules, [event_rules.path, git_opts]
  .then ( res )->
    socket.ev.info "Your rule changes have been pushed to the server."
    return {
      saved: true
      type: request.type
      sub_type: request.sub_type
    }
# TODO verify the following works
#  .error ( e )->
#    logger.error 'Failed to save rules', e
#    return {
#      saved: false
#    }
#  .catch ( e )->
#    debug "caught error saving", e
#    throw new Errors.ValidationError "saving clash"
#    #return {
#    #  saved: false
#    #}



# ### Socket route `event_rules::discard_changes`

# Save the in memory values back to the event_rules file

#    io.emit(
#      'event_rules::discard_changes',
#      { type: 'server', sub_type: 'groups' },
#      function(err,data){
#        console.log('discarded', data.message)
#      }
#    )

SocketIO.route_return 'event_rules::discard_changes', ( socket, request, socket_cb )->
  event_rules = validate_ruletype_request socket, request
  
  event_rules.reload()
  
  msg =
    status: 'success'
    message: 'Change were discarded and rules reloaded from file'
    type: request.type
    sub_type: request.sub_type

  metadata =
    type: request.sub_type
  Activities.store 'rules', 'discard', socket.ev.user(), metadata

  return msg

# ### Socket route `event_rules::group::move`

# Move a group to a different position in the Groups

#
SocketIO.route_return 'event_rules::group::move', ( socket, request, socket_cb ) ->
#  event_rules = validate_ruletype_request socket, request
#  rule_set = rule_set_lookup request

  unless request.data
    throw new Errors.ValidationError 'No data in rule move request'
  data = request.data

  unless data.old_position?
    throw new Errors.ValidationError 'No old_position in move request data'
  unless data.old_position is parseInt(data.old_position)
    throw new Errors.ValidationError 'No old_position in move request data'

  unless data.new_position?
    throw new Errors.ValidationError 'Rule move new_position should be an integer'
  unless data.new_position is parseInt(data.new_position)
    throw new Errors.ValidationError 'Rule move new_position should be an integer'

  log_msg = "Moving rule #{data.old_position} to #{data.new_position}"
  logger.info log_msg

  server_rules = config.rules['server']
  server_rules.groups.move data.old_position, data.new_position

  # Move it
#  rule_set.move data.old_position, data.new_position
  event_rules = config.rules.set
  event_rules.set_edited_flag()

  #socket.ev.info "Rule moved group [#{data.group}] oldi [#{data.oldPos}] newi [#{data.newPos}] edited flag [#{event_rules.edited}]"

  msg =
    status: 'success'
    message: 'Group move'
    data:
      old_position: data.old_position
      new_position: data.new_position

  SocketIO.io.emit 'event_rules::edited', msg
  msg



# ### Socket route `event_rules::rule::move`

# Move a rule to a different position in a RuleSet

#    io.emit(
#      'event_rules::rule::move',
#      { type: 'server', sub_type: 'groups' },
#      function(err,data){
#        console.log('discarded', data.message)
#      }
#    )

#
SocketIO.route_return 'event_rules::rule::move', ( socket, request, socket_cb ) ->
  event_rules = validate_ruletype_request socket, request
  rule_set = rule_set_lookup request

  unless request.data
    throw new Errors.ValidationError 'No data in rule move request'
  data = request.data

  unless data.old_position?
    throw new Errors.ValidationError 'No old_position in move request data'
  unless data.old_position is parseInt(data.old_position)
    throw new Errors.ValidationError 'No old_position in move request data'

  unless data.new_position?
    throw new Errors.ValidationError 'Rule move new_position should be an integer'
  unless data.new_position is parseInt(data.new_position)
    throw new Errors.ValidationError 'Rule move new_position should be an integer'

  log_msg = "Moving rule #{data.old_position} to #{data.new_position}"
  if data.group?
    log_msg += " in group #{data.group}"
  logger.info log_msg

  # Move it
  rule_set.move data.old_position, data.new_position
  event_rules = config.rules.set
  event_rules.set_edited_flag()

  #socket.ev.info "Rule moved group [#{data.group}] oldi [#{data.oldPos}] newi [#{data.newPos}] edited flag [#{event_rules.edited}]"

  msg =
    status: 'success'
    message: 'Rule move'
    data:
      old_position: data.old_position
      new_position: data.new_position

  SocketIO.io.emit 'event_rules::edited', msg
  msg

# given an event_id (msg.id), run it through rules and find the components 
# that match it
SocketIO.route_return 'event_rules::query::id', ( socket, msg, socket_cb )->
  unless msg
    throw new Errors.SocketMsgError "No message in socket payload"

  unless msg.id
    throw new Errors.ValidationError "No ids in message payload"

  unless id = Mongoose.recid_to_objectid_false msg.id
    throw new Errors.ValidationError "Invalid event id", msg.id

  # enable tracking other rule matches when querying by an event id
  options =
    tracking_matches: true

  # find the event
  Mongoose.alerts.findOne _id: id 
  .then ( doc )->
    unless doc
      throw new Errors.QueryError "Requested id [#{id}] wasn't there"
    debug 'event_rules::query retrieved id [%s]', id, doc
    # process the event through rules
    processed_event = config.rules.server.run( doc, options )
    debug 'event_rules::query processed event: ', processed_event
    # return the matches
    payload = processed_event.matches
    payload

SocketIO.route_return 'event_rules::matches::read', (socket, data, socket_cb)->

  Mongoose.rulematches.find {}, {_id: 0}
  .toArray()
  .then (doc)->
    unless doc
      throw new Errors.SocketMsgError "no message payload"

    # reduce array of match objects to a single object
    reducedmatches = _.reduce doc, (obj,param)->
      obj[param.rule_uuid] = param.tally
      obj
    , {}

    reducedmatches