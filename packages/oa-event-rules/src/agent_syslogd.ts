// @ts-nocheck
//
// Copyright (C) 2020,2022, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # AgentSyslog

// (c) OpenAnswers Ltd 2015
// support@openanswers.co.uk

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:agent:syslogd');

// oa modules
const Errors = require('oa-errors');
const { Agent } = require('./agent');

// ## class AgentSyslog

// The Syslog class represents the syslog processing compenent of the rules.
// It houses all the logic to turn a syslog message into a event console event
// Syslog can contain a RuleSet for syslog specific processing.
// Like TAG/Darmon/PID processing

class AgentSyslogd extends Agent {
  static initClass() {
    // The default identifier for the syslog agent
    this.identifier = '{node}:{severity}:{tag}:{summary}';
  }

  // Generate a syslog object instance from a yaml definitions
  // Loading fields if they exist

  static generate(yaml_def) {
    const syslogd = new AgentSyslogd();
    super.generate(yaml_def, syslogd);
    if (yaml_def == null) {
      throw new Errors.ValidationError('No definition');
    }

    debug('generating syslog from', yaml_def);

    if (yaml_def.severity_map) {
      syslogd.severity_map(yaml_def.severity_map);
    }

    return syslogd;
  }

  constructor(options) {
    if (options == null) {
      options = {};
    }
    super(options);
    this._severity_map = null;
    this._type = 'syslogd';
    this._name = 'Syslog';
    if (this.constructor.identifier) {
      this._identifier = this.constructor.identifier;
    }
  }

  // Load the syslog info from a file
  load(path) {
    if (path == null) {
      ({ path } = this);
    }
    debug('Reading syslogd yaml file', this.path);
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
    // debug "run_structured_data_flatten()-> [%o]", event_obj

    // Run the rest of the Agent basics
    super.run(event_obj);

    // debug "run()-> [%o]", event_obj
    return event_obj;
  }

  // ###### run_severity_map( event_object )
  // Map the syslog severity to an event console severity
  // Modifies event_obj
  run_severity_map(event_obj) {
    const sev_id = event_obj.get_input('severityID');
    const sev_name = event_obj.get_input('severity');
    const sev_map = this._severity_map[sev_id] || this._severity_map[sev_name];
    debug('mapping sev of [%s/%s]', sev_id, sev_name, sev_map, this._severity_map);
    if (sev_map) {
      return event_obj.set('severity', sev_map);
    } else {
      return logger.error('No severity mapping for sev [%s/%s]', sev_id, sev_name, event_obj, this._severity_map, '');
    }
  }

  // ###### run_field_map( event_object )
  // OVERRIDE from Agent!
  // Map the generic field to a different event console field
  // Modifies event_obj
  run_field_map(event_obj) {
    for (var from_field in this._field_map) {
      var to_field = this._field_map[from_field];
      debug('mapping', from_field, to_field, event_obj.get_input(from_field));
      event_obj.set(to_field, event_obj.get_input(from_field));
    }
    return true; //so the for loop doesn't return an array
  }

  // Flatten the syslog structuredData object
  // Take each message ID out of the tree, and append to an array
  // flatten structeredData param by prepending "{sd-id}-", saving in `flatData`
  // e.g.
  // ##### logger -n localhost -T -P 6514 -p local2.info --rfc5424 --sd-id golfish@123 --sd-param thread=\"hungry\" --sd-param priority=\"high\" --sd-id appName@2 --sd-param bob=\"bob3\" "karwar"
  //

  // Input Data
  //     message: whatever
  //     structuredData:
  //        "a@sd#id":
  //          any_field: value
  //          other_fudle: something
  //          message: whatever

  // to

  //     message: whatever
  //     sd_ids: [ "a@sd#id" ]
  //     flatData:
  //       a@sd#id=any_field: value
  //       a@sd#id=other_fudle: something
  //       a@sd#id=message: whatever

  run_structured_data_flatten(event_obj) {
    if (!event_obj.has_structured_data()) {
      return;
    }

    const structuredData = event_obj.get_input('structuredData');
    debug('flattening syslog struct [%o]', structuredData);
    const flatData = {};
    const sdIds = [];
    for (var sdId in structuredData) {
      var data = structuredData[sdId];
      sdIds.push(sdId);

      for (var paramName in data) {
        var paramValue = data[paramName];
        flatData['' + sdId + '=' + paramName] = paramValue;
      }
    }

    event_obj.set('structuredDataIds', sdIds);

    // replace structuredData with a flattened version

    event_obj.set('structuredData', structuredData);
    return event_obj.set('structuredData1', flatData);
  }

  // Convert syslog structure to yaml
  to_yaml_obj() {
    const obj = super.to_yaml_obj();
    obj.severity_map = this._severity_map;
    return obj;
  }
}
AgentSyslogd.initClass();

module.exports = { AgentSyslogd };
