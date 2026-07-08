
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const {logger, debug}   = require('oa-logging')('oa:event:queries');

// node modules
const util              = require('util');

// npm modules
const Promise: any      = require('bluebird');
const moment            = require('moment');
const { Mongoose }    = require('./mongoose');
const { Severity }      = require('../app/model/severity');
const { Activities }    = require('./activities');
const { EventArchive }  = require('../app/model/event_archive');
const { User }          = require('../app/model/user');
const { Filters }       = require('../app/model/filters');

const { server_event }  = require("./eventemitter");
const { _ }             = require('oa-helpers');

const promisedFilterSummary = function( ){
  const promise = Promise.props({
    sev_counts: Mongoose.alerts.aggregate([{
      $group: {
        _id: "$severity",
        total: { $sum: 1 }
      }
    }
    ]).sort( {_id: 1 } ).toArray(),

    sev_counts_group: Mongoose.alerts.aggregate([{
      $group: {
        _id: {
          group: "$group",
          severity: "$severity"
        },
        total: { $sum: 1 }
      }
    }
    ]).sort( {_id:1}).toArray(),

    severities:
      Severity.getSeveritiesWithId()
  });
  return promise;
};

module.exports.promisedFilterSummary = promisedFilterSummary;