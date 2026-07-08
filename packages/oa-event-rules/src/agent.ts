// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// ## Agent

// (c) OpenAnswers Ltd 2015
// support@openanswers.co.uk

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:agent');

// nodejs modules
const fs = require('fs');

// npm modules
//Promise           = require 'bluebird'
const yaml = require('js-yaml');

// oa modules
const Errors = require('oa-errors');
const { RuleSet } = require('./rule_set');
const { _ } = require('oa-helpers');
const { Transforms } = require('./transforms');

// ### class Agent

// Agents can have specific rules, this is the base for
// the Agent Specifics to inherit from

class Agent {
  static initClass() {
    // A default identifier for agents that don't override
    this.identifier = '{node}:{severity}:{summary}';
  }

  // These are the possible transforms to run on fields
  // Should be configured via `field_transform` in yaml

  //    field_transforme:
  //      {{field_name}}: {{transform_name}}

  static generate(yaml_def, agent) {
    if (!agent) {
      agent = new Agent();
    }
    if (yaml_def == null) {
      throw new Errors.ValidationError('No definition');
    }

    if (yaml_def.field_map) {
      agent.field_map(yaml_def.field_map);
    }

    if (yaml_def.identifier) {
      agent.identifier(yaml_def.identifier);
    } else {
      agent.identifier(this.identifier);
    }

    if (yaml_def.field_transform) {
      agent.field_transform(yaml_def.field_transform);
    }

    if (yaml_def.rules) {
      agent.rule_set(RuleSet.generate(yaml_def));
    } else {
      agent.rule_set(new RuleSet());
    }

    return agent;
  }

  constructor(options) {
    if (options == null) {
      options = {};
    }
    this._field_map = null;
    this._identifier = this.constructor.identifier;
    this._field_transform = null;

    this._rule_set = new RuleSet();

    if (options.path) {
      this.path = options.path;
      this.load();
    }
  }

  // ## Instance properties

  // Store the type
  type(_type) {
    if (_type) {
      if (!_.isString(_type)) {
        throw new Errors.ValidationError(`YAML rules agent \`type\` must be a string [${_type}]`);
      }
      this._type = _type;
    }
    return this._type;
  }

  // Store the identifier
  identifier(_identifier) {
    if (_identifier) {
      if (!_.isString(_identifier)) {
        throw new Errors.ValidationError(`YAML rules agent \`identifier\` must be a string [${_identifier}]`);
      }
      this._identifier = _identifier;
    }
    return this._identifier;
  }

  // Store the rule set
  rule_set(_rule_set) {
    if (_rule_set) {
      this._rule_set = _rule_set;
    }
    return this._rule_set;
  }

  // ###### field_map( has_map )
  // Store the field mappings
  field_map(_field_map) {
    if (_field_map) {
      if (!_.isObject(_field_map)) {
        throw new Errors.ValidationError(`YAML rules agent \`field_map\` must be an object [${_field_map}]`);
      }
      for (var source in _field_map) {
        var dest = _field_map[source];
        if (!_.isString(source)) {
          throw new Errors.ValidationError(`YAML rules agent \`field_map\` fields must be strings [${source}]`);
        }
        if (!_.isString(dest)) {
          throw new Errors.ValidationError(`YAML rules agent \`field_map\` fields must be strings [${dest}]`);
        }
      }
      this._field_map = _field_map;
    }
    return this._field_map;
  }

  // ###### field_transform( transform )
  // Store the field transforms
  // Also checks if they are valid in the `available_transforms` array
  field_transform(_field_transform) {
    if (_field_transform) {
      debug('Setting field_transform to', _field_transform, this.constructor.available_transforms);
      for (var field in _field_transform) {
        var transforms = _field_transform[field];
        if (!_.isArray(transforms)) {
          transforms = [transforms];
        }
        for (var transform of Array.from(transforms)) {
          if (!Transforms.available_transforms[transform]) {
            throw new Errors.ValidationError(`YAML rules agent section had an unknown field transform [${transform}]`);
          }
        }
        _field_transform[field] = transforms;
      }

      debug('Setting agent field_transforms to [%j]', _field_transform, '');
      this._field_transform = _field_transform;
    }

    return this._field_transform;
  }

  // Load the agent info from a file
  load(path) {
    if (path == null) {
      ({ path } = this);
    }
    debug('Reading agent yaml file', this.path);

    this.data = fs.readFileSync(this.path);
    this.doc = yaml.load(this.data);

    if (this.doc.agent != null ? this.doc.agent.field_map : undefined) {
      this.field_map(this.doc.agent.field_map);
    }

    if (this.doc.agent != null ? this.doc.agent.identifier : undefined) {
      this.identifier(this.doc.agent.identifier);
    }

    if (this.doc.agent != null ? this.doc.agent.field_transform : undefined) {
      return this.field_transform(this.doc.agent.field_transform);
    }
  }

  // ###### run( event_object )
  // Run the log event through all the agent generic mappings
  run(event_obj) {
    // Attach the default agent identifier
    // Formed: `{field}:{field}:{field}`
    if (event_obj.get('identifier') === undefined) {
      event_obj.set('identifier', this._identifier);
    }

    // Map incoming fields to new event fields
    this.run_field_map(event_obj);

    // Do any blanket transforms on the data, post mapping
    this.run_field_transform(event_obj);

    // Send the event through any agent specific rules
    this.run_rules(event_obj);

    return event_obj;
  }

  // ###### run_field_transform( Event_object )
  // Transform any fields on the way through
  // Modifies event_obj
  run_field_transform(event_obj) {
    debug('transforming', this._field_transform);
    for (var field in this._field_transform) {
      var transforms = this._field_transform[field];
      for (var transform of Array.from(transforms)) {
        var current = event_obj.get(field);
        if (current == null) {
          continue;
        }
        var tranformed_val = Transforms.available_transforms[transform].function(current);
        debug('transforming field [%s] old[%s] new[%s]', field, current, tranformed_val);
        event_obj.set(field, tranformed_val);
      }
    }
    return true; //so the for loop doesn't return an array
  }

  // ###### run_field_map( event_object )
  // Map an input field to a different event console field
  run_field_map(event_obj) {
    for (var from_field in this._field_map) {
      var to_field = this._field_map[from_field];
      var to_field_value = event_obj.get_input(from_field);
      debug('mapping', from_field, to_field, to_field_value);
      event_obj.set(to_field, to_field_value);
    }
    return true; //so the for loop doesn't return an array
  }

  // ###### run_rules( Event_object )
  // Run an event though the agent rule set
  run_rules(event_obj) {
    debug('running agent rules');
    return this._rule_set.run(event_obj);
  }

  // Convert generic structure to yaml
  to_yaml_obj() {
    const obj = {};
    obj.type = this._type;
    obj.identifier = this._identifier;
    obj.field_map = this._field_map;
    obj.field_transform = this._field_transform;
    obj.rules = this._rule_set ? this._rule_set.to_yaml_obj() : [];
    return obj;
  }

  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
}
Agent.initClass();

module.exports = { Agent };
