//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:model:event_archive');

// npm modules
const mongoose = require('mongoose');
const moment = require('moment');
const Promise = require('bluebird');

// oa modules
const { SocketIO } = require('../../lib/socketio');

// ## EventArchive

// Archive of cleared or deleted events

const EventArchiveSchema = new mongoose.Schema({
  // Time the activity took place
  expire: {
    type: Date,
    default() {
      return moment().add(24, 'hours').toDate();
    },
    required: true,
    index: {
      expireAfterSeconds: 0,
    },
  },

  // The archived event
  event: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // Category/grouping of activity
  operation: {
    type: String,
    required: true,
  },
});

// Model promisifcation and export
const EventArchive = mongoose.model('EventArchive', EventArchiveSchema);
Promise.promisifyAll(EventArchive);
Promise.promisifyAll(EventArchive.prototype);
Promise.promisifyAll(EventArchive.collection);
module.exports.EventArchive = EventArchive;
