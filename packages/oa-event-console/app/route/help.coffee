# # Routes - /help

# logging
{ logger, debug } = require('oa-logging')('oa:event:routes:help')
# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# npm modules
jade   = require 'jade'
router = require('express').Router()

# oa modules
Errors         = require 'oa-errors'
{ _ }          = require 'oa-helpers'


config = require('../../lib/config').get_instance()


# Some help info
router.get '/', ( req, res )->
  app = config.app
  res.render 'help',
    title: 'Help'
    user: req.user
    domain: app.domain
    url: app.url
    syslog_port: app.syslog_port



module.exports = router
