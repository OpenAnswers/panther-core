/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var externalClassSchema = new Schema({
  class_name: { type: String },
  trigger_name: { type: String },
  command: { type: String },
  label: { type: String },
});

externalClassSchema.static('findByTriggerName', function (tname) {
  return this.find({ trigger_name: tname });
});

externalClassSchema.static('findByClassName', function (cname) {
  return this.find({ class_name: cname });
});

mongoose.model('ExternalClass', externalClassSchema);
module.exports = mongoose.model('ExternalClass');
