# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{ debug, logger }   = require('oa-logging')('oa:event:route:admin')

# npm modules
router = require('express').Router()


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
  res.render 'admin',
    title: 'Admin'
    user: req.user

    
module.exports = router
