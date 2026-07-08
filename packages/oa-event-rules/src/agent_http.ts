// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # AgentHttp

// (c) OpenAnswers Ltd 2015
// support@openanswers.co.uk

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:agent:http');

// oa modules
const Errors = require('oa-errors');
const { Agent } = require('./agent');
const { AgentGeneric } = require('./agent_generic');

// ## class AgentHttp

// The AgentHttp class represents the httpd processing compenent of the rules.
// It houses all the logic to turn a http message into a event console event
// AgentHttp can contain a RuleSet for http specific processing.

class AgentHttp extends AgentGeneric {
  static initClass() {
    // The default identifier for the http agent
    this.identifier = '{node}:{severity}:{summary}';
  }

  static generate(yaml_def, agent) {
    agent = new AgentHttp();
    super.generate(yaml_def, agent);
    if (yaml_def == null) {
      throw new Errors.ValidationError('No definition');
    }

    debug('generating http from', yaml_def);

    return agent;
  }

  constructor(options) {
    if (options == null) {
      options = {};
    }
    super(options);
    this._type = 'http';
    this._name = 'HTTP';
  }
}
AgentHttp.initClass();

module.exports = { AgentHttp };
