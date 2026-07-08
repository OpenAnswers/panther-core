// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:action');

// npm modules
const yaml = require('js-yaml');

// oa modules
const { throw_error, _ } = require('oa-helpers');

// This is the entry point for all the rules classes so
// everything is imported here for users to pick and choose
// what they want

// #### Coffescript
//
//   { Action } = require 'oa-event-rules'

// #### Javascript
//
//   Action = require('oa-event-rules').Action

('use strict');

const { Action } = require('./action');
const { Select } = require('./select');
const { Option } = require('./option');

const levels = require('./levels');
const dedupe = require('./dedupe');
const discard = require('./discard');

const event = require('./event');
const rule = require('./rule');
const rule_set = require('./rule_set');
const group = require('./group');
const groups = require('./groups');
const event_rules = require('./event_rules');
const { Agents } = require('./agents');
const { Agent } = require('./agent');
const { AgentGeneric } = require('./agent_generic');
const { AgentSyslogd } = require('./agent_syslogd');
const { AgentGraylog } = require('./agent_graylog');
const { AgentHttp } = require('./agent_http');

const { Schedule } = require('./schedule');
const { Schedules } = require('./schedules');

module.exports = {
  Action,
  Select,
  Option,

  Event: event.Event,
  Rule: rule.Rule,
  RuleSet: rule_set.RuleSet,
  Group: group.Group,
  Groups: groups.Groups,

  Agents,
  Agent,
  AgentGeneric,
  AgentSyslogd,
  AgentGraylog,
  AgentHttp,
  Schedule,
  Schedules,

  EventRules: event_rules.EventRules,
};
