//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:route:console');

// npm modules
const Promise = require('bluebird');
const router = require('express').Router();
const Colour = require('color');
const bodyParser = require('body-parser');
const _ = require('lodash');

// oa modules
const { Mongoose } = require('../../lib/mongoose');
const { User } = require('../model/user');
const { Filters } = require('../model/filters');
const { Severity } = require('../model/severity');
const { Field } = require('../../lib/field');

const config = require('../../lib/config').get_instance();

// Protect this route
router.use(function (req, res, next) {
  if (req.user != null) {
    return next();
  } else {
    logger.error('Client tried to access console without auth session', req.sessionID);
    return res.redirect(`/?redirectUrl=${req.originalUrl}`);
  }
});

// Allow JSON posts
router.use(bodyParser.json());

// Deal with a mongo id param
router.param('id', function (req, res, next, id) {
  let oid;
  debug('found a param id', id);

  if (!(oid = Mongoose.recid_to_objectid_false(id))) {
    return next({ error: 400 });
  }

  req.event_object_id = oid;
  return next();
});

// Load the console
router.get('/', function (req, res, next) {
  Severity.find({}, (err, docs) => debug('sev docs', docs));

  // Promise all the queries we need for the setup of the console.
  // Don't return the bluebird promise to Express — it trips the router's
  // "Promise-like are deprecated" warning. The .catch below forwards errors.
  Promise.props({
    users: User.getUserList(),

    filters: Filters.find({ user: req.user.username }).sort({ name: 1 }).select('_id name default').exec(),

    default_filter: Filters.findOne({ user: req.user.username, default: true }, { _id: 1, name: 1 }),

    severities: Severity.getSeveritiesWithId(),
  })
    .then(function (results) {
      debug('results', results);
      return res.render('console', {
        title: 'Console',
        user: req.user,
        users: results.users,
        filters: results.filters,
        default_filter: results.default_filter,
        severities: results.severities,
        w2_columns: Field.w2ColumnDefinition,
        w2_all_columns: Field.w2BuildColumnDefinition(),
        columns: Field.labels(),
        Colour,
        _,
      });
    })

    .catch(function (err) {
      logger.error('Failed to run queries for console', err);
      return next(err);
    });
});

// Not needed

/**
 * @deprecated
 */
//router.get '/event-detail/:id', ( req, res ) ->
//
//  groups = config.rules.set.groups.store_order
//
//  debug "alertoccurences _id [%s]", req.event_object_id
//
//  Promise.props
//
//    doc: Mongoose.alertoccurrences.findOneAsync _id: req.event_object_id
//
//    sev_counts: Mongoose.alerts.aggregateAsync
//      $group:
//        _id: "$severity"
//        total: { $sum: 1 }
//    , { $sort: { _id: 1 } }
//
//    sev_counts_group: Mongoose.alerts.aggregateAsync
//      $group:
//        _id:
//          group: "$group"
//          severity: "$severity"
//        total: { $sum: 1 }
//    , { $sort: { _id: 1 } }
//
//    severities:
//      Severity.findAsync { system: true },
//        { _id: 0, value: 1, label: 1, background: 1 }
//
//  .then ( results ) ->
//    unless results.doc
//      results.doc = {}
//      results.doc.summary = 'missing'
//
//    results.groups = groups
//    debug 'sev results', results.sev_counts, results.sev_counts_group
//
//    res.render 'console-event-detail-test',
//      event: results.doc
//      results: results

// Severity css
router.get('/severities.css', (req, res, next) =>
  Severity.find({ system: true }, { _id: 0, value: 1, label: 1, background: 1 })
    .then(function (docs) {
      debug('sevs', docs);
      res.set('Content-Type', 'text/css');
      return res.render('severities-css', {
        severities: docs,
        Colour,
      });
    })
    .catch(err => next(err))
);

module.exports = router;
