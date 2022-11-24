/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var async = require('async');
var fs = require('fs');
var path = require('path');
var inspect = require('util').inspect;

var DEFAULT_ACTION_NAME = 'default_action';

var Trigger = (module.exports = function Trigger(filepath) {
  this.filedir = path.dirname(filepath);
  this.filename = path.basename(filepath);

  this.definition = require(filepath);
});

Trigger.prototype.name = function () {
  var self = this;
  return self.definition.name || self.filename;
};

Trigger.prototype.actionName = function () {
  var self = this;
  return self.definition.action || DEFAULT_ACTION_NAME;
};

Trigger.prototype.start = function (action, cb) {
  var self = this;

  logger.debug('trigger ' + self.name() + ' starting');
  debug('trigger and action', self.name(), action);

  if (this.definition.type == 'periodic') {
    this.timer_id = setInterval(function () {
      self.fire(action);
    }, self.definition.sample * 1000);
  }

  cb(null);
};

Trigger.prototype.fire = function (action) {
  var self = this;
  logger.info('trigger ' + self.name() + ' running....');

  if (self.definition.each) {
    Alerts.find(self.definition.query, function (err, results) {
      if (err) return logger.error(err);

      async.map(
        results,
        function (item, cb) {
          cb(null, item.toClient());
        },
        function (err, lerts) {
          logger.debug('trigger firing foreach');
          async.forEach(
            lerts,
            function (lert, cb) {
              debug('Executing action for _id: ', lert._id);
              action.execute(lert, cb);
            },
            function (err, action_results) {
              debug('action results: ', arguments);
            }
          );
        }
      );
    });
  } else {
    Alerts.find(self.definition.query, ['_id'], function (err, id_results) {
      if (err) return logger.error(err);

      logger.debug('ids objs: ' + inspect(id_results));

      var ids = id_results.map(function (item) {
        return item._id;
      });

      if (ids.length > 0) {
        logger.debug('ids: ' + inspect(ids));
        action.execute(ids);
      }
    });
  }
};
