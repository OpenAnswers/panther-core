// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Discard

// A common task of discarding has been added which will
// generate rules for you

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:discard');

// npm modules
const yaml = require('js-yaml');
const { v1: nodeuuid } = require('uuid');

// oa modules
const { throw_error } = require('oa-helpers');
const { Rule } = require('./rule');
const { Select } = require('./select');
const { Action } = require('./action');

// Grouping of rules that are for discard

// CJS-only guard: see oa-errors/src/errors.ts — top-level `this.X = X` only works under CommonJS.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.Discard = class Discard {
  static description() {
    return {
      name: 'discard',
      description: 'Discards the event immediately, and applies no further processing.',
    };
  }

  // Take an array of discard definitions and
  // turn them into a rule set
  static generate(yaml_def) {
    const discard_rule_set = [];
    for (let i = 0; i < yaml_def.length; i++) {
      var discard_def = yaml_def[i];
      discard_rule_set.push(this.gen_discard_rule(discard_def));
    }

    return discard_rule_set;
  }

  // Generate a single discard
  static gen_discard_rule(discard_def) {
    let select;
    const action = Action.generate({ discard: true });

    // Array = shortcut to summary
    if (discard_def instanceof RegExp || discard_def instanceof String) {
      debug('Generating a discard select from RegExp', discard_def);
      select = Select.generate({ match: { summary: discard_def } });
    } else {
      debug('Generating a discard select from definition', discard_def);
      select = Select.generate(discard_def);
    }

    debug('discard select, action', select, action, action instanceof Action);
    return new Rule(`Discard ${select}`, {
      select,
      action,
      uuid: nodeuuid(),
    });
  }
};
