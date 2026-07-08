// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

//  Logging module
const { logger, debug } = require('oa-logging')('oa:event:rules:schedules');

// oa modules
const { Schedule } = require('./schedule');
const { _ } = require('oa-helpers');
const Errors = require('oa-errors');

// Groups holds a set of schedules to compare against
// 1 layer of the rule checking
class Schedules {
  static generate(yaml_def) {
    const schedules = new Schedules();

    // Create all the groups
    if (yaml_def) {
      for (var schedule of Array.from(yaml_def)) {
        debug('generating schedules for ', schedule);
        schedules.add(Schedule.generate(schedule));
      }
    }

    this.schedules = schedules;
    return schedules;
  }

  static find_by_name(name) {
    return this.schedules.get(name);
  }

  constructor(options) {
    this.store_map = new Map();
    if (options != null ? options.schedules : undefined) {
      for (var schedule of Array.from(options.schedules)) {
        add(schedule);
      }
    }
  }

  add(schedule) {
    return this.store_map.set(schedule.name, schedule);
  }

  get(schedule_name) {
    return this.store_map.get(schedule_name);
  }

  get_all() {
    return Array.from(this.store_map.values());
  }

  del(schedule_name) {
    if (!this.store_map.has(schedule_name)) {
      throw new Errors.ValidationError(`Schedule isn't in the store [${schedule_name}]`);
    }
    return this.store_map.delete(schedule_name);
  }

  count() {
    return this.store_map.size;
  }

  names() {
    return Array.from(this.store_map.keys());
  }

  // Take a group, move it in the hash
  // Move it in the order array
  // Change it's internal name

  update_schedule_name(previous_name, new_name) {
    //TODO
    return false;
  }

  has_schedule(schedule_name) {
    return this.store_map.has(schedule_name);
  }

  // Convert the groups to yaml
  to_yaml_obj(options) {
    if (options == null) {
      options = {};
    }
    const obj = [];

    this.store_map.forEach((schedule, schedule_name) => obj.push(schedule.to_yaml_obj()));
    return obj;
  }
}

module.exports = { Schedules };
