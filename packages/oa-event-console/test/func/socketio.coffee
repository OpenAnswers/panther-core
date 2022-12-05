#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#


io      = require 'socket.io-client'
debug   = require('debug')('oa:test:socketio_client')

# This setup is so we have debug on all the socket events

io_test_client = ( uri, opts, callback ) ->

  if typeof opts is 'function'
    callback = opts

  socket = io uri, opts

  socket.on 'error', (error)->
    throw error

  socket.on 'connect_timeout', (err)->
    debug 'connect_timeout', err

  socket.on 'disconnect', ->
    debug 'disconnect'

  socket.on 'reconnect', (i)->
    debug 'reconnect', i

  socket.on 'reconnect_attempt', ->
    debug 'reconnect_attempt'

  socket.on 'reconnect_error', (err)->
    debug 'reconnect_error', err

  socket.on 'reconnect_failed', ->
    debug 'reconnect_failed'

  socket.on 'reconnecting', (i) ->
    debug 'reconnecting', i

  socket.on 'event', (data) ->
    debug "event: ", data

  socket


module.exports = io
module.exports.io_test_client = io_test_client