# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug} = require('oa-logging')('oa:event:socketio:rule')

# node modules
path = require 'path'

# npm modules
moment = require 'moment'

# oa modules
{ EventRules
  Rule
  RuleSet
  Select
  Action }        = require 'oa-event-rules'
{ is_numeric
  format_string } = require 'oa-helpers'

{ SocketIO }      = require '../../lib/socketio'
Errors            = require '../../lib/errors'

config            = require('../../lib/config').get_instance()


# ###### rule_set_lookup( group_name )
#
# Return the global ruleset, or a group if specified
#
rule_set_lookup = ( group_name = null )->
  
  # Check the server is configure properly
  unless config.rules?.set
    throw new Error "No rule set configured on server [config.rules.set]"
  event_rules = config.rules.set

  # If there is no group specified, return the "global rules"
  unless group_name
    debug 'rules::read sending globals', event_rules.globals.rules.length
    return event_rules.globals

  debug 'rules::read groups [%s]', group_name, event_rules.groups_array

  if group_obj = event_rules.has_group group_name
    debug 'rules::read sending group [%s]', group_name, group_obj
    return group_obj
  else
    throw new Errors.ValidationError "No group named [#group_name]"



# Using a generic handler would rule out some boilerplate code
# not in use
handle_rule_request = ( socket, data, cb )->
  try
    # Get the global or group ruleset
    rule_set = rule_set_lookup data.group

    cb ruleset

  catch error
    if error.name is 'ValidationError'
      socket.ev.error #{error}
      socket_cb error
      logger.error error, error.stack
    else
      socket.ev.error #{error}
      socket_cb error
      throw error
    


# Rules edited
# Check if the rules have been modified "in memory"
# This message will go out to clients whenever
# an in memory rule has been changes
# It will be reset when the changes are "commited" to yaml
SocketIO.route 'rules::edited', ( socket, data, socket_cb ) ->
  debug 'got rules::edited', data
   
  event_rules = config.rules.set
  debug "Received request for rules::edited, returning #{event_rules.edited}"
  socket_cb null,
    edited: event_rules.edited


# Rules save
# Save the in memory values back to file
SocketIO.route_return 'rules::save', ( socket, data ) ->
  unless data
    throw new Errors.ValidationError("No data on save message")
  type = data.type or 'server'
  unless config.rules[type]
    throw new Errors.ValidationError("No type on save message data")
  
  # Build a rules path
  event_rules = config.rules[type]
  event_rules_path = config.rules_path type
  
  promised_save = unless config.rules.git
    event_rules.save_yaml_async(event_rules_path)
  else
    # FIXME: check socker 
    event_rules.save_yaml_git_async event_rules_path,
        user_name: socker.user().username
        user_email: socker.user().email
        git_push: config.rules.git_push

  promised_save.then ( res )->
    {saved: true, type: type}



# Read all
SocketIO.route 'rules::read', ( socket, data, socket_cb ) ->
  debug 'got rules::read', data

  try
    # Get the global or group ruleset
    rule_set = rule_set_lookup data.group
    socket_cb null, rule_set

  catch error
    socket_cb "#{error}"
    if error.name is 'ValidationError'
      logger.error error, error.stack
    else
      throw error


# Get list of available groups
SocketIO.route 'rules::groups', (socket, data, socket_cb) ->
  debug 'got rules::groups', data
  try
    groupNames = Object.keys(config.rules.set.groups.store)
    debug "Returning group names: #{groupNames}"
    socket_cb null, groupNames
  catch error
    socket_cb "#{error}"


# Read all groups
SocketIO.route 'rules::get_all_group_rules', (socket, data, socket_cb) ->
  debug 'got rules::get_all_group_rules', data
 
  try
    socket_cb null, config.rules.set.groups
  
  catch error
    socket_cb "#{error}"
    if error.name is 'ValidationError'
      logger.error error, error.stack
    else
      throw error


# Update
SocketIO.route 'rule::update', ( socket, data, socket_cb ) ->
  try
    # Create the rule internally
    # this needs to catch errors and return to the socket
    rule = Rule.generate data.rule
    console.log "Looking for rule set that owns #{data.group}!"
    rule_set = rule_set_lookup data.group
    console.log "Found: "
    if typeof rule_set.update == 'undefined'
      rule_set.rules.update data.index, rule
    else
      rule_set.update data.index, rule

    # Insert the rule into the in-memory model
    event_rules = config.rules.set
    event_rules.set_edited_flag()

    #socket.ev.info "Rule updated. group [#{data.group}] index [#{data.index}] rule [#{data.rule}]"

    # Inform the client of great success
    SocketIO.io.emit 'rules::edited'
    socket_cb null, "yay" if socket_cb

  catch error
    socket_cb "#{error}"
    if error.name is 'ValidationError' or error.name is 'ReferenceError'
      logger.error error, error.stack
    else
      throw error



# Create
SocketIO.route 'rule::create', ( socket, data, socket_cb ) ->
  debug 'rule::create', data.group, data.rule

  try
    # Generate an internal rule
    rule = Rule.generate data.rule

    # RuleSet is either group or global
    rule_set = rule_set_lookup data.group
    event_rules = config.rules.set
    event_rules.set_edited_flag()


    # Add the rule in memory, at the end
    rule_set.add rule

    #socket.ev.info "Rule created. group [#{data.group}] rule [#{data.rule}]"

    SocketIO.io.emit 'rules::edited'
    
    # Tell the client
    socket_cb null,
      status: 'success'
      message: 'Rule created'

  catch error
    socket_cb "#{error}"
    if error.name is 'ValidationError'
      logger.error error, error.stack
    else
      throw error







# Read a single rule
SocketIO.route 'rule::read', ( socket, data, socket_cb )->
  try
    # RuleSet is either group or global
    rule_set = rule_set_lookup data.group

    unless data.index?
      Errors.throw_a Errors.ValidationError, "An index is needed to delete"

    unless is_numeric( data.index )
      Errors.throw_a Errors.ValidationError, "Index must be a number", data.index

    # Move the rule in the ruleset
    if data.index > rule_set.length()-1
      Errors.throw_a Errors.ValidationError "No rule at index [#{data.index}]"
  
    socket_cb null,
      status: 'success'
      data: rule_set[data.index]

  catch error
    socket_cb "#{error}"
    if error.name is 'ValidationError'
      logger.error error, error.stack
    else
      throw error


 
# Delete
SocketIO.route 'rule::delete', ( socket, data, socket_cb )->

  try

    rule_set = rule_set_lookup data.group

    unless data.index?
      Errors.throw_a Errors.ValidationError, "An index is needed to delete"

    unless is_numeric( data.index )
      Errors.throw_a Errors.ValidationError, "Index must be a number", data.index

    # Move the rule in the ruleset
    if data.index > rule_set.length()-1
      Errors.throw_a Errors.ValidationError, "No rule at index", data.index

    event_rules = config.rules.set
    event_rules.set_edited_flag()

    rule_set.delete_index data.index

    #socket.ev.info "Deleted rule group [#{data.group}] index [#{data.index}]"

    SocketIO.io.emit 'rules::edited'

    socket_cb null,
      status: 'success'
      data: rule_set

  catch error
    socket_cb "#{error}"
    if error.name is 'ValidationError'
      logger.error error, error.stack
    else
      throw error

