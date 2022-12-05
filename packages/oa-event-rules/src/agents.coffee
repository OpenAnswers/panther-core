# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Agents

# (c) OpenAnswers Ltd 2015 matt@openanswers.co.uk

# Agents house rules specific to a particular agent.
# For example the syslog agent maps syslog levels 7-0 to event pririties 0-5


# Logging
{logger, debug} = require('oa-logging')('oa:event:rules:agents')

# OA Agent Modules
{ _ } = require 'oa-helpers'
{Agent}         = require './agent'
{AgentGraylog}  = require './agent_graylog'
{AgentSyslogd}  = require './agent_syslogd'
{AgentGeneric}  = require './agent_generic'
{AgentHttp}     = require './agent_http'
# {AgentServer}   = require './agent_server'


# ### Class

class Agents

  # Lookup table for all the agent types
  @types:
#    server: AgentServer
    graylog: AgentGraylog
    syslogd: AgentSyslogd
    syslog: AgentSyslogd
    generic: AgentGeneric
    http: AgentHttp

  # Agent Type factory
  # Looks up the name from `type` field in yaml, and
  # creates the approriate class

  @generate: ( yaml_def )->

    unless yaml_def
      throw new Error "No agent definition has been passed in"

    unless yaml_def.type
      logger.warn 'No `type` in Agent definition, using generic'
      type = 'generic'
    else
      type = yaml_def.type

    debug 'type', type
    debug 'types', _.keys(@types)

    unless @types[type]
      throw new Error "No agent type [#{type}] to load"

    @types[type].generate yaml_def

  @type: ( type )->
    @types[type]

  @types_array: ()->
    _.keys @types
    


module.exports =
  Agents: Agents
