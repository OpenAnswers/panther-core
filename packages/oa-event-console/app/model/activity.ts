//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Activity Schema

// Activities are used as a log for anything happening in the system so
// users can have a view of that later.
// They can be queried by an activity `category` and activity `type`

// ### Modules

// Logging
const { logger, debug } = require('oa-logging')('oa:event:model:activity');

// Npm modules
const mongoose = require('mongoose');
const moment = require('moment');
const Promise = require('bluebird');

// OA modules
const { SocketIO } = require('../../lib/socketio');

// ------------------
// ## Schema

// Activity
const ActivitySchema = new mongoose.Schema({
  // Time the activity took place
  time: {
    type: Date,
    default() {
      return moment().toDate();
    },
    required: false,
  },

  // The username associated with the activity
  username: {
    type: String,
    required: true,
  },

  // Category/grouping of activity
  category: {
    type: String,
    required: true,
  },

  // Type of activity in a category/group
  type: {
    type: String,
    required: true,
  },

  // Any data associated with the activity
  // Usually includes ids
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },

  // A precompiled message for the user
  message: {
    // In text format
    text: {
      type: String,
    },

    // In html format
    html: {
      type: String,
    },

    markdown: {
      type: String,
    },
  },
});

// ----------------

// ## Events

// Ensure we have the current date attached
ActivitySchema.pre('save', function (next) {
  if (!this.time) {
    this.time = moment().toDate();
  }
  return next();
});

// Propogate activity out to any users that are listening
ActivitySchema.post('save', function (doc) {
  if (SocketIO.io?.to) {
    return SocketIO.io.to('activities').emit('activity', doc);
  }
});

// ### Export
// Model promisifcation and export
const Activity = mongoose.model('Activity', ActivitySchema);
module.exports.Activity = Activity;
