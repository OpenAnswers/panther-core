//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:view');

// npm modules
const Promise = require('bluebird');
const moment = require('moment');
const mongoose = require('mongoose');
const { ValidationError } = mongoose.Error;
const { ValidatorError } = mongoose.Error;

// oa modules
const { random_string } = require('oa-helpers');
const { SocketIO } = require('../../lib/socketio');
const Errors = require('../../lib/errors');

const { Filters } = require('../model/filters');

// ### verify_socket_data = ( data, user )->
// Generic validation function for update and insert to use
// Using Promise.method so error handling is nice and easy for the
// whole update/insert transaction
function validate_view_data(data, user) {
  if (data == null) {
    throw new Errors.ValidationError('No data in message');
  }
  if (data.view == null) {
    throw new Errors.ValidationError('No "view" in message data');
  }

  const { view } = data;
  view.user = user;

  if (view.user == null) {
    throw new Errors.ValidationError('No "user" in view data');
  }
  if (view.name == null) {
    throw new Errors.ValidationError('No "name" in view data');
  }
  if (view.field == null) {
    throw new Errors.ValidationError('No "field" in view data');
  }
  if (view.value == null) {
    throw new Errors.ValidationError('No "value" in view data');
  }
  if (view.name === '') {
    throw new Errors.ValidationError('Name must have value');
  }
  if (!view.name.match(/^\w/)) {
    throw new Errors.ValidationError(`Name must start with an standard character [${view.name}]`);
  }
  if (view.name.length > 30) {
    throw new Errors.ValidationError(`Name must be less than 30 character [${view.name}]`);
  }
  if (!view.name.match(/^[\w\s\-!\?]+$/)) {
    throw new Errors.ValidationError(`Name can contain spaces or simple characters [${view.name}]`);
  }
  if (view.field === '' && view.value !== '') {
    throw new Errors.ValidationError('Value without field');
  }

  return view;
}

function coerce_view_value(view) {
  // Plain numbers become numbers. Use "" to keep as string.
  if (view.value !== '' && !isNaN(view.value)) {
    debug('number value', view.value);
    view.value = +view.value;
  }

  // /escaped/ strings become RegExp
  let re_match = /^\/(.*)\/$/.exec(view.value);
  if (re_match) {
    debug('regex value', view.value, re_match[1]);
    view.value = new RegExp(re_match[1]);
  }

  // "quoted" strings become plain strings
  re_match = /^"(.*)"$/.exec(view.value);
  if (re_match) {
    debug('string value', view.value);
    view.value = `${re_match[1]}`;
  }

  // boolean-typed columns
  if (['acknowledged'].includes(view.field)) {
    view.value = view.value === 'true' ? true : false;
  }

  view.f = {};
  if (view.field !== '') {
    debug('setting f', view.f);
    view.f[view.field] = view.value;
    debug('set f', view.f);
  }
}

const verify_socket_data = Promise.method(function (data, user) {
  const view = validate_view_data(data, user);
  coerce_view_value(view);
  return view;
});

// Read all
SocketIO.route('views::read', function (socket, data, socket_cb) {
  debug('got views::read', data);
  return Filters.find({ user: socket.ev.user() })
    .sort({ name: 'asc' })
    .then(function (response) {
      debug('sending views::read response', response);
      return socket_cb(response);
    });
});
// users: Filter.all

// Read
SocketIO.route('view::read', function (socket, data, socket_cb) {
  debug('got view::read', data);
  return Filters.read_one(data.view).then(function (response) {
    debug('sending view::read response', response);
    return socket_cb(response);
  });
});

// Create
SocketIO.route('view::create', function (socket, data, socket_cb) {
  debug('view::create', socket.id, data);

  return verify_socket_data(data, socket.ev.user())
    .then(function (view) {
      logger.info(
        'New view for [%s] name [%s] [%s] [%s] [%j]',
        view.user,
        view.name,
        view.field,
        view.value,
        view.f,
        ''
      );

      // FIXME uses native mongodb collection
      // FIXME remember to disable PromisifyAll for mongodb
      return Filters.collection.insert(view);
    })
    .then(function (response) {
      socket_cb(response);
      debug('view::create inserted:', response.result);
      return SocketIO.io.emit('views::updated');
    })
    .catch(Errors.BadRequestError, Errors.ValidationError, ValidationError, function (err) {
      logger.error('View create failed', data.view, err.message, err);
      return socket.ev.error(err.message);
    });
});

// Update
SocketIO.route('view::update', function (socket, data, socket_cb) {
  debug('view::update', socket.id, data);
  data.view.user = socket.ev.user();

  return verify_socket_data(data, socket.ev.user())
    .then(function (view) {
      logger.info(
        'Update view for [%s] name [%s] [%j] [%s] [%s]',
        view.user,
        view.name,
        view.f,
        view.field,
        view.value,
        ''
      );
      return Filters.update_data(view);
    })
    .then(function (response) {
      debug('update response', response);
      socket_cb(response);
      return SocketIO.io.emit('views::updated');
    })
    .catch(Errors.ValidationError, ValidationError, function (err) {
      logger.error('View update failed', data, err.message, err);
      return socket.ev.error(err.message);
    })
    .finally(() => debug('wtf?'));
});

// Delete
SocketIO.route('view::delete', function (socket, data, socket_cb) {
  logger.info('Deleting view', socket.id, data);

  return Filters.find({ _id: data._id }).then(function (response) {
    if (response.length > 0 && response[0].default) {
      throw 'Cannot delete default view';
    }

    return Filters.deleteOne({ _id: data._id })
      .then(function (deletion_response) {
        const deleted_label = response?.[0]?.name || data._id;
        socket.ev.info(`Deleted view ${deleted_label}`);
        socket_cb(response);
        return SocketIO.io.emit('views::updated');
      })
      .catch(Errors.ValidationError, ValidationError, function (err) {
        logger.error('View delete failed', data, err.message, err);
        return socket.ev.exception(err.name, err.message);
      });
  });
});

// Set a default
SocketIO.route('view::set_default', function (socket, id, socket_cb) {
  logger.info('Setting default view', socket.id, socket.ev.user(), id);

  return Filters.set_default(socket.ev.user(), id)
    .then(function (response) {
      socket.ev.info('Default view set');
      socket_cb('Default view set');
      return SocketIO.io.emit('views::updated');
    })
    .catch(Errors.ValidationError, function (err) {
      logger.error('View set_default failed', id, err.message, err);
      return socket.ev.exception(err.name, err.message);
    });
});
