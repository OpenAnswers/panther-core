//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:schedule');

// node modules
const path = require('path');

// npm modules
const moment = require('moment');

const Joi = require('@hapi/joi');

// oa modules
const { EventRules, Select, Schedule, Schedules } = require('oa-event-rules');
const { is_numeric, format_string, _ } = require('oa-helpers');

const { SocketIO } = require('../../lib/socketio');
const Errors = require('../../lib/errors');

const config = require('../../lib/config').get_instance();

const { schedule_update_days_schema, schedule_delete_schema } = require('../validations');

const schedule_lookup = function (request) {
  const name = request.name || '';

  const schedule = config.rules.set.schedules.get(name);

  return schedule;
};

const schedule_lookup_by_uuid = function (uuid) {
  let schedule;
  config.rules.set.schedules.store_map.forEach(function (sch) {
    if (sch.uuid === uuid) {
      return (schedule = sch);
    }
  });
  return schedule;
};

// return boolean
const schedule_delete_by_name = name => config.rules.set.schedules.store_map.delete(name);

const schedule_set = schedule => config.rules.set.schedules.add(schedule);

const schedules_save = function (schedule) {
  const event_rules = config.rules.server;
  if (schedule != null) {
    event_rules.schedules.add(schedule);
  }
  const rules_save_f = event_rules.save_yaml_async;
  return rules_save_f.apply(event_rules, [event_rules.path]);
};

// Rules save
// Save the in memory values back to file
SocketIO.route_return('schedules::save', function (socket, data, socket_cb) {
  if (!data) {
    throw new Errors.ValidationError('No data on save');
  }
  // TODO
  return socket_cb(null, {});
});

// Read all names
SocketIO.route('schedules::index', function (socket, data, socket_cb) {
  debug('got schedules::read', data);

  // TODO

  const schedule_names = config.rules.set.schedules.names();

  debug('schedule names: ' + schedule_names.join(','));
  return socket_cb(null, {
    status: 'success',
    data: schedule_names,
  });
});

SocketIO.route('schedules::read', function (socket, data, socket_cb) {
  const schedules_raw = config.rules.server.schedules.get_all();

  const schedules = schedules_raw.map(value => value.to_yaml_obj());

  return socket_cb(null, {
    status: 'success',
    data: schedules,
  });
});

// Create
SocketIO.route_return('schedule::create', function (socket, request) {
  debug('schedules::create', request.data);

  return Schedule.validate(request.data)
    .catch(function (err) {
      logger.error('Joi validation: ', err);
      throw new Errors.ValidationError('Schedule was incomplete');
    })
    .then(function (request_schedule) {
      logger.info('JOI validated schedule::create');

      const schedule = Schedule.generate(request.data);
      //Schedules.add schedule

      const event_rules = config.rules.server;

      event_rules.schedules.add(schedule);

      const rules_save_f = event_rules.save_yaml_async;

      return rules_save_f.apply(event_rules, [event_rules.path]);
    })
    .then(function (res) {
      let response;
      debug('saved Rules');

      SocketIO.io.emit('schedules::updated');

      return (response = {
        status: 'success',
        data: {
          created: true,
        },
      });
    });
});

// Read a single schedule
SocketIO.route('schedule::read', function (socket, request, socket_cb) {
  if (!request) {
    throw new Errors.ValidationError('No such request');
  }
  if (!request.name) {
    throw new Errors.ValidationError('No such name in request');
  }

  const schedule = schedule_lookup(request);
  if (!schedule) {
    throw new Errors.ValidationError('No such schedule name');
  }

  socket_cb(null, {
    status: 'success',
    data: schedule.to_yaml_obj(),
  });

  // TODO
  return true;
});

SocketIO.route_return('schedule::update::days', function (socket, request) {
  const { value, error } = schedule_update_days_schema.validate(request);

  if (error) {
    throw new Errors.ValidationError('Request invalid');
  }

  //  validation_promise = Joi.validate request, compiled_schedule_update_days
  //  validation_promise.then (result)->
  const schedule = schedule_lookup_by_uuid(value.uuid);
  schedule.dow_a = value.days;

  return schedules_save(schedule)
    .then(function (saved_result) {
      let data;
      logger.debug('saved schedule ', saved_result);
      return (data = { status: 'success' });
    })
    .catch(function (error) {
      logger.error('Validation failure ', error);
      throw new Errors.ValidationError('Request invalid');
    });
});

// Delete
SocketIO.route_return('schedule::delete', function (socket, request, socket_cb) {
  const { value, error } = schedule_delete_schema.validate(request);
  if (error) {
    throw new Errors.ValidationError('Invalid schedule::delete');
  }

  //  validation = Joi.validate request, compiled_schedule_delete
  //  validation.then (result) ->

  const schedule = schedule_lookup_by_uuid(value.uuid);
  if (!schedule) {
    throw new Errors.BadRequestError('Schedule no longer exists');
  }

  if (schedule.is_referenced()) {
    logger.error('Attempt to delete referenced schedule ' + value.uuid);
    throw new Errors.ValidationError('Schedule is still used by ' + schedule.ref_count + ' rule(s)');
  }

  // FIXME this might be tricky. deletes should only be permitted if no rule is using it
  // or deleteing the schedule deletes the rule.

  if (!schedule_delete_by_name(schedule.name)) {
    logger.error('No schedule named: ' + schedule.name);
    throw new Errors.ValidationError('Schedule could not be deleted');
  }

  const event_rules = config.rules.server;
  const rules_save_f = event_rules.save_yaml_async;
  return rules_save_f.apply(event_rules, [event_rules.path]).then(function (saved_rules) {
    let data;
    SocketIO.io.emit('schedules::updated');

    return (data = {
      status: 'success',
      deleted: value.uuid,
    });
  });
});
