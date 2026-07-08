// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Agents

// (c) OpenAnswers Ltd 2015 support@openanswers.co.uk

// Agents house rules specific to a particular agent.
// For example the syslog agent maps syslog levels 7-0 to event pririties 0-5

// Logging
const { logger, debug } = require('oa-logging')('oa:event:rules:agents');

// OA Agent Modules
const { _ } = require('oa-helpers');
const { Agent } = require('./agent');
const { AgentGraylog } = require('./agent_graylog');
const { AgentSyslogd } = require('./agent_syslogd');
const { AgentGeneric } = require('./agent_generic');
const { AgentHttp } = require('./agent_http');
// {AgentServer}   = require './agent_server'

// ### Class

class Agents {
  static initClass() {
    // Lookup table for all the agent types
    this.types = {
      //    server: AgentServer
      graylog: AgentGraylog,
      syslogd: AgentSyslogd,
      syslog: AgentSyslogd,
      generic: AgentGeneric,
      http: AgentHttp,
    };
  }

  // Agent Type factory
  // Looks up the name from `type` field in yaml, and
  // creates the approriate class

  static generate(yaml_def) {
    let type;
    if (!yaml_def) {
      throw new Error('No agent definition has been passed in');
    }

    if (!yaml_def.type) {
      logger.warn('No `type` in Agent definition, using generic');
      type = 'generic';
    } else {
      ({ type } = yaml_def);
    }

    debug('type', type);
    debug('types', _.keys(this.types));

    if (!this.types[type]) {
      throw new Error(`No agent type [${type}] to load`);
    }

    return this.types[type].generate(yaml_def);
  }

  static type(type) {
    return this.types[type];
  }

  static types_array() {
    return _.keys(this.types);
  }
}
Agents.initClass();

module.exports = { Agents };
