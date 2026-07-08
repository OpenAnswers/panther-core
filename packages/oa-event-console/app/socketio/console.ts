//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:console');

// npm modules
const moment = require('moment');

// oa modules
const { SocketIO } = require('../../lib/socketio');
const { Errors } = require('../../lib/errors');
const { Mongoose } = require('../../lib/mongoose');
const { Filters } = require('../model/filters');
const { Severity } = require('../model/severity');
const { _ } = require('oa-helpers');
const config = require('../../lib/config').get_instance();

// ###### console::set_filter

SocketIO.route('console::set_view', function (socket, data, client_cb) {
  let id;
  logger.info(socket.id, socket.ev.user(), 'setting their filter to', data.id);
  const evs = socket.ev;

  if (!(id = Mongoose.recid_to_objectid_false(data.id))) {
    evs.warn('Filter id not valid', id);
    return false;
  }

  return Filters.findOne({ user: evs.user(), _id: id })
    .then(function (doc) {
      if (doc == null) {
        evs.warn('No default filter found, using all');
        evs.event_filter({});
        if (_.isFunction(client_cb)) {
          return client_cb();
        }
      } else {
        if (_.isArray(doc.f)) {
          logger.warn('Filter id [%s] is an array, fixing', data.id);
          evs.event_filter({});
        } else {
          evs.event_filter(doc.f);
        }
        if (_.isFunction(client_cb)) {
          return client_cb();
        }
      }
    })
    .catch(function (err) {
      throw err;
    });
});

// ###### console::set_group

SocketIO.route('console::set_group', function (socket, data, client_cb) {
  logger.info(socket.id, socket.ev.user(), 'Setting their group to', data.group);
  const evs = socket.ev;

  if (config.rules.set.groups.has_group(data.group)) {
    debug('evs group_filter', data.group);
    evs.event_group(data.group);
    if (_.isFunction(client_cb)) {
      return client_cb(null, data);
    }
  } else {
    let group_name = 'All';
    if (data.group === 'No Group') {
      group_name = data.group;
    } else {
      if (data.group !== 'All') {
        evs.warn(`Group not valid [${data.group}] setting to [All]`);
      }
    }

    debug('set_group group_filter', group_name);
    evs.event_group(group_name);
    debug('set_group callback', client_cb);
    if (_.isFunction(client_cb)) {
      return client_cb();
    }
  }
});

// ###### console::set_severity

SocketIO.route('console::set_severity', function (socket, data, client_cb) {
  let query;
  logger.info(socket.id, socket.ev.user(), 'Setting their severity to', data.severity);
  const evs = socket.ev;

  if (data.severity === 'All') {
    evs.event_severity('All');
    if (_.isFunction(client_cb)) {
      client_cb();
    }
    return;
  }

  if (_.isNumber(data.severity.match) || data.severity.match(/^\d+$/)) {
    query = { value: data.severity };
  } else {
    query = { label: data.severity };
  }

  return Severity.findOne(query)
    .then(function (doc) {
      if (doc == null) {
        evs.warn('No severity found, using All');
        evs.event_severity('All');
        if (_.isFunction(client_cb)) {
          return client_cb();
        }
      } else {
        evs.event_severity(doc.value);
        if (_.isFunction(client_cb)) {
          return client_cb();
        }
      }
    })
    .catch(function (err) {
      client_cb(`Error: ${err}`);
      throw err;
    });
});
