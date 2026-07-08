/*
 * Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RuleMatchSchema = new Schema({
  rule_uuid: { type: String, index: true, unique: true },
  tally: { type: Number },
});

exports.Model = mongoose.model('RuleMatch', RuleMatchSchema);
exports.Schema = RuleMatchSchema;
