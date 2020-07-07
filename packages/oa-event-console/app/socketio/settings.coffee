# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:settings')

{ SocketIO }      = require '../../lib/socketio'

Promise = require 'bluebird'
needle  = Promise.promisifyAll require('needle')
lodashKeys = require('lodash/keys')
lodashHas = require('lodash/has')
lodashGet = require('lodash/get')
config    = require('../../lib/config').get_instance()

event_server = config.event_server
settings_url = 'http://' + event_server.host + ':' + event_server.port + '/api/v1/settings'

# Client joining the activities stream

SocketIO.route_return 'settings::server::read', ( socket, data, socket_cb )->
  debug 'got settings::server::read', data
  needle.getAsync( settings_url + '/tracking' )
  .then ( response )->
    debug 'sending settings', response.body
    response.body

SocketIO.route_return 'settings::server::write', ( socket, data, socket_cb)->
  debug 'got settings::server::write', data

  unless lodashHas( data, "tracking")
    return Promise.resolve {}

  value = lodashGet data, "tracking", 0

  needle.postAsync settings_url + '/tracking', {value: value}
  .then (response)->
    debug 'writing setting', response.body
    response.body
