# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# Logging module
{logger, debug} = require('oa-logging')('oa:event:route:api')

# npm modules
bodyParser = require 'body-parser'

# oa modules
Errors        = require 'oa-errors'
config        = require('../../../lib/config').get_instance()
{Mongoose}    = require '../../../lib/mongoose'
{ _ }         = require 'oa-helpers'


router = require('express').Router()

router.use bodyParser.json()

#Deal with a mongo id param

router.param 'mongo_id', ( req, res, next, mongo_id )->

  debug 'found a param mongo_id', mongo_id

  unless oid = Mongoose.recid_to_objectid_false mongo_id
    logger.error "failed to mongo_id", mongo_id
    err = new Errors.HttpError400 "Invalid event id"
    return next err

  req.object_id = oid
  next()


# Read an event from the db
router.get '/read/:mongo_id', ( req, res, next ) ->

  Mongoose.alerts.findOne _id: req.object_id
  .then ( doc )->
    unless doc
      next new Errors.HttpError404
    else
      doc.id = doc._id
      delete doc._id
      res.json event: doc

  .catch ( err )->
    next err


# Delete an event from the db
router.delete '/delete/:mongo_id', ( req, res, next ) ->
  debug 'removing id', req.object_id
  Mongoose.alerts.deleteOne _id: req.object_id
  .then ( doc )->
    debug 'remove doc result', doc?.result
    unless doc
      throw new Errors.HttpError404
    
    if doc.ok isnt 1 or doc.n isnt 1
      throw new Errors.QueryError doc

    res.json result: doc
      

  .catch ( err )->
    debug 'remove error', err
    next err


router.use ( error, req, res, next )->
  code = if error.code then error.code else 500
  logger.error error.message, error.stack if error.code is 500
  res.status(code).json message: error.message

module.exports = router
