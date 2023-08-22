#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

#server_io = require 'socket.io'
#  .listen 3033

io        = require 'socket.io-client'
request   = require 'request'
bluebird  = require 'bluebird'
debug     = require 'debug'


# Simple config
# =============
class Config
  @server:    'http://localhost:4002'
  @user:      'test'
  @password:  'test'


# Error helper
# ============
class Throw
  # Generic error thrower with variables
  throw_error: ( error, info... ) ->
    msg = "#{error}"
    if info.length > 0
      inner = info.join '] ['
      msg  += " [#{inner}]"
    throw new Error( "#{msg}" );


# SocketIO client for oamon
# =========================
class Client


  constructor: ->
    @server   = Config.server
    @user     = Config.user
    @password = Config.password

    @login()

    @socket_connect()
    @event_server()
    @event_client()


  socket_connect: ->
    @socket = io.connect Config.server, { query: "token=" + @cookie }
    debug 'connection: %s', @socket


  # Authenticate to the console
  login: ->
    req_opts =
      url: "#{@server}/logins",
      form:
        username: @user
        password: @password

    request.post req_opts, (err, res, body) ->
      if err
        throw_error err, res.statusCode, res.body
      unless res.statusCode == 302
        throw_error "status", res.statusCode
      unless res.headers.location.match /\/extconsoles$/
        throw_error "location", res.headers.location

      console.log "Response", res.headers['set-cookie']
      @cookie = res.headers['set-cookie']
      return @
  

  # Generic events from a socket
  event_server: ->

    @socket.on 'new-data', (data)->
      item = data.value
      console.log "new-data", data

    @socket.on 'data', (data)->
      item = data.value
      console.log "data", data

    @socket.on 'error', (err)->
      console.log "error", err

    @socket.on 'connect', (data)->
      console.log "connect", data

    @socket.on 'connecting', (data)->
      console.log "connecting", data

    @socket.on 'connect_error', (data)->
      console.log "connect-error", data

    @socket.on 'reconnect', (data)->
      console.log "connect", data

    @socket.on 'reconnecting', (data)->
      console.log "reconnecting", data

    @socket.on 'reconnect_error', (err)->
      console.log "reconnect_error", err

    @socket.on 'reconnect_failed', (err)->
      console.log "reconnect_failed", err

    @socket.on 'disconnect', (err)->
      console.log "disconnect", err


  # Event Console ClientManager events
  event_client: ->

    @socket.on 'setfilter', (data) ->
      console.log 'setfilter', data

    @socket.on 'acknowledge', (data) ->
      console.log 'acknowledge', data

    @socket.on 'severity', (data) ->
      console.log 'severity', data

    @socket.on 'assign', (data) ->
      console.log 'assign', data

    @socket.on 'delete', (data) ->
      console.log 'delete', data

    @socket.on 'external_class', (data) ->
      console.log 'external_class', data

    @socket.on 'startchart', (data) ->
      console.log 'startchart', data



cli = new Client
cli.login






