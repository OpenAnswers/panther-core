// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Selecting fields

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select');

// OA modules
const { regex_escape, regex_from_array, throw_error, ends_with, starts_with, _ } = require('oa-helpers');

const Errors = require('oa-errors');

const { SelectBase, SelectBaseField, SelectBaseFieldValue, SelectBaseSingle } = require('./select_base');

// Import the various selects
const { SelectAll } = require('./select_all');
const { SelectNone } = require('./select_none');
const { SelectMatch } = require('./select_match');
const { SelectEquals } = require('./select_equals');
const { SelectStartsWith } = require('./select_starts_with');
const { SelectEndsWith } = require('./select_ends_with');
const { SelectFieldExists } = require('./select_field_exists');
const { SelectFieldMissing } = require('./select_field_missing');
const { SelectLessThan } = require('./select_less_than');
const { SelectGreaterThan } = require('./select_greater_than');
const { SelectSchedule } = require('./select_schedule');

// ## Select

// Public factory interface to the Selects

// Give it a some yaml and it will give you a list
// of select classes back. `@types` is the main lookup for this
// If you implement a new select, it will need to be added here.

// External entities should do lookups for select verbs from here, like
// the API is doing. This means if anything updated here it propogates
// throughout the system. Same deal for actions/options

// @select: Array of select objects for this instance/rule

class Select {
  static initClass() {
    // `.types` maps the word to a class
    this.types = {
      all: SelectAll,
      none: SelectNone,
      match: SelectMatch,
      equals: SelectEquals,
      field_exists: SelectFieldExists,
      field_missing: SelectFieldMissing,
      starts_with: SelectStartsWith,
      ends_with: SelectEndsWith,
      less_than: SelectLessThan,
      greater_than: SelectGreaterThan,
      schedule: SelectSchedule,
    };

    // Generate a big blob of info, for the API
    this.types_description = {};
    for (var name in this.types) {
      debug('building %s description', name);
      this.types_description[name] = this.types[name].description();
    }
  }

  // Helper for an array of types
  static types_list() {
    return _.keys(this.types);
  }

  // Take a rules worth of yaml and turn it into the underlying js model
  static generate(yaml_def) {
    debug('generating Select', yaml_def);

    // Multiple selects = `and`
    let select_objs = [];

    // Find the name in types
    const select_types = _.intersection(_.keys(yaml_def), _.keys(Select.types));

    // We can't select with no select definition
    if (select_types.length === 0) {
      const msg = 'Failed to generate select: No valid select verb found in definition';
      logger.error(msg, yaml_def);
      return Errors.throw_a(Errors.ValidationError, msg, yaml_def);
    }
    //select_objs.push new self.SelectAll

    debug('generating select for select_types', select_types);
    for (var name of Array.from(select_types)) {
      var select_ret = this.types[name].generate(yaml_def);
      select_objs = select_objs.concat(select_ret);
    }

    debug('generated Selects', select_objs);
    return new Select(select_objs);
  }

  // We store an array of various select objects
  constructor(selects) {
    this.selects = selects;
  }

  // Hu-man, note the default 'and'
  toString() {
    return Array.from(this.selects)
      .map(select => select.toString())
      .join(' and ');
  }

  // Loop over the selects and check each one against an event
  run(event_obj) {
    // Only true if all selects in the array are true
    for (var select of Array.from(this.selects)) {
      if (!select.run(event_obj)) {
        return false;
      }
    }
    return true;
  }

  // Back to yaml.. not really working as we lose info or structure in
  // the conversion frmo yaml
  to_yaml_obj() {
    const o = {};
    for (var select of Array.from(this.selects)) {
      _.defaults(o, select.to_yaml_obj());
    }
    return o;
  }

  // Then dump to yaml
  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
}
Select.initClass();

// Exports
//
// CJS-only guard: the `this.X = X` lines below rely on `this === module.exports`,
// which only holds under CommonJS. If emitted as ESM, `this` is undefined and
// every export becomes a silent failure — fail loudly here instead. See
// oa-errors/src/errors.ts for full context.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not ' +
      'work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.Select = Select;
this.SelectAll = SelectAll;
this.SelectNone = SelectNone;
this.SelectMatch = SelectMatch;
this.SelectEquals = SelectEquals;
this.SelectStartsWith = SelectStartsWith;
this.SelectEndsWith = SelectEndsWith;
this.SelectFieldExists = SelectFieldExists;
this.SelectFieldMissing = SelectFieldMissing;
this.SelectLessThan = SelectLessThan;
this.SelectGreaterThan = SelectGreaterThan;
this.SelectSchedule = SelectSchedule;
//gte
//lte
