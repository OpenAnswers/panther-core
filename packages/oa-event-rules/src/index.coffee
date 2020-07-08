# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:action')

# npm modules
yaml  = require 'js-yaml'

# oa modules
{ throw_error, _ } = require 'oa-helpers'


# This is the entry point for all the rules classes so
# everything is imported here for users to pick and choose
# what they want

# #### Coffescript
#
#   { Action } = require 'oa-event-rules'

# #### Javascript
#
#   Action = require('oa-event-rules').Action

"use strict"

{Action}      = require './action'
{Select}      = require './select'
{Option}      = require './option'

levels      = require './levels'
dedupe      = require './dedupe'
discard     = require './discard'

event       = require './event'
rule        = require './rule'
rule_set    = require './rule_set'
group       = require './group'
groups      = require './groups'
event_rules = require './event_rules'
{Agents}        = require './agents'
{Agent}         = require './agent'
{AgentGeneric}  = require './agent_generic'
{AgentSyslogd}   = require './agent_syslogd'
{AgentGraylog}  = require './agent_graylog'
{AgentHttp}    = require './agent_http'

{ Schedule} = require './schedule'
{ Schedules} = require './schedules'


module.exports =
  Action:     Action
  Select:     Select
  Option:     Option

  Event:      event.Event
  Rule:       rule.Rule
  RuleSet:    rule_set.RuleSet
  Group:      group.Group
  Groups:     groups.Groups

  Agents:     Agents
  Agent:         Agent
  AgentGeneric:  AgentGeneric
  AgentSyslogd:  AgentSyslogd
  AgentGraylog:  AgentGraylog
  AgentHttp:     AgentHttp
  Schedule:       Schedule
  Schedules:       Schedules

  EventRules: event_rules.EventRules
