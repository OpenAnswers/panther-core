/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var inspect = require('util').inspect;

var ServerConfig = require('./server_config');
var server_config = new ServerConfig.ServerConfig();
let expireTime = server_config.ExpireOccurrences();

// var Occurrence = new Schema({
//   ts: { type: Number }
// });

// var ArchiveOccurrence = new Schema({
//   action:       { type: String, default: 'deleted' },
//   archived_at:  { type: Number },
//   archive:      [ Occurence ]
// });

var AlertOccurrenceSchema = new Schema({
  identifier: { type: String, index: true },
  current: [Date],
  // alertoccurences are set to expire
  updated_at: { type: Date, expires: expireTime, default: Date.now },
  // previous:     [ ArchiveOccurence ]
});

// This is a nice idea, but it needs to archive to a seperate collection

AlertOccurrenceSchema.static('archive', function (conditions, cb) {
  this.findOne(conditions, function (err, data) {
    if (err) return cb(err);

    if (!data) {
      logger.info('No archive data matching conditions: ' + inspect(conditions));
      return cb(err);
    }

    /*
     * move the current timestamps onto the end of the previous ones
     */

    var time_now = new Date();
    var arc = { archive: data.current, archived_at: time_now };
    data.previous.push(arc);
    data.current = [];

    debug('occurrence data insert', data);
    data.save(cb);
  });
});

exports.Model = mongoose.model('AlertOccurrence', AlertOccurrenceSchema);
exports.Schema = AlertOccurrenceSchema;
