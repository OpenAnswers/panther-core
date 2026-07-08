// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// oa modules
const Errors = require('oa-errors');
const { throw_error, _, delay, objhash } = require('oa-helpers');

// NPM modules

const moment = require('moment');

// CJS-only guard: see oa-errors/src/errors.ts — top-level `this.X = X` only works under CommonJS.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.DayTime = class DayTime {
  //
  // day: <Monday|Tuesday|...>
  // time: 'HH:MM'

  static generate(yaml_def) {
    let daytime;
    if (!yaml_def) {
      throw_error('No definition');
    }

    if (!yaml_def.day) {
      throw_error('No day');
    }
    if (!yaml_def.time) {
      throw_error('No time');
    }
    return (daytime = new DayTime(yaml_def.day, yaml_def.time));
  }

  constructor(day, time) {
    // day = "Monday"..."Sunday"
    // time = "23:45"
    this.day = day;
    this.time = time;
    const m_now = moment('' + this.day + '-' + this.time, 'dddd-HH:mm');
    if (!m_now.isValid()) {
      throw_error('DayTime is invalid');
    }
    // internally stored as integers
    this.dow = m_now.isoWeekday();
    this.hour = m_now.hour();
    this.minute = m_now.minute();
  }

  to_yaml_obj(options) {
    if (options == null) {
      options = {};
    }
    const obj = {
      day: this.day,
      time: this.time,
    };
    return obj;
  }

  static now() {
    let daytime;
    const day_of_week = moment().format('dddd');
    const time_of_day = moment().format('HH:mm');
    return (daytime = new DayTime(day_of_week, time_of_day));
  }
};
