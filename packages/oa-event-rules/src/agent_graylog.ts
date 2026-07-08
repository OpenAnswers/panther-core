// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # AgentGraylog

// (c) OpenAnswers Ltd 2015
// support@openanswers.co.uk

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:agent:syslog');

// oa modules
const Errors = require('oa-errors');
const { Agent } = require('./agent');

// ## class AgentGraylog

// The Graylog class represents the graylog processing compenent of the rules.
// It houses all the logic to turn a graylog message into a event console event
// Graylog can contain a RuleSet for graylog specific processing.
// Like TAG/Darmon/PID processing

class AgentGraylog extends Agent {
  static initClass() {
    // The default identifier for the graylog agent
    this.identifier = '{node}:{app}:{logger}:{severity}:{short_message_ident}';
  }

  // Generate a graylog object instance from a yaml definitions
  // Loading fields if they exist

  static generate(yaml_def) {
    const graylog = new AgentGraylog();
    super.generate(yaml_def, graylog);
    if (yaml_def == null) {
      throw new Errors.ValidationError('No definition');
    }

    debug('generating graylog from', yaml_def);

    if (yaml_def.severity_map) {
      graylog.severity_map(yaml_def.severity_map);
    }

    return graylog;
  }

  constructor(options) {
    if (options == null) {
      options = {};
    }
    super(options);
    this._type = 'graylog';
    this._name = 'Graylog';
    if (this.constructor.identifier) {
      this._identifier = this.constructor.identifier;
    }
  }

  // Load the graylog info from a file
  load(path) {
    if (path == null) {
      ({ path } = this);
    }
    debug('Reading graylog yaml file', this.path);
    super.load(path);

    if (this.doc.agent != null ? this.doc.agent.severity_map : undefined) {
      return this.severity_map(this.doc.agent.severity_map);
    }
  }

  // ### Instance properties

  // Store the severity mappings
  severity_map(_severity_map) {
    if (_severity_map) {
      this._severity_map = _severity_map;
    }
    return this._severity_map;
  }

  // ###### run( event_object )
  // Run the log event through all the graylog specific mappings
  run(event_obj) {
    // Map graylog severities to event severities
    this.run_severity_map(event_obj);

    // Run the rest of the Agent basics
    super.run(event_obj);

    return event_obj;
  }

  // ###### run_severity_map( event_object )
  // Map the graylog severity to an event console severity
  // Modifies event_obj
  run_severity_map(event_obj) {
    const sev = event_obj.get_input('severityID');
    const sev_map = this._severity_map[sev];
    debug('mapping sev of', sev, sev_map, this._severity_map);
    if (sev_map) {
      return event_obj.set('severity', sev_map);
    } else {
      return logger.error('No severity mapping for sev [%s]', sev, event_obj, this._severity_map, '');
    }
  }

  // Convert graylog structure to yaml
  to_yaml_obj() {
    const obj = super.to_yaml_obj();
    obj.severity_map = this._severity_map;
    return obj;
  }

  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
}
AgentGraylog.initClass();

module.exports = { AgentGraylog };
