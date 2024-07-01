# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:settings')

{ SocketIO }      = require '../../lib/socketio'

Promise = require 'bluebird'
needle  = require('needle')
lodashKeys = require('lodash/keys')
lodashHas = require('lodash/has')
lodashGet = require('lodash/get')
config    = require('../../lib/config').get_instance()

event_server = config.event_server
settings_url = 'http://' + event_server.host + ':' + event_server.port + '/api/v1/settings'

# Client joining the activities stream

SocketIO.route_return 'settings::server::read', ( socket, data, socket_cb )->
  tracking_url = settings_url + '/tracking'
  debug 'got settings::server::read url', tracking_url

  needle( 'get', tracking_url, {}, {json:true} )
  .then (response)->

    if response.statusCode != 200
      throw new Errors.HttpError404
    
    body = response.body
    body
    
  .catch (error)->
    logger.error error
    throw error

SocketIO.route_return 'settings::server::write', ( socket, data, socket_cb)->
  debug 'got settings::server::write', data

  unless lodashHas( data, "tracking")
    return Promise.resolve {}

  value = lodashGet data, "tracking", 0

  needle('post', settings_url + '/tracking', {value: value} )
  .then (response)->
    if response.statusCode != 200
      throw new Error.HttpError404
    debug 'writing setting', response.body
    response.body
  .catch (error)->
    SocketIO.io.emit 'tracking::unavailable'
    tracking: null
