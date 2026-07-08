//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:route:api');

// npm modules
const bodyParser = require('body-parser');

// oa modules
const Errors = require('oa-errors');
const config = require('../../../lib/config').get_instance();
const { Mongoose } = require('../../../lib/mongoose');
const { _ } = require('oa-helpers');

const router = require('express').Router();

router.use(bodyParser.json());

//Deal with a mongo id param

router.param('mongo_id', function (req, res, next, mongo_id) {
  let oid;
  debug('found a param mongo_id', mongo_id);

  if (!(oid = Mongoose.recid_to_objectid_false(mongo_id))) {
    logger.error('failed to mongo_id', mongo_id);
    const err = new Errors.HttpError400('Invalid event id');
    return next(err);
  }

  req.object_id = oid;
  return next();
});

// Read an event from the db
router.get('/read/:mongo_id', (req, res, next) =>
  Mongoose.alerts
    .findOne({ _id: req.object_id })
    .then(function (doc) {
      if (!doc) {
        return next(new Errors.HttpError404());
      } else {
        doc.id = doc._id;
        delete doc._id;
        return res.json({ event: doc });
      }
    })
    .catch(err => next(err))
);

// Delete an event from the db
router.delete('/delete/:mongo_id', function (req, res, next) {
  debug('removing id', req.object_id);
  return Mongoose.alerts
    .deleteOne({ _id: req.object_id })
    .then(function (doc) {
      debug('remove doc result', doc?.result);
      if (!doc) {
        throw new Errors.HttpError404();
      }

      if (!doc.acknowledged || doc.deletedCount !== 1) {
        throw new Errors.QueryError(doc);
      }

      return res.json({ result: doc });
    })
    .catch(function (err) {
      debug('remove error', err);
      return next(err);
    });
});

router.use(function (error, req, res, next) {
  const code = error.code ? error.code : 500;
  if (error.code === 500) {
    logger.error(error.message, error.stack);
  }
  return res.status(code).json({ message: error.message });
});

module.exports = router;
