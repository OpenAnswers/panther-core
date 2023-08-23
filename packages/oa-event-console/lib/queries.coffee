
#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:queries')

# node modules
util              = require 'util'

# npm modules
Promise           = require 'bluebird'
moment            = require 'moment'
{ Mongoose }    = require './mongoose'
{ Severity }      = require '../app/model/severity'
{ Activities }    = require './activities'
{ Severity }      = require '../app/model/severity'
{ EventArchive }  = require '../app/model/event_archive'
{ User }          = require '../app/model/user'
{ Filters }       = require '../app/model/filters'

{ server_event }  = require "./eventemitter"
{ _ }             = require 'oa-helpers'

class Stuff
  constructor: ()->
    console.log 'lop', Mongoose



@promisedFilterSummary = ( )->
  promise = Promise.props
    sev_counts: Mongoose.alerts.aggregate([
      $group:
        _id: "$severity"
        total: { $sum: 1 }
    ]).sort( {_id: 1 } ).toArray()

    sev_counts_group: Mongoose.alerts.aggregate([
      $group:
        _id:
          group: "$group"
          severity: "$severity"
        total: { $sum: 1 }
    ]).sort( {_id:1}).toArray()

    severities: 
      Severity.getSeveritiesWithId()
  promise

module.exports.promisedFilterSummary = @promisedFilterSummary