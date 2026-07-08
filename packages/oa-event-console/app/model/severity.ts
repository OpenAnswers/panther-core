//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:model:severity');

// npm modules
const mongoose = require('mongoose');
const Promise = require('bluebird');

// # SeveritySchema

// This is the severity schema. It stores the list of severities for the system

const SeveritySchema = new mongoose.Schema({
  // The integer value for the Severity
  // 0 being the lowest
  value: {
    type: Number,
  },

  // A text label for the severity
  label: {
    type: String,
  },

  // A bacground hex RGB colour
  background: {
    type: String,
  },

  // A foreground hex RGB colour
  foreground: {
    type: String,
  },

  // OAMon legacy
  system: {
    type: Boolean,
    default: false,
  },
});

// Just get the labels and values
SeveritySchema.statics.getLabels = function () {
  return this.find({ system: true }).select({ value: 1, label: 1 }).sort({ value: -1 }).exec();
};

// Get the label, value and colour
SeveritySchema.statics.getSeveritiesWithId = function () {
  return this.find({ system: true }).select({ _id: 1, value: 1, label: 1, background: 1 }).sort({ value: -1 }).exec();
};

// Export and Promisify the model
const Severity = mongoose.model('Severity', SeveritySchema);
//Promise.promisifyAll Severity
//Promise.promisifyAll Severity.prototype
module.exports.Severity = Severity;
