/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

Filters = require(__dirname + '/../models/filter');

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

  /*
   * note, req.is only seems to be in the trunk git version of express
   * simply installing with "npm install express" will not, at present
   * get you a fully working express install
   *
   * solution:
   * $ git clone https://github.com/visionmedia/express.git
   * $ npm install ./express/
   */

  index: function (req, res, next) {
    logger.warn('attempt to access index on details');
    res.send({ success: false });
  },

  // /alerts/:id
  show: function (req, res, next) {
    Alerts.findOne({ _id: req.params.id }, function (err, lert) {
      if (err) {
        logger.error(err);
        return res.send({ success: false });
      }

      res.send({ success: true, data: lert.toDetails().notes });
    });
  },

  create: function (req, res, next) {
    logger.info('CREATING a NOTE ' + inspect(req.query));

    Alerts.update(
      { _id: req.query.id },
      { $push: { notes: { msg: req.body.msg, user: req.session.user, timestamp: new Date() } } },
      { multi: true },
      function (err) {
        res.send({ success: !err });
      }
    );
  },
};
