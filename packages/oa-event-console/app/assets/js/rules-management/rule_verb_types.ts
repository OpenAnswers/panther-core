// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # RuleVerbTypes

// Configure and hold a set of RuleVerbs
// Option, Action, Select extend this
class RuleVerbTypes {
  static initClass() {
    // The name of the type. `option`, `action`, `select` etc
    this.verb_type = '_verbtype_';

    // ID of the verb type to override
    this.id = 'Type';
    this.contains_class = RuleVerbBase;
    this.class = 'verb-entry';

    // Object to hold the verb name -> Class mapping
    this.types = {};

    // Debug logger to override
    this.logger = debug('oa:event:rules:rule_verb_type');
  }

  // Lookup a verb type
  static lookup_type(type) {
    return this.types[type] || false;
  }

  // Get a verb type and throw
  static get_type(type) {
    this.logger('type', type, this.types);
    return (
      this.types[type] ||
      (() => {
        throw new Error(`No ${this.verb_type} verb ${type}`);
      })()
    );
  }

  // Return all the type names
  static all_types() {
    return this.types_keys ?? (this.types_keys = _.keys(this.types));
  }

  // Return only the active type names
  static active_types() {
    return (
      this.types_keys_active ??
      (this.types_keys_active = _.compact(
        _.map(this.types, function (v, k) {
          if (v.disabled !== true && v.hidden !== true) {
            return k;
          }
        })
      ))
    );
  }

  // Find all the `types` verbs also found in a as passed in object.
  // Usually for the yaml definition
  static find_types_in(yaml_def) {
    return _.intersection(_.keys(yaml_def), _.keys(this.types));
  }

  // Expect we have a correct class type
  static expect_class_type(obj, type) {
    type ??= this.contains_class;
    if (!(obj instanceof type)) {
      throw new Error(`Object ${typeof obj} is not of type ${type.name}`);
    }
  }

  // Check we have the local class type
  static check_class_type(obj) {
    return obj instanceof this.contains_class;
  }
}
RuleVerbTypes.initClass();

window.RuleVerbTypes = RuleVerbTypes;
