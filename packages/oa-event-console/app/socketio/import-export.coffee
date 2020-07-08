# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:import-export')

{ SocketIO }      = require '../../lib/socketio'
{ ImportExport }  = require '../../lib/import-export'

# NPM modules
Promise = require 'bluebird'
needle  = Promise.promisifyAll require('needle')
lodashKeys = require('lodash/keys')
lodashHas = require('lodash/has')
lodashGet = require('lodash/get')
sanitize  = require('sanitize-filename')

config    = require('../../lib/config').get_instance()

path      = require('path')

SocketIO.route_return 'event_rules::activate', ( socket, data, socket_cb )->
  logger.info 'got event_rules::activate', data

  santizedFilename = sanitize data.filename
  unless santizedFilename
    throw new Errors.ValidationError "filename not recognised"

  filePath = path.join config.app.upload.directory, santizedFilename

  ImportExport.switch_to_imported filePath, 
    user_name: socket.ev.user()
    user_email: config.app.email
    git_push: config.rules.push

  .then (result)->
    debug "activated this", result
    logger.info "User [%s] activated rules [%s]", socket.ev.user(), filePath
    filename: santizedFilename



