
#
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# ## Error

# This is where all the custom errors live.

# We also hold a generic error thrower that does things the way the
# app expects.

# Logging module
{ logger, debug}  = require('oa-logging')('oa:event:error')

# oa modules
Errors = require 'oa-errors'


Errors.Helpers = class Helpers

  @throw_socket: ( type, socket, msg, data = '' )->
    throw new type socket_error(type, socket, msg, data)

  @socket_error: ( type, socket, msg, data = '' )->
    socket.emit 'message',
      error: type.name
      message: msg
    generic_error type, "Socket #{socket.id}: #{msg}", data
    "#{type.name} #{socket.id} #{msg} #{data}"

  @throw_generic: ( type, msg, data='' )->
    throw new type generic_error(type, socket, msg, data)

  @generic_error: ( type, msg, data='' )->
    logger.error '%s: %s %j', type.name, msg, data
    "#{type.name} #{msg} #{data}"


module.exports = Errors


# Exit on a something not handled in a promise
process.on 'unhandledRejection', ( err )->
  logger.error err
  throw err