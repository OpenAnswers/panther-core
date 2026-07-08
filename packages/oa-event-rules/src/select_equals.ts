// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: No Events

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:equals');

// OA modules
const Errors = require('oa-errors');
const { _, throw_error } = require('oa-helpers');

const { SelectBaseFieldValue } = require('./select_base');

// Match a field exactly
const Cls = (this.SelectEquals = class SelectEquals extends SelectBaseFieldValue {
  static initClass() {
    this.label = 'equals';
  }

  static description() {
    return {
      name: this.label,
      description: 'Matches values that are exactly the same.',
      friendly_before: 'is',
      friendly_name: 'equal',
      friendly_after: 'to',
      help: 'This is a equals field, it must match the value exactly',
      input: [
        {
          name: 'field',
          label: 'field',
          type: 'string',
        },
        {
          name: 'value',
          label: 'string or /regex/',
          type: 'stregex',
          array: true,
        },
      ],
    };
  }

  static validate_field(field, value, yaml_def) {
    if (field == null) {
      Errors.throw_a(Errors.ValidationError, 'Select Equals requires a [field]', yaml_def);
    }
    if (field === '') {
      Errors.throw_a(Errors.ValidationError, 'Select Equals requires a [field]', yaml_def);
    }
    if (value == null) {
      Errors.throw_a(Errors.ValidationError, 'Select Equals requires a [value]', yaml_def);
    }
    if (value === '') {
      Errors.throw_a(Errors.ValidationError, 'Select Equals requires a [value]', yaml_def);
    }
    switch (false) {
      case !(value instanceof Array):
        for (var v of Array.from(value)) {
          if (v === '') {
            Errors.throw_a(Errors.ValidationError, 'Select Equals requires a [value]', yaml_def);
          }
        }
        break;
    }
  }

  static generate(yaml_def) {
    debug('equals generate: select from', yaml_def);
    if (yaml_def.equals == null) {
      Errors.throw_a(Errors.ValidationError, 'need equals in definition');
    }

    const selects = [];
    for (var field in yaml_def.equals) {
      var value = yaml_def.equals[field];
      SelectEquals.validate_field(field, value, yaml_def);

      try {
        selects.push(new SelectEquals(field, value));
      } catch (error) {
        logger.error('select equals', error);
        if (error instanceof Errors.ValidationError) {
          throw error;
        }
        Errors.throw_a(Errors.ValidationError, 'Failed to create select from definition', yaml_def);
      }
    }

    if (!(selects.length > 0)) {
      Errors.throw_a(Errors.ValidationError, 'No selects could be built from definition', yaml_def);
    }

    debug('match generate: built selects', selects);
    return selects;
  }

  constructor(field, value, args) {
    if (args == null) {
      args = {};
    }
    super(field, value);
    if (this.field == null) {
      throw_error('param 1: field');
    }
    if (value == null) {
      throw_error('param 2: value');
    }
    if (value === '') {
      throw_error('param 2: value');
    }

    switch (false) {
      case !(value instanceof Array):
        for (var v of Array.from(value)) {
          if (v === '') {
            throw_error('param in values is empty');
          }
        }
        break;
    }

    this.label = this.constructor.label;
    this.value = value;

    debug('new', this.constructor.label, this.field, this.value);
  }

  // Run the event through the matcher
  run(event_obj) {
    debug('run: equals field:[%o], value:[%o], %o', this.field, this.value, this.toString());

    const field_value = event_obj.get_any(this.field);
    if (field_value == null) {
      return false;
    }
    debug('considering field_value:[%o]', field_value);

    const matched_result = (() => {
      if (Array.isArray(this.value)) {
        let found_in_array = false;
        for (var inner_value of Array.from(this.value)) {
          debug('trying inner [%o]', inner_value);
          if (field_value === inner_value) {
            found_in_array = true;
            break;
          }
        }
        return found_in_array;
      } else {
        return field_value === this.value;
      }
    })();

    // matched_value = field_value == @value

    debug('equals ', matched_result ? '✔️' : '❌');
    return matched_result;
  }

  // Conver match to english string
  toString() {
    return `${this.field} equals '${this.value}'`;
  }

  // Dump the yaml obj
  to_yaml_obj() {
    const obj = {};
    obj[this.constructor.label] = {};
    obj[this.constructor.label][this.field] = this.value;
    return obj;
  }
});
Cls.initClass();
