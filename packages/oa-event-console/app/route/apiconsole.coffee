# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{ debug, logger }   = require('oa-logging')('oa:event:route:apiconsole')


# npm modules
_          = require 'lodash'
router     = require('express').Router()

{ ApiKey } = require '../model/apikey'

config     = require('../../lib/config').get_instance()

# Protect this route
router.use (req, res, next) ->
  if req.user?
    next()
  else
    logger.error 'Client tried to access admin without auth session', req.sessionID
    res.redirect "/?redirectUrl=#{req.originalUrl}"

# Protect this route
router.use (req, res, next) ->
  debug 'req.user', req.user, req.user.group
  if req.user.group and req.user.group is 'admin'
    next()
  else
    logger.error 'Client tried to access admin without admin permissions', req.sessionID
    res.redirect "/dashboard?error=not-an-admin"


router.get '/', (req, res) ->
  debug 'req.user', req.user.username
  ApiKey.user_tokens_Async req.user.username
  .then ( token_doc ) ->

    if config.app.url.match(/^https/)
      api_url = config.app.url
    else
      api_url = "http://#{config.event_monitors.http.host}:#{config.event_monitors.http.port}"
      
    res.render 'apiconsole',
      title: 'API Console'
      user: req.user
      api:
        tokens: _.map( token_doc, 'apikey' )
        url: api_url

  .catch ( error ) ->
    res.render 'apiconsol',
    res.render 'apiconsole',
      title: 'API Console'
      user: req.user
      tokens: ''
      error:
        message: 'Failed to retrieve any API Keys'

    
module.exports = router
