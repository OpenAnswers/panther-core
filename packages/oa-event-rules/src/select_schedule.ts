// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: from schedule

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
const { Schedules } = require('./schedules');

// NPM modules

const { moment } = require('moment');

// ## SelectSchedule
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

const Cls = (this.SelectSchedule = class SelectSchedule extends SelectBaseFieldValue {
  static initClass() {
    this.label = 'schedule';
  }

  static description() {
    return {
      name: this.label,
      description: 'Checks if time now is within the schedule .',
      help: 'This is a match field, it searches a string for a value',
      input: [
        {
          name: 'name',
          label: 'Name',
          type: 'string',
        },
        {
          name: 'uuid',
          label: 'uuid of schedule',
          type: 'string',
        },
      ],
    };
  }

  // ###### generate( yaml_defintion )

  // Generate a match from the object structure in the yaml defintion
  // Doesn't neccesarily need to be yaml, just follow the format
  //
  //    schedule:
  //      name: schedule name
  //
  //    schedule:
  //      uuid: schedule uuid
  //

  static validate_field(fieldname, value, yaml_def) {
    if (fieldname === '') {
      Errors.throw_a(Errors.ValidationError, 'Schedule generate: empty field', yaml_def);
    }
    if (value == null) {
      Errors.throw_a(Errors.ValidationError, 'Schedule generate: value null', yaml_def);
    }
    if (!value) {
      Errors.throw_a(Errors.ValidationError, 'Schedule generate: empty value', yaml_def);
    }
    if (fieldname !== 'name') {
      Errors.throw_a(Errors.ValidationError, 'Schedule generate: must have a name', yaml_def);
    }
    const valid_schedule = Schedules.find_by_name(value);
    if (valid_schedule == null) {
      Errors.throw_a(Errors.ValidationError, 'Schedule generate: schedule name does not exist');
    }
    return valid_schedule;
  }

  static generate(yaml_def) {
    if (yaml_def.schedule == null) {
      Errors.throw_a(Errors.ValidationError, 'Definition needs :schedule key');
    }
    debug('Schedule generate: schedule for definition', yaml_def);

    const selects = [];
    for (var fieldname in yaml_def.schedule) {
      var value = yaml_def.schedule[fieldname];
      const valid_schedule = SelectSchedule.validate_field(fieldname, value, yaml_def);
      debug('Match generate fieldname,value', fieldname, value);

      try {
        selects.push(new SelectSchedule(fieldname, value));
        valid_schedule.ref_count_increment();
      } catch (error) {
        if (error instanceof Errors.ValidationError) {
          throw error;
        }
        logger.error('select schedule', error);
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

    this.value_ori = value;
    this.value = value;

    debug('new', this.constructor.label, this.field, this.value);
  }

  // ###### run( event_object )
  // Run this match against an event
  run(event_obj) {
    debug(
      'run: schedule field:[%o], value:[%o], field_value: [%o]',
      this.field,
      this.value,
      event_obj.get_any(this.field)
    );

    // find the schedule
    const schedule = Schedules.find_by_name(this.value);
    if (!schedule) {
      logger.warn('Schedule name did not exist in rules');
      return false;
    }

    return schedule.is_in();
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
