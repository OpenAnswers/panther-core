# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{ logger, debug } = require('oa-logging')('oa:event:route:console')

# npm modules
Promise    = require 'bluebird'
router     = require('express').Router()
Colour     = require 'color'
bodyParser = require 'body-parser'
_          = require 'lodash'

# oa modules
{ Mongoose } = require '../../lib/mongoose'
{ User }     = require '../model/user'
{ Filters }  = require '../model/filters'
{ Severity } = require '../model/severity'
{ Field }    = require '../../lib/field'

config     = require('../../lib/config').get_instance()


# Protect this route
router.use (req, res, next) ->
  if req.user?
    next()
  else
    logger.error 'Client tried to access console without auth session', req.sessionID
    res.redirect "/?redirectUrl=#{req.originalUrl}"


# Allow JSON posts
router.use bodyParser.json()


# Deal with a mongo id param
router.param 'id', ( req, res, next, id ) ->

  debug 'found a param id', id

  unless oid = Mongoose.recid_to_objectid_false id
    return next error: 400

  req.event_object_id = oid
  next()


# Load the console
router.get '/', ( req, res, next ) ->
  
  Severity.find {}, ( err, docs ) ->
    debug 'sev docs', docs

  # Promise all the queries we need for the setup of the console
  Promise.props
    users:
      User.getUserList()

    filters:
      Filters.find({ user: req.user.username })
      .sort({ name: 1 })
      .select( '_id name default' )
      .exec()

    default_filter:
      Filters.findOne { user: req.user.username, default: true },
        { _id: 1, name: 1 }

    severities:
      Severity.getSeveritiesWithId()

  # Now render it
  .then ( results ) ->
    debug 'results', results
    res.render 'console', {
      title: 'Console'
      user: req.user
      users: results.users
      filters: results.filters
      default_filter: results.default_filter
      severities: results.severities
      w2_columns: Field.w2ColumnDefinition
      w2_all_columns: Field.w2BuildColumnDefinition()
      columns: Field.labels()
      Colour: Colour
      _: _
    }

  .catch ( err ) ->
    logger.error 'Failed to run queries for console', err
    next err

# Not needed

###*
# @deprecated
###
#router.get '/event-detail/:id', ( req, res ) ->
#
#  groups = config.rules.set.groups.store_order
#
#  debug "alertoccurences _id [%s]", req.event_object_id
#
#  Promise.props
#
#    doc: Mongoose.alertoccurrences.findOneAsync _id: req.event_object_id
#
#    sev_counts: Mongoose.alerts.aggregateAsync
#      $group:
#        _id: "$severity"
#        total: { $sum: 1 }
#    , { $sort: { _id: 1 } }
#
#    sev_counts_group: Mongoose.alerts.aggregateAsync
#      $group:
#        _id:
#          group: "$group"
#          severity: "$severity"
#        total: { $sum: 1 }
#    , { $sort: { _id: 1 } }
#
#    severities:
#      Severity.findAsync { system: true },
#        { _id: 0, value: 1, label: 1, background: 1 }
#
#  .then ( results ) ->
#    unless results.doc
#      results.doc = {}
#      results.doc.summary = 'missing'
#
#    results.groups = groups
#    debug 'sev results', results.sev_counts, results.sev_counts_group
#
#    res.render 'console-event-detail-test',
#      event: results.doc
#      results: results



  # Severity css
router.get '/severities.css', ( req, res, next ) ->
  Severity.find { system: true }, { _id: 0, value: 1, label: 1, background: 1 }
  .then ( docs ) ->
    debug 'sevs', docs
    res.set 'Content-Type', 'text/css'
    res.render 'severities-css',
      severities: docs
      Colour: Colour

  .catch ( err ) ->
    next err



module.exports = router