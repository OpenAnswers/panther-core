/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var util = require('util');
var inspect = util.inspect;
var ObjectId = require('mongoose').Types.ObjectId;

function get(id, fn) {
  if (users[id]) {
    fn(null, users[id]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function oNotAuthorised(msg) {
  logger.debug('f() NotAuthorised');
  this.name = 'NotAuthorised';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}

module.exports = {
  secure: true,

  index: function (req, res, next) {
    logger.warn('attempt to access index on timeline');
    res.send({ success: false });
  },

  // /alerts/:id
  show: function (req, res, next) {
    Alerts.findOne({ _id: req.params.id }, function (err, lert) {
      if (err) {
        logger.error(err);
        return res.send({ success: false });
      }
      if (!lert) return res.send({ success: false });

      AlertOccurences.findOne({ identifier: lert.identifier }, function (err, data) {
        if (err) return res.send({ success: false });

        var spoof_data = [
          { name: 'd1', data1: 1, data2: 2, data3: 3 },
          { name: 'd2', data1: 2, data2: 4, data3: 1 },
          { name: 'd3', data1: 1, data2: 3, data3: 6 },
        ];

        var current_timestamps = data.current.map(function (d) {
          return d.ts;
        });

        res.send({ success: true, data: spoof_data });
      });
    });
  },
};
