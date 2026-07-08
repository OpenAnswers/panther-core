// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:group');

// OA modules
const { Select } = require('./select');
const { ActionSet } = require('./action');
const { RuleSet } = require('./rule_set');
const Errors = require('oa-errors');
const { group_validator, joi_error_summary } = require('./validations');

// npm modules
const { v1: nodeuuid } = require('uuid');

// ### Group

// Holds a groups worth of rules.
// Includes a matcher for the group
//  and an action to set the group name

// CJS-only guard: see oa-errors/src/errors.ts — top-level `this.X = X` only works under CommonJS.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.Group = class Group {
  static validate(yaml_def) {
    const { error, value } = group_validator.validate(yaml_def);
    if (error) {
      const messages = joi_error_summary(error);
      for (var message of Array.from(messages)) {
        logger.error('Validation [RuleSet] failed ', message);
      }
      throw new Errors.ValidationError('RuleSet');
    }
    return value;
  }

  // Generate a group from a yaml object
  static generate(name, yaml_def) {
    let group;
    debug('generating Group', name);

    const select = (() => {
      let validated_group;
      if (yaml_def.select) {
        validated_group = this.validate(yaml_def.select);
        return Select.generate(yaml_def.select);
      } else {
        validated_group = this.validate(yaml_def);
        return Select.generate(yaml_def);
      }
    })();
    // Generate an id if none exists
    if (!yaml_def.uuid) {
      yaml_def.uuid = nodeuuid();
    }
    const { uuid } = yaml_def;

    // TODO check...
    const rules = RuleSet.generate({ rules: yaml_def.rules });
    return (group = new Group(name, select, rules, uuid));
  }

  // Create a group from a name, selector and rules
  constructor(name, select, rules, uuid) {
    this.name = name;
    this.select = select;
    this.rules = rules;
    this.uuid = uuid;
    if (this.name == null) {
      throw new Error('new Group requires a name first');
    }
    if (!this.select || !(this.select instanceof Select)) {
      throw new Error('new Group requires a Select second');
    }
    if (!this.rules || !(this.rules instanceof RuleSet)) {
      throw new Error('new Group requires a RuleSet third');
    }
    //throw_error "param 4: action" unless @action?

    // Set the group name if we match
    this.action = new ActionSet('group', this.name);
  }

  // Event rules
  event_rules(parent = null) {
    if (parent) {
      this.rules.event_rules = parent;
    }
    return this.rules.event_rules;
  }

  // Update a select
  update_select(rule, index) {
    const select = Select.generate(rule);
    return (this.select = select);
  }

  // Run an event through the group
  run(event_obj) {
    debug('run group', this.name);
    // Is this event selected by this group?
    if (this.select.run(event_obj)) {
      debug('run select matched group', this.name);

      this.action.run(event_obj);
      this.rules.run(event_obj);

      return event_obj.close_matched_group(this.name, this.uuid);
    }
  }

  // Convert the running rule back into an object
  to_yaml_obj(options) {
    if (options == null) {
      options = {};
    }
    const obj = {
      select: this.select.to_yaml_obj(),
      rules: this.rules.to_yaml_obj(),
      uuid: this.uuid,
    };
    debug('to_yaml_obj', obj);
    return obj;
  }
};
