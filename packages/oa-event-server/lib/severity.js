/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:server:alerts_loader');
var logger = logging.logger;
var debug = logging.debug;

var inspect = require('util').inspect;

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var async = require('async');

var SeveritySchema = new Schema({
  value: { type: Number },
  label: { type: String },
  background: { type: String },
  foreground: { type: String },
  system: { type: Boolean, default: false },
})
  .static('getLabelLookup', function (fn) {
    var q = this.find({ system: true });
    q.select({ value: 1, label: 1 });
    return q.exec(fn);
  })
  .static('getUsers', function (user, ucb) {
    var self = this;
    async.parallel(
      {
        system: function (cb) {
          var finder = self.find({ system: true });
          finder.sort('value');
          finder.exec(cb);
        },
        user: function (cb) {
          var finder = self.find({ system: false, owner: user });
          finder.sort('value');
          finder.exec(cb);
        },
      },
      function (err, results) {
        if (err) return ucb(err);

        var o = {};
        /*
         * merge the system default severity values with any the user has overridden
         */
        if (results.system.length > 0) {
          results.system.forEach(function (sev) {
            o[sev.value] = sev;
          });
        }
        if (results.user.length > 0) {
          results.user.forEach(function (sev) {
            o[sev.value] = sev;
          });
        }

        var sevs = [];
        for (var sev in o) {
          sevs.push(o[sev]);
        }
        logger.debug(
          'SEVS: ' +
            sevs
              .map(function (s) {
                return s.label + ':' + s.value;
              })
              .join(', ')
        );
        debug('SEVS', sevs);
        ucb(null, sevs);
      }
    );
  });

exports.Model = mongoose.model('severitys', SeveritySchema);
exports.Schema = SeveritySchema;
