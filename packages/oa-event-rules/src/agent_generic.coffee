# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # AgentGeneric

# (c) OpenAnswers Ltd 2015
# matt@openanswers.co.uk

# logging
{logger, debug} = require('oa-logging')('oa:event:rules:agent:generic')

# oa modules
Errors          = require 'oa-errors'
{ Agent }       = require './agent'


# ## class AgentGeneric

# The Generic class represents the generic processing compenent of the rules.
# It houses all the logic to turn a generic message into a event console event
# Generic can contain a RuleSet for generic specific processing.
# Like TAG/Darmon/PID processing


class AgentGeneric extends Agent

  # The default identifier for the generic agent
  @identifier: '{node}:{severity}:{summary}'

  # Generate a generic object instance from a yaml definitions
  # Loading fields if they exist

  @generate: ( yaml_def, agent ) ->
    agent = new AgentGeneric unless agent
    super yaml_def, agent
    throw new Errors.ValidationError 'No definition' unless yaml_def?

    debug 'generating generic from', yaml_def

    # if yaml_def.severity_map
    #   generic.severity_map yaml_def.severity_map

    agent


  constructor: ( options = {} )->
    @_type ?= 'generic'
    super options
    


  # Load the generic info from a file
  load: ( path = @path )->
    debug 'Reading generic yaml file', @path
    super path

  # ### Instance properties

  # ###### run( event_object )
  # Run the log event through all the generic specific mappings
  run: ( event_obj )->
    # Run the rest of the Agent basics
    # Map generic event straight through
    @run_generic_map( event_obj )

    # After mapping to fields run all the
    # standard Agent event methods
    super event_obj

    event_obj

  run_generic_map: ( event_obj )->
    debug 'simple copy of properties'
    event_obj.input_to_copy()


module.exports = 
  AgentGeneric: AgentGeneric
