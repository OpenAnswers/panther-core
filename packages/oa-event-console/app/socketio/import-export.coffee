# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:import-export')

{ SocketIO }      = require '../../lib/socketio'
{ ImportExport }  = require '../../lib/import-export'
{ Activities }    = require '../../lib/activities'
Errors            = require '../../lib/errors'

{ git_commit_msg_schema } = require '../validations/index'

# NPM modules
Promise = require 'bluebird'
lodashKeys = require('lodash/keys')
lodashHas = require('lodash/has')
lodashGet = require('lodash/get')
sanitize  = require('sanitize-filename')

config    = require('../../lib/config').get_instance()

path      = require('path')

SocketIO.route_return 'event_rules::activate', ( socket, data, socket_cb )->
  logger.info 'got event_rules::activate', data

  validated_data = git_commit_msg_schema.validate data.commit_msg, { abortEarly: true}
  if validated_data.error
    logger.error "event_rules::activate validation error", validated_data
    throw new Errors.ValidationError 'Invalid git commit message'

  debug "git commit msg: ", validated_data
  commit_msg = data.commit_msg

  santizedFilename = sanitize data.filename
  unless santizedFilename
    throw new Errors.ValidationError "filename not recognised"

  filePath = path.join config.app.upload.directory, santizedFilename

  ImportExport.switch_to_imported filePath, 
    user_name: socket.ev.user()
    user_email: config.app.email
    git: config.rules.git
    git_push: config.rules.push
    commit_msg: commit_msg

  .then (result)->

    Activities.store 'rules', 'imported', socket.ev.user(), {}

    debug "activated this", result
    logger.info "User [%s] activated rules [%s]", socket.ev.user(), filePath
    filename: santizedFilename



