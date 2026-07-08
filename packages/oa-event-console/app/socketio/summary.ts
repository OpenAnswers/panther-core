//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:summary');
const { objhash, _ } = require('oa-helpers');

const { SocketIO } = require('../../lib/socketio');

// Client joining the activities stream

SocketIO.route('summary::join_room', function (socket, data, client_cb) {
  debug('JOINED summary room');

  const summaryPoller = require('../../lib/mongopollers').MongoSummaryPollers;

  // FIXME
  // reused MongoPoller and it requires a hashing method
  // TODO refactor mongopollers to use a base class

  const options = { filter: 'summary' };
  const filter_hash = objhash(options);
  summaryPoller.fetch_id_and_start(filter_hash, options);
  // /FIXME

  socket.join('summary');
  return socket.emit('summary:populate', {});
});
//  socket.join 'inventory'
//  socket.emit 'inventory::populate', {lop:1}
