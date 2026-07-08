//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Inventory Schema

// ### Modules

// Logging
const { logger, debug } = require('oa-logging')('oa:event:model:inventory');

// Npm modules
const mongoose = require('mongoose');
const moment = require('moment');
const Promise = require('bluebird');

// OA modules
const { SocketIO } = require('../../lib/socketio');

// ------------------
// ## Schema

// Activity
const InventorySchema = new mongoose.Schema({
  // Time the activity took place
  last_seen: {
    type: Date,
    default() {
      return moment().toDate();
    },
    required: true,
  },

  // The username associated with the activity
  node: {
    type: String,
    required: true,
  },
});

// ----------------

// ## Events

// Ensure we have the current date attached
InventorySchema.pre('save', function (next) {
  if (!this.last_seen) {
    this.last_seen = moment().toDate();
  }
  return next();
});

// Propogate activity out to any users that are listening
// NOTE: this will only work on a document.remove() and not Model.remove()
InventorySchema.post('remove', function (doc) {
  if (SocketIO.io?.to) {
    return SocketIO.io.to('inventory').emit('deleted', doc);
  }
});

InventorySchema.post('deleteMany', function (doc) {
  debug('POST deleteMany', doc);
  if (SocketIO.io?.to) {
    return SocketIO.io.to('inventory').emit('inventory::deleted', { count: doc.n });
  }
});

// ### Export
// Model promisifcation and export
const Inventory = mongoose.model('Inventory', InventorySchema);
module.exports.Inventory = Inventory;
