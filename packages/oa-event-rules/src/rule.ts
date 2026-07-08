// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:rule');

// npm modules
let yaml = require('js-yaml');
const { v1: nodeuuid } = require('uuid');

// OA modules
const Errors = require('oa-errors');

const { Action, ActionBase } = require('./action');
const { Select, SelectBase } = require('./select');
const { Option, OptionBase } = require('./option');

const { _, objhash, throw_error } = require('oa-helpers');

// ## Rule

// A rule is made up of a selection and an action

// CJS-only guard: see oa-errors/src/errors.ts — top-level `this.X = X` only works under CommonJS.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.Rule = class Rule {
  // Generate the rule from a yaml definition
  static generate(yaml_def) {
    let action;
    debug('generating rule from def', yaml_def);

    yaml = _.cloneDeep(yaml_def);
    if (yaml.hash) {
      delete yaml.hash;
    }

    // Generate the action
    try {
      action = Action.generate(yaml);
    } catch (e) {
      debug('generating action failed', e);
      Errors.throw_a(Errors.ValidationError, e.message);
    }

    if (!action.run) {
      throw_error('No .run on action!');
    }

    // Generate the select
    const select = Select.generate(yaml);
    if (!select.run) {
      throw_error('No .run on select!');
    }

    // Generate the option
    const option = Option.generate(yaml);

    // Generate an id if none exists
    if (!yaml.uuid) {
      yaml.uuid = nodeuuid();
    }
    const { uuid } = yaml;

    return new Rule(yaml.name, {
      select,
      action,
      option,
      yaml,
      uuid,
    });
  }

  constructor(name, options) {
    this.name = name;
    if (options == null) {
      options = {};
    }
    if (this.name == null) {
      throw_error('No `name` paramater passed in to generate rule');
    }
    ({ select: this.select, action: this.action, option: this.option, yaml: this.yaml, uuid: this.uuid } = options);

    if (!this.select) {
      Errors.throw_a(Errors.ValidationError, 'no select');
    }
    if (!(this.select instanceof Select)) {
      throw_error('The `select` paramater is not an instance of Select', this.select);
    }

    if (!this.action) {
      Errors.throw_a(Errors.ValidationError, 'no action');
    }
    if (!(this.action instanceof Action)) {
      throw_error('The `action` paramater is not an instance of Action', this.action);
    }

    if (this.option && !(this.option instanceof Option)) {
      throw_error('The `option` paramater is not an instance of Option', this.option);
    }

    if (!this.uuid) {
      Errors.throw_a(Errors.ValidationError, 'no uuid', yaml);
    }
  }

  // Test the selection then run the action
  run(event_obj) {
    debug('running rule', this.toString());
    if (event_obj == null) {
      throw_error('No `event_obj` to apply this rule to');
    }
    if (this.select == null) {
      throw_error('No `select` attached to run');
    }
    if (this.action == null) {
      throw_error('No `action` attached to run');
    }

    const options = this.option ? this.option.to_object() : {};

    if (options.skip) {
      debug('Skipping rule', this.name);
      return event_obj;
    }

    // Now we run the select against the object
    // If true we run the action
    if (this.select.run(event_obj, options) === true) {
      event_obj.add_matched({ from: 'RuleSelector', uuid: this.uuid, name: this.name });
      debug('Select matched for [%o] [%o] ✔️', this.uuid, this.select.toString());
      debug('run action ', this.action.toString(), options);
      this.action.run(event_obj, options);
    } else {
      debug('Selected skipped for [%o] [%o] ❌', this.uuid, this.select.toString());
    }

    return event_obj;
  }

  // Create a nice string for the rule
  toString() {
    return `${this.name}:${this.uuid} Select events where ${this.select.toString()}. Then ${this.action.toString()}`;
  }

  // Back to the yaml description
  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }

  // Create an object of the reducted yaml description
  // only works for objects created via `generate` or supplying
  // the yaml object at the moment
  to_yaml_obj(options) {
    if (options == null) {
      options = {};
    }
    const include = {};
    if (options.hash) {
      include.hash = objhash(this.yaml);
    }
    return _.defaults(include, this.yaml);
  }
};

// obj     = { name: @name }
// action  = @action.to_yaml_obj()
// select  = @select.to_yaml_obj()
// options = @option.to_yaml_obj()
// # Merge the components into one flat Rule
// _.defaults obj, action
// _.defaults obj, select
// _.defaults obj, option
// obj
