// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # AgentSyslog

// (c) OpenAnswers Ltd 2015
// support@openanswers.co.uk

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:agent:syslog');

// oa modules
const Errors = require('oa-errors');

// ## class AgentSyslog

// The Syslog class represents the syslog processing compenent of the rules.
// It houses all the logic to turn a syslog message into a event console event
// Syslog can contain a RuleSet for syslog specific processing.
// Like TAG/Darmon/PID processing

class AgentSyslog extends Agent {
  static initClass() {
    // The default identifier for the syslog agent
    this.identifier = '{node}:{severity}:{summary}';
  }

  // Generate a syslog object instance from a yaml definitions
  // Loading fields if they exist

  static generate(yaml_def) {
    const syslog = new Syslog();
    super.generate(yaml_def, syslog);
    if (yaml_def == null) {
      throw new Errors.ValidationError('No definition');
    }

    debug('generating syslog from', yaml_def);

    if (yaml_def.severity_map) {
      syslog.severity_map(yaml_def.severity_map);
    }

    return syslog;
  }

  constructor(options) {
    if (options == null) {
      options = {};
    }
    super(options);
    if (options.path) {
      this.path = options.path;
      this.load();
    }

    this._severity_map = null;
    this._field_map = null;
    this._identifier = this.constructor.identifier;
    this._field_transform = null;

    this._rule_set = new RuleSet();
  }

  // Load the syslog info from a file
  load(path) {
    if (path == null) {
      ({ path } = this);
    }
    debug('Reading syslog yaml file', this.path);
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
  // Run the log event through all the syslog specific mappings
  run(event_obj) {
    // Map syslog severities to event severities
    this.run_severity_map(event_obj);

    // Deal with a RFC5424 structured data message
    this.run_structured_data_flatten(event_obj);

    // Run the rest of the Agent basics
    super.run(event_obj);

    return event_obj;
  }

  // ###### run_severity_map( event_object )
  // Map the syslog severity to an event console severity
  // Modifies event_obj
  run_severity_map(event_obj) {
    const sev = event_obj.get_syslog('severityID');
    const sev_map = this._severity_map[sev];
    debug('mapping sev of', sev, sev_map, this._severity_map);
    if (sev_map) {
      return event_obj.set('severity', sev_map);
    } else {
      return logger.error('No severity mapping for sev [%s]', sev, event_obj, this._severity_map, '');
    }
  }

  // Flatten the syslog structuredData object
  // Take the message ID out of the tree, and into a field
  // Then all structured data is directly accessible
  // This would fail if there were more than one message id's
  // but i don't think that can happen(?)

  //     message: whatever
  //     structuredData:
  //        "a@message#id":
  //          any_field: value
  //          other_fudle: something
  //          message: whatever

  // to

  //     message: whatever
  //     message_id: "a@message#id"
  //     structuredData:
  //       any_field: value
  //       other_fudle: something
  //       message: whatever

  run_structured_data_flatten(event_obj) {
    debug('maybe flattening syslog struc', event_obj.has_structured_data());
    if (!event_obj.has_structured_data()) {
      return;
    }

    debug('flattening syslog struc', event_obj.syslog.structuredData);
    for (var id in event_obj.syslog.structuredData) {
      var data = event_obj.syslog.structuredData[id];
      event_obj.syslog.message_id = id;
      event_obj.syslog.structuredData = data;
    }

    return debug('flattened syslog struc', event_obj.syslog);
  }

  // Convert syslog structure to yaml
  to_yaml_obj() {
    return {
      severity_map: this._severity_map,
      identifier: this._identifier,
      field_map: this._field_map,
      rules: this._rule_set,
    };
  }

  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
}
AgentSyslog.initClass();

module.exports = { AgentSyslog };
