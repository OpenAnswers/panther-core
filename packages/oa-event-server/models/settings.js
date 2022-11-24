/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var Bluebird = require('bluebird');
var Promise = Bluebird.Promise;

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
mongoose.Promise = Promise;

var settingsSchema = new Schema({
  key: { type: String },
  value: { type: String },
  owner: { type: String },
});

settingsSchema.static('findByKey', function (key) {
  let y = this.findOne({ key: key }, { value: 1 });
  return y.exec();
});

settingsSchema.static('tracking', user => {
  let y = this.findOne({ key: 'tracking', owner: user });
  return y.exec();
});

var Settings = mongoose.model('Settings', settingsSchema);
Promise.promisifyAll(Settings);
module.exports = Settings;
