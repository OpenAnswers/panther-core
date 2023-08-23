/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ServerConfig = require('./server_config');
var server_config = new ServerConfig.ServerConfig();
let expireTime = server_config.ExpireMatches();

var AlertMatchSchema = new Schema({
  identifier: { type: String, index: true, unique: true },
  rule_uuids: [String],
  updated_at: { type: Date, expires: expireTime, default: Date.now },
});

exports.Model = mongoose.model('AlertMatch', AlertMatchSchema);
exports.Schema = AlertMatchSchema;
