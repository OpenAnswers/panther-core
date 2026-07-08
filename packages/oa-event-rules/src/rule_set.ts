// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # RuleSet

// The RuleSet houses a collection of Rules

// Logging
const { logger, debug } = require('oa-logging')('oa:event:rules:ruleset');

// NPM modules
//Promise           = require 'bluebird'

// OA modules
const { Rule } = require('./rule');
const { Discard } = require('./discard');
const { Dedupe } = require('./dedupe');
const { _, throw_error } = require('oa-helpers');

const { ruleset_validator, joi_error_summary } = require('./validations');

// The RuleSet is a generic store for a set of rules.

// CJS-only guard: see oa-errors/src/errors.ts — top-level `this.X = X` only works under CommonJS.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.RuleSet = class RuleSet {
  static validate(yaml_def) {
    const { error, value } = ruleset_validator.validate(yaml_def);
    if (error) {
      const messages = joi_error_summary(error);
      for (var message of Array.from(messages)) {
        logger.error('Validation [RuleSet] failed ', message);
      }
      throw new Errors.ValidationError('RuleSet');
    }
  }

  //@generate: ( yaml_def, event_rules_ref ) ->
  static generate(yaml_def) {
    const rules = new RuleSet();
    //rules.event_rules = event_rules_ref

    if (!yaml_def) {
      throw_error('No definition');
    }

    if (yaml_def.discard) {
      rules.combine(Discard.generate(yaml_def.discard));
    }

    if (yaml_def.dedupe) {
      rules.combine(Dedupe.generate(yaml_def.dedupe));
    }

    if (yaml_def.rules) {
      for (var rule of Array.from(yaml_def.rules)) {
        var new_rule = Rule.generate(rule);
        debug('new_rule', new_rule);
        if (!new_rule.run) {
          throw_error('No run on rule!');
        }
        rules.add(new_rule);
      }
    }

    if (!yaml_def.rules) {
      // and yaml_def.rules.length > 0
      logger.warn('No rules in definition', yaml_def, '');
    } else {
      if (!_.isArray(yaml_def.rules)) {
        logger.error('Rules definition must be an array', yaml_def, '');
        throw new Error('Rules definition must be an array (rules:)');
      }
      if (yaml_def.rules.length === 0) {
        logger.info('No rules in definition', yaml_def, '');
      }
    }

    debug('generated rules', rules);
    return rules;
  }

  constructor() {
    this.rules = [];
  }
  //@event_rules = null

  // Get a rule by index, hash or rule
  // The rule is more of an existence check
  get(arg) {
    let rule = false;
    if (_.isFinite(arg)) {
      return (rule = this.rules[arg]);
    } else if (_.isObject(arg)) {
      const idx = this.rules.indexOf[arg];
      return (rule = this.rules[idx]);
    } else if (_.isString(arg)) {
      return _.find(this.rules, { hash: arg });
    }
  }

  add(rule) {
    if (!rule.run) {
      throw_error('No .run on rule! Is this a real Rule?');
    }
    return this.rules.push(rule);
  }
  //@event_rules.set_edited_flag()

  // ###### update( rule_index, Rule )
  // Update an existing rule with new details
  // rule must be an instance of Rule
  update(index, rule) {
    debug('updating rule at index [%s]', index, rule);
    return (this.rules[index] = rule);
  }
  //@event_rules.set_edited_flag()

  // ###### insert( Rule )
  // Insert a Rule at the beginning
  // Must be an instance of Rule
  insert(rule) {
    if (!rule.run) {
      throw_error('No .run on rule! Is this a real Rule?');
    }
    return this.rules.unshift(rule);
  }
  //@event_rules.set_edited_flag()

  // ###### delete_index( index )
  // Delete a rule from the RuleSet array by index (0 based)
  delete_index(index) {
    if (parseInt(index) !== index) {
      throw_error(`Can only delete a numeric index [${index}`);
    }
    return this.rules.splice(index, 1);
  }

  // ###### move( index, new_index )
  // Move a rule from it's current location to a new one
  move(oldPos, newPos) {
    const ruleToMove = this.rules[oldPos];
    // Remove rule in preparation for moving
    this.rules.splice(oldPos, 1);
    // Insert rule in new position
    return this.rules.splice(newPos, 0, ruleToMove);
  }

  combine(rule_set) {
    return Array.from(rule_set).map(rule => this.add(rule));
  }

  length() {
    return this.rules.length;
  }

  // Run the ruleset, return a new event
  run(event_obj) {
    debug('running ruleset on event', event_obj, this.length());

    // clear any prior stopped_rule_set flags
    event_obj.unstop_rule_set();

    // Could `nexttick` this to provide
    // some space for others to run
    for (var rule of Array.from(this.rules)) {
      debug(rule);
      rule.run(event_obj);

      // terminate this ruleset on either of the stopping condition flags
      if (event_obj.stopped() || event_obj.stopped_rule_set()) {
        debug('stopping was set by ' + rule.uuid);
        break;
      }
    }

    debug('EVENT_OBJ %o', event_obj);
    return event_obj;
  }

  find(id) {
    const r = [];
    for (var rule of Array.from(this.rules)) {
      if (rule.id === id) {
        r.push(rule);
      }
    }
    return _.flatten(r);
  }

  to_yaml_obj(options) {
    let rule_set;
    return (rule_set = Array.from(this.rules).map(rule => rule.to_yaml_obj(options)));
  }

  to_yaml_obj_with_hash() {
    return Array.from(this.rules).map(rule => rule.to_yaml_obj_with_hash());
  }
};

// Global are the first rules that run against everything
this.GlobalRuleSet = class GlobalRuleSet extends this.RuleSet {
  constructor(name) {
    if (name == null) {
      name = 'globals';
    }
    super();
    this.name = name;
    if (this.name == null) {
      throw_error('GlobalRuleSet param 1: name');
    }
    this.rules = [];
  }
};

// Groups are rules run again specific set of events
this.GroupRuleSet = class GroupRuleSet extends this.RuleSet {
  constructor(name) {
    super();
    this.name = name;
    if (this.name == null) {
      throw_error('GroupRuleSet param 1: name');
    }
    this.rules = [];
  }
};
