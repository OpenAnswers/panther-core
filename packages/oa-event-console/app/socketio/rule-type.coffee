# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:rule:syslog')

# npm modules
moment            = require 'moment'

# oa modules
{ EventRules
  Syslog }        = require 'oa-event-rules'

{ SocketIO }      = require '../../lib/socketio'
{ Errors }        = require '../../lib/errors'

config            = require('../../lib/config').get_instance()


# ###### rule_set_lookup( group_name )
#
# Return the global ruleset, or a group if specified
#
rule_set_lookup = ( type )->
  
  # Check the server is configure properly
  unless config.rules?[type]
    throw new Error "No rule set configured on server [#{type}]"
  event_rules = config.rules[type]

  # If there is no group specified, return the "global rules"
  return event_rules.rules


# Using a generic handler would rule out some boilerplate code
# not in use
handle_rule_request = ( socket, data, cb )->
  try
    # Get the global or group ruleset
    rule_set = rule_set_lookup data.type

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
    



# Read all Syslog info
SocketIO.route 'rules::type::read', ( socket, data, socket_cb ) ->
  debug 'got rules::type::read', data

  try
    throw new Errors.ValidationError 'No data' unless data
    throw new Errors.ValidationError 'No type in data' unless data.type
    throw new Errors.ValidationError "No type [#type]" unless config.rules[data.type]

    debug 'agent read', config.rules[data.type].agent, ''
    # Dump the yaml obj straight out to the client
    agent_rules = event_rules = config.rules[data.type].agent
    socket_cb null, agent_rules

  catch error
    socket_cb "#{error}"
    if error.name is 'ValidationError'
      logger.error error, error.stack
    else
      throw error


# Rules save
# Save the in memory values back to file
SocketIO.route 'rules::type::save', ( socket, data, socket_cb ) ->
  debug 'got rules::type::save', data
   
  event_rules = config.rules[type]
  event_rules.save_yaml_async(config.rules["#{type}_path"])

  socket.ev.info "The changes made to the agent have been deployed."

  socket_cb null,
    saved: true


# Read all Syslog info
SocketIO.route 'rules::type::update', ( socket, data, socket_cb ) ->
  debug 'got rules::type::update', data
  try
    throw new Errors.ValidationError 'No data' unless data
    throw new Errors.ValidationError 'No type in data' unless data.type
    throw new Errors.ValidationError 'No agent in data' unless data.agent

    agent_settings = Agents.types[data.type].generate data.agent
    config.rules[data.type].agent = syslog_settings

  catch error
    socket_cb "#{error}"
    if error.name is 'ValidationError'
      logger.error error, error.stack
    else
      throw error
