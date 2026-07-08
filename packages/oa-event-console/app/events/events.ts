//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:events:events');

// node modules
const util = require('util');

// npm modules
const Promise = require('bluebird');
if (process.env.NODE_ENV === 'development') {
  Promise.longStackTraces();
}

// OA modules
const lib_path = '../../lib';
const { Path } = require(lib_path + '/path');
const { SocketIO } = require(lib_path + '/socketio');
let { MongoPollers } = require(lib_path + '/mongopollers');
const { server_event } = require(lib_path + '/eventemitter');
const { _, objhash, throw_error } = require('oa-helpers');

const Errors = require(lib_path + '/errors');

const config = require(lib_path + '/config').get_instance();

// ### Event 'oa::events::deleted'

// Event to emit when an event is deleted

server_event.on(
  'oa::events::deleted',
  (
    msg // send deletes out to users
  ) =>
    SocketIO.io.emit('deletes', {
      data: msg.ids,
      source: 'oa::events::deleted',
    })
);

server_event.on('oa::events::deleted::all', msg =>
  SocketIO.io.emit('deletes-all', {
    data: [],
    source: 'oa::events::deleted::all',
  })
);

// ### Event 'oa::events::updated'

server_event.on('oa::events::updated', function (msg) {
  // Trigger the view/pollers list os current id's message to go out
  // If it hasn't been sent recently

  // circular deps - socketio, mongopoller, evsocket =/
  ({ MongoPollers } = require(lib_path + '/mongopollers'));

  MongoPollers.emit_current_ids().then(function (pollResults) {
    debug('event oa::events::updated emit_current_ids', msg, pollResults);
    return true;
  });

  if (msg && msg.type && msg.type === 'clear') {
    // and it is 0 # which is clear
    return setTimeout(function () {
      const res = MongoPollers.emit_current_ids({ type: msg.type });
      return debug('event timeout oa::events::updated emit_current_ids', msg, res);
    }, 21000);
  }
});

// send updates out to users
// SocketIO.io.emit 'updates',
//   type: 'updates'
//   data: msg.ids
//   source: 'oa::events::updated'
