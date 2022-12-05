
#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# logging modules
{logger, debug} = require('oa-logging')('oa:event:console:events')

# node modules

# npm modules
{EventEmitter2} = require 'eventemitter2'


# exports a singleton instance `server_event` of an
# EventEmitter2 for everyone to use

# Should probably duplicate this into ZMQ so events
# can go across process bounaries

server_event = new EventEmitter2
  wildcard: true
  delimiter: '::'
  #maxListeners: 10


server_event.on 'error', ( error ) ->
  console.error error.message, error, error.stack
  logger.error error.message, error, error.stack

server_event.on 'fatal', ( error ) ->
  console.error error.message, error, error.stack
  logger.error error.message, error, error.stack
  process.exit 1

# if process.env.DEBUG
#   server_event.onAny ( ev ) ->
#     debug 'event', ev


module.exports =
  server_event: server_event
  EventEmitter2: EventEmitter2