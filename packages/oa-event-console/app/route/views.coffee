# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


{logger, debug} = require('oa-logging')('oa:event:route:filters')

router = require('express').Router()

{ Field } = require '../../lib/field'

# Protect this route
router.use (req, res, next) ->
  if req.user?
    next()
  else
    logger.error 'Client tried to access console without auth session', req.sessionID
    res.redirect "/?redirectUrl=#{req.originalUrl}"


# Display the filter interface
router.get '/', ( req, res, next )->
  res.render 'views',
    title:        'Views'
    user:         req.user
    fields_list:   Field.list()


module.exports = router
