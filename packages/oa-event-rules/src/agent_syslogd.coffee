# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # AgentSyslog

# (c) OpenAnswers Ltd 2015
# matt@openanswers.co.uk

# logging
{logger, debug} = require('oa-logging')('oa:event:rules:agent:syslogd')

# oa modules
Errors          = require 'oa-errors'
{ Agent }       = require './agent'


# ## class AgentSyslog

# The Syslog class represents the syslog processing compenent of the rules.
# It houses all the logic to turn a syslog message into a event console event
# Syslog can contain a RuleSet for syslog specific processing.
# Like TAG/Darmon/PID processing


class AgentSyslogd extends Agent

  # The default identifier for the syslog agent
  @identifier: '{node}:{severity}:{tag}:{summary}'

  # Generate a syslog object instance from a yaml definitions
  # Loading fields if they exist

  @generate: ( yaml_def ) ->
    syslogd = new AgentSyslogd
    super yaml_def, syslogd
    throw new Errors.ValidationError 'No definition' unless yaml_def?

    debug 'generating syslog from', yaml_def

    if yaml_def.severity_map
      syslogd.severity_map yaml_def.severity_map

    syslogd


  constructor: ( options = {} )->
    @_severity_map = null
    @_type = 'syslogd'
    @_name = 'Syslog'
    super options
    if @constructor.identifier
      @_identifier = @constructor.identifier
    


  # Load the syslog info from a file
  load: ( path = @path )->
    debug 'Reading syslogd yaml file', @path
    super path

    if @doc.agent?.severity_map
      @severity_map @doc.agent.severity_map


  # ### Instance properties

  # Store the severity mappings
  severity_map: ( _severity_map )->
    if _severity_map then @_severity_map = _severity_map
    @_severity_map


  # ###### run( event_object )
  # Run the log event through all the syslog specific mappings
  run: ( event_obj )->

    # Map syslog severities to event severities
    @run_severity_map( event_obj )

    # Deal with a RFC5424 structured data message
    @run_structured_data_flatten( event_obj )

    # Run the rest of the Agent basics
    super event_obj

    event_obj


  # ###### run_severity_map( event_object )
  # Map the syslog severity to an event console severity
  # Modifies event_obj
  run_severity_map: ( event_obj )->
    sev = event_obj.get_input 'severityID'
    sev_map = @_severity_map[sev]
    debug 'mapping sev of', sev, sev_map, @_severity_map
    if sev_map
      event_obj.set 'severity', sev_map
    else
      logger.error 'No severity mapping for sev [%s]', sev, event_obj, @_severity_map, ''


  # ###### run_field_map( event_object )
  # OVERRIDE from Agent!
  # Map the generic field to a different event console field
  # Modifies event_obj
  run_field_map: ( event_obj )->
    for from_field, to_field of @_field_map
      debug 'mapping', from_field, to_field, event_obj.get_input(from_field)
      event_obj.set to_field, event_obj.get_input(from_field)
    true #so the for loop doesn't return an array

  # Flatten the syslog structuredData object
  # Take the message ID out of the tree, and into a field
  # Then all structured data is directly accessible
  # This would fail if there were more than one message id's
  # but i don't think that can happen(?)

  #     message: whatever
  #     structuredData:
  #        "a@message#id":
  #          any_field: value
  #          other_fudle: something
  #          message: whatever

  # to

  #     message: whatever
  #     message_id: "a@message#id"
  #     structuredData:
  #       any_field: value
  #       other_fudle: something
  #       message: whatever

  run_structured_data_flatten: ( event_obj )->
    debug 'maybe flattening syslog struc', event_obj.has_structured_data()
    return unless event_obj.has_structured_data()

    structuredData = event_obj.get_input('structuredData')
    debug 'flattening syslog struc', structuredData
    for id, data of structuredData
      event_obj.set_input 'message_id', id
      event_obj.set_input 'structuredData', data

    debug 'flattened syslog struc', event_obj.syslog


  # Convert syslog structure to yaml
  to_yaml_obj: ()->
    obj = super
    obj.severity_map = @_severity_map
    obj


module.exports = 
  AgentSyslogd: AgentSyslogd
