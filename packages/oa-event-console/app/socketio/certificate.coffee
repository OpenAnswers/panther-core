# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:certificate')

# Config early
config            = require('../../lib/config').get_instance()
Promise           = require 'bluebird'

# node modules
path              = require 'path'
fs                = Promise.promisifyAll require('fs')

# npm modules
moment            = require 'moment'
mongoose          = require 'mongoose'
_                 = require 'lodash'
#openssl           = Promise.promisifyAll require('openssl-wrapper')
pem               = Promise.promisifyAll require('pem')


# Errors from Mongoose
ValidationError   = mongoose.Error.ValidationError
ValidatorError    = mongoose.Error.ValidatorError

# oa modules
{ random_string } = require 'oa-helpers'
{ SocketIO }      = require '../../lib/socketio'
Errors            = require '../../lib/errors'

# Model
{ Certificate }   = require '../model/certificate'

# Read client event source configuration archive
SocketIO.route 'certificate::client::archive', ( socket, data, socket_cb ) ->

  logger.info "reading client configuration archive", data

  unless data?
    throw new Errors.ValidationError('No data in message')
  unless data.path?
    throw new Errors.ValidationError('No "path" in message data')
  unless data.file?
    throw new Errors.ValidationError('No "file" in message data')

  client_archive_path = if config.app.private_path is '/'
    path.join config.app.private_path, data.path
  else
    path.join config.path.base, config.app.private_path, data.path

  fs.readFileAsync path.join( client_archive_path, data.file ), { encoding: 'binary' }
  .then ( client ) ->

    debug 'sending certificate::client::archive response', client
    socket_cb null, {client: client} if _.isFunction(socket_cb)

  .catch ( error ) ->
    logger.error "certificate::client::archive failed", data, error, ""
    socket_cb "#{error}" if _.isFunction(socket_cb)
