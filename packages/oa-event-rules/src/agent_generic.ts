// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # AgentGeneric

// (c) OpenAnswers Ltd 2015
// support@openanswers.co.uk

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:agent:generic');

// oa modules
const Errors = require('oa-errors');
const { Agent } = require('./agent');

// ## class AgentGeneric

// The Generic class represents the generic processing compenent of the rules.
// It houses all the logic to turn a generic message into a event console event
// Generic can contain a RuleSet for generic specific processing.
// Like TAG/Darmon/PID processing

class AgentGeneric extends Agent {
  static initClass() {
    // The default identifier for the generic agent
    this.identifier = '{node}:{severity}:{summary}';
  }

  // Generate a generic object instance from a yaml definitions
  // Loading fields if they exist

  static generate(yaml_def, agent) {
    if (!agent) {
      agent = new AgentGeneric();
    }
    super.generate(yaml_def, agent);
    if (yaml_def == null) {
      throw new Errors.ValidationError('No definition');
    }

    debug('generating generic from', yaml_def);

    // if yaml_def.severity_map
    //   generic.severity_map yaml_def.severity_map

    return agent;
  }

  constructor(options) {
    if (options == null) {
      options = {};
    }
    super(options);
    if (this._type == null) {
      this._type = 'generic';
    }
  }

  // Load the generic info from a file
  load(path) {
    if (path == null) {
      ({ path } = this);
    }
    debug('Reading generic yaml file', this.path);
    return super.load(path);
  }

  // ### Instance properties

  // ###### run( event_object )
  // Run the log event through all the generic specific mappings
  run(event_obj) {
    // Run the rest of the Agent basics
    // Map generic event straight through
    this.run_generic_map(event_obj);

    // After mapping to fields run all the
    // standard Agent event methods
    super.run(event_obj);

    return event_obj;
  }

  run_generic_map(event_obj) {
    debug('simple copy of properties');
    return event_obj.input_to_copy();
  }
}
AgentGeneric.initClass();

module.exports = { AgentGeneric };
