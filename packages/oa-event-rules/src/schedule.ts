// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:schedule');

const { DayTime } = require('./day_time');

const { throw_error } = require('oa-helpers');

const Joi = require('joi');

// OA modules
const Errors = require('oa-errors');

// npm modules
const { v1: nodeuuid } = require('uuid');
const moment = require('moment');
const momentZone = require('moment-timezone');
const { schedule_validator } = require('./validations');

// ### Group

// Holds a groups worth of rules.
// Includes a matcher for the group
//  and an action to set the group name

const default_validate_options = { allowUnknown: false };

// CJS-only guard: see oa-errors/src/errors.ts — top-level `this.X = X` only works under CommonJS.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.Schedule = class Schedule {
  // returns Promise<yaml_def>
  static validate(yaml_def) {
    const { error, value } = schedule_validator.validate(yaml_def, default_validate_options);
    if (error) {
      logger.error('Joi Validation failed on Schedule: ', error);
      return Promise.reject(new Errors.ValidationError('Incorrect schedule definition'));
    }
    return Promise.resolve(value);
  }

  // expects:
  //   name: "some name"
  //   uuid: some-uuid
  //   start: "HH:mm"
  //   end: "HH:mm"
  //   dow: [String{,7}]
  //
  // Generate a Schedule from a yaml object
  static generate(yaml_def) {
    debug('generating Schedule', yaml_def);

    this.validate(yaml_def)
      .then(result => logger.info('JOI validated', result))
      .catch(error => logger.error('JOI failed', error));

    if (!yaml_def) {
      Errors.throw_a(Errors.ValidationError, 'No schedule definition');
    }
    if (!yaml_def.name) {
      Errors.throw_a(Errors.ValidationError, 'No Schedule name');
    }
    if (!yaml_def.uuid) {
      yaml_def.uuid = nodeuuid();
    }

    if (!yaml_def.start) {
      yaml_def.start = '00:00';
    }
    if (!yaml_def.start.match(/[0-9][0-9]:[0-9][0-9]/)) {
      Errors.throw_a(Errors.ValidationError, 'Incorrect schedule start time');
    }

    if (!yaml_def.end) {
      yaml_def.end = '00:00';
    }
    if (!yaml_def.end.match(/[0-9][0-9]:[0-9][0-9]/)) {
      Errors.throw_a(Errors.ValidationError, 'Incorrect schedule end time');
    }

    if (yaml_def.start === yaml_def.end) {
      Errors.throw_a(Errors.ValidationError, 'Invalid start and end times, must be different');
    }

    if (!yaml_def.days) {
      Errors.throw_a(Errors.ValidationError, 'No Schedule days of week');
    }
    if (!(yaml_def.days instanceof Array)) {
      Errors.throw_a(Errors.ValidationError, 'Invalid days of week');
    }
    if (!(yaml_def.days.length >= 1)) {
      Errors.throw_a(Errors.ValidationError, 'No Day(s) were selected');
    }

    yaml_def.days.forEach(function (day) {
      switch (day) {
        case 'Sunday':
        case 'Monday':
        case 'Tuesday':
        case 'Wednesday':
        case 'Thursday':
        case 'Friday':
        case 'Saturday':
          return true;
        default:
          return Errors.throw_a(Errors.ValidationError, 'Invalid Day of Week');
      }
    });

    return new Schedule(yaml_def.name, yaml_def.uuid, yaml_def.start, yaml_def.end, yaml_def.days);
  }

  // convert HH:mm to number of seconds after midnight
  convertTime(hourMinute) {
    let seconds;
    const splitString = hourMinute.split(':');
    const hs = splitString[0] * 60 * 60;
    const ms = splitString[1] * 60;
    return (seconds = hs + ms);
  }

  //
  // Create a schedule from a name, selector and rules
  constructor(name, uuid, start1, end1, dow_a) {
    this.name = name;
    this.uuid = uuid;
    this.start = start1;
    this.end = end1;
    this.dow_a = dow_a;
    if (this.name == null) {
      throw new Error('new Schedule requires a name first');
    }

    this.zone = process.env.TZ || 'Europe/London';

    this.isoDays = [];
    // how many times is this schedule referenced by a rule?
    this.ref_count = 0;

    // timespans { start: <seconds since midnight>, end: <seconds since midnight>}
    this.timespans = [];

    // check if end time is earlier than start time
    const start = this.convertTime(this.start);
    const end = this.convertTime(this.end);
    if (end < start) {
      // starts at midnight
      this.timespans.push({ start: 0, end });
      // ends at midnight following day
      this.timespans.push({ start, end: 24 * 60 * 60 });
    } else {
      this.timespans.push({ start, end });
    }

    this.isoDays = this.dow_a.map(day => moment(day, 'dddd').isoWeekday());
  }

  ref_count_increment() {
    return (this.ref_count += 1);
  }

  ref_count_decrement() {
    return (this.ref_count -= 1);
  }

  is_referenced() {
    return this.ref_count >= 1;
  }

  // Convert the running rule back into an object
  to_yaml_obj(options) {
    if (options == null) {
      options = {};
    }
    const obj = {
      name: this.name,
      uuid: this.uuid,
      start: this.start,
      end: this.end,
      days: this.dow_a,
    };
    debug('to_yaml_obj', obj);
    return obj;
  }

  is_in(momentNow) {
    if (momentNow == null) {
      momentNow = momentZone.tz(this.zone);
    }
    logger.info('is_in() today is ', momentNow.isoWeekday());
    logger.info('is_in() rule days ', this.isoDays);
    // @start, @end HH:MM
    if (this.isoDays.includes(momentNow.isoWeekday())) {
      // check times
      const secondsSinceMidnight = this.convertTime(momentNow.format('HH:mm'));
      const results = this.timespans.map(function (timeRange) {
        debug('Range Check ' + timeRange.start + ' -> ' + timeRange.end + ', ' + secondsSinceMidnight);
        return timeRange.start < secondsSinceMidnight && secondsSinceMidnight <= timeRange.end;
      });

      logger.info('is_in() timespan results: ', results);
      return results.includes(true);
    } else {
      logger.info('is_in() natural false');
      return false;
    }
  }
};
