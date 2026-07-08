//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:model:integration');

// npm modules
const mongoose = require('mongoose');
const moment = require('moment');
const Promise: any = require('bluebird');

// oa modules
const config = require('../../lib/config').get_instance();

// ## Integration

// A log for Integration runs so users can have a view of that later.

const IntegrationSchema = new mongoose.Schema({
  created: {
    type: Date,
    required: true,
    default() {
      return moment().toDate();
    },
  },

  modified: {
    type: Date,
    required: true,
    default() {
      return moment().toDate();
    },
  },

  type: {
    type: String,
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  definition: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
});

// Model promisifcation and export
const Integration = mongoose.model('Integration', IntegrationSchema);
Promise.promisifyAll(Integration);
Promise.promisifyAll(Integration.prototype);
module.exports.Integration = Integration;
