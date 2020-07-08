# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # AgentHttp

# (c) OpenAnswers Ltd 2015
# matt@openanswers.co.uk

# logging
{logger, debug} = require('oa-logging')('oa:event:rules:agent:http')

# oa modules
Errors          = require 'oa-errors'
{ Agent }       = require './agent'
{ AgentGeneric }       = require './agent_generic'


# ## class AgentHttp

# The AgentHttp class represents the httpd processing compenent of the rules.
# It houses all the logic to turn a http message into a event console event
# AgentHttp can contain a RuleSet for http specific processing.


class AgentHttp extends AgentGeneric

  # The default identifier for the http agent
  @identifier: '{node}:{severity}:{summary}'

  @generate: ( yaml_def, agent ) ->
    agent = new AgentHttp
    super yaml_def, agent
    throw new Errors.ValidationError 'No definition' unless yaml_def?

    debug 'generating http from', yaml_def

    agent

  constructor: ( options = {} )->
    @_type = 'http'
    @_name = 'HTTP'
    super options


module.exports =
  AgentHttp: AgentHttp
