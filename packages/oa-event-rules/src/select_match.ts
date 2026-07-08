// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: No Events

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:match');

const { assert } = require('assert');

// OA modules

const Errors = require('oa-errors');

const {
  _,
  throw_error,
  regex_escape,
  is_regexy,
  regexy_to_regex,
  regexy_to_string,
  regex_from_array,
} = require('oa-helpers');

const { SelectBaseFieldValue } = require('./select_base');

// ## SelectMatch
// Match a field to a single value or any of an array of values

// string, will be turned into a regexp with any regexp special
// chars escaped.
//
//    match:
//      field: 'search'

// regexp, is a regexp
//
//    match:
//      field: !!js/regexp /se\wrch/

// `or` can be achieved when you specify an array of values
// If any of the values match, the select will return true
//
//    match:
//      field:
//        - 'search'
//        - !!js/regep /se\wrch/
//        - 'other'

const Cls = (this.SelectMatch = class SelectMatch extends SelectBaseFieldValue {
  static initClass() {
    this.label = 'match';
  }

  static description() {
    return {
      name: this.label,
      description: 'Searches a field for a particular value. Regex is allowed.',
      friendly_name: 'matches',
      help: 'This is a match field, it searches a string for a value',
      input: [
        {
          name: 'field',
          label: 'Field',
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

  // ###### generate( yaml_defintion )

  // Generate a match from the object structure in the yaml defintion
  // Doesn't neccesarily need to be yaml, just follow the format
  //
  //    match:
  //      field: value
  //
  //    match:
  //      field: /value/
  //
  //    match:
  //      field:
  //       - /value/
  //       - other

  static validate_field(fieldname, value, yaml_def) {
    if (fieldname == null) {
      Errors.throw_a(Errors.ValidationError, 'Match generate: field null', yaml_def);
    }
    if (fieldname === '') {
      Errors.throw_a(Errors.ValidationError, 'Match generate: empty field', yaml_def);
    }
    if (value == null) {
      Errors.throw_a(Errors.ValidationError, 'Match generate: value null', yaml_def);
    }
    if (!value) {
      Errors.throw_a(Errors.ValidationError, 'Match generate: empty value', yaml_def);
    }
  }

  static generate(yaml_def) {
    if (yaml_def.match == null) {
      Errors.throw_a(Errors.ValidationError, 'Definition needs :match key');
    }
    debug('Match generate: match for definition', yaml_def);

    const selects = [];
    for (var fieldname in yaml_def.match) {
      var value = yaml_def.match[fieldname];
      SelectMatch.validate_field(fieldname, value, yaml_def);
      debug('Match generate fieldname,value', fieldname, value);

      try {
        selects.push(new SelectMatch(fieldname, value));
      } catch (error) {
        logger.error('select match', error);
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

    this.label = this.constructor.label;

    // Place to store the match array for rendering
    this.values = [];

    switch (false) {
      case !(value instanceof Array):
        debug('Found an array of matches, regex ORing them', value);
        for (var v of Array.from(value)) {
          if (v === '') {
            Errors.throw_a(Errors.ValidationError, 'empty match in ', this.field);
          }
        }

        this.values = value;
        this.value = regex_from_array(value);
        break;

      case !(value instanceof RegExp):
        this.value_ori = value;
        this.value = value;
        break;

      case !is_regexy(value):
        this.value_ori = value;
        this.value = regexy_to_regex(value);
        break;

      default:
        this.value_ori = value;
        this.value = new RegExp(regex_escape(`${value}`));
    }

    debug('new', this.constructor.label, this.field, this.value);
  }

  // ###### run( event_object )
  // Run this match against an event
  run(event_obj) {
    let match, ret;
    debug('run: match field:[%o], value:[%o], field_value:[%o]', this.field, this.value, event_obj.get_any(this.field));

    // Check for the field
    const field_value = event_obj.get_any(this.field);
    if (field_value == null) {
      return false;
    }

    // Now check the value against the match
    if ((match = `${field_value}`.match(this.value))) {
      ret = true;
      debug('run: match was saved to event', match);
      event_obj.match(match);
    } else {
      ret = false;
    }

    debug('match: returning', ret);
    return ret;
  }

  // Hu-man
  toString() {
    return `${this.field} matches '${this.value}'`;
  }

  to_yaml_obj() {
    const obj = {};
    obj[this.constructor.label] = {};
    obj[this.constructor.label][this.field] = this.value_ori ? this.value_ori : this.values;
    return obj;
  }
});
Cls.initClass();
