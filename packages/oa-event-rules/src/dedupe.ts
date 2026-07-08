// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Dedupe

// A common task of deduplication has been added which will
// generate rules for you

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:dedupe');

// npm modules
const yaml = require('js-yaml');

// oa modules
const { Rule } = require('./rule');
const { throw_error, _ } = require('oa-helpers');

// Grouping of rules that are for dedupe

// CJS-only guard: see oa-errors/src/errors.ts — top-level `this.X = X` only works under CommonJS.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.Dedupe = class Dedupe {
  static generate(yaml_def) {
    const rules = [];
    for (var dedupe_def of Array.from(yaml_def)) {
      rules.push(this.gen_dedupe_rule(dedupe_def));
    }

    return rules;
  }

  // Generate a summary dedupe rule
  static gen_dedupe_rule(match_replace) {
    let match, repl, search;
    debug('generate dedupe rulematch_replace', match_replace);
    switch (match_replace.length) {
      case 3:
        [match, search, repl] = Array.from(match_replace);
        break;
      case 2:
        [match, repl] = Array.from(match_replace);
        search = match;
        break;
      default:
        throw_error('nope', match_replace.length, match_replace);
    }

    return Rule.generate({
      name: `dedupe ${match} ${search} ${repl}`,
      match: {
        summary: match,
      },
      replace: {
        field: 'summary',
        this: search,
        with: repl,
      },
    });
  }
};
