#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# # SocketIO

# logging modules
{ RequestLogger
  logger
  debug }         = require('oa-logging')('oa:event:socketio')

# npm modules
Promise           = require 'bluebird'
socket_io         = require 'socket.io'
passportSocketIo  = require 'passport.socketio'
cookieParser      = require 'cookie-parser'
uuid              = require 'node-uuid'
siofu             = require 'socketio-file-upload'
{ unlink }        = require 'fs'

# Config before OA
config            = require('./config').get_instance()

# OA modules
Errors            = require './errors'
{ server_event }  = require './eventemitter'
{ EvSocket }      = require './evsocket'
{ _
  timer
  objhash
  random_string } = require 'oa-helpers'

{ EventRules }    = require 'oa-event-rules'
{ Path }          = require './path'

{ ImportExport }  = require './import-export'


# ## Class SocketIO
# Singleton class to house the Socket connection and methods

class SocketIO

  @io: null
  @app: null
  @connections: {}
  @client_routes: {}
  @client_return_routes: {}

  # Create the initial socket for on an express app
  @create: (app) ->
    @app  = app

    # Attach socketio to the Express `app`s http server
    @io   = socket_io @app.http,
      pingTimeout:  31000
      pingInterval: 15000
      cookie: false
    debug 'created the socketio on the express app', @io.sockets.sockets

    # Handle connectionsv
    @io.on 'connection', ( socket ) =>
      @add_connection socket
      @on_connection socket


    @app.node_id = config.app.id or [0x0f, 0x0e, 0x0e]
    uuid_node = []
    uuid_node.push @app.node_id...
    uuid_node.push 0x0d, 0x0a # event_console express
    uuid_node.push 0x00 # unused

    @io.use (socket, next)->
      socket.uuid = uuid.v1( node: uuid_node )
      next()

    debug 'config.session.secret', config.session.secret
    debug 'config.session.store', config.session.store
    unless config.session and config.session.secret and config.session.store
      throw new Error "No config session to use for passport"

    # Passport auth on the sockets (`socket.user`)
    @io.use passportSocketIo.authorize
      cookieParser: cookieParser
      key:    'panther.sid'
      secret:  config.session.secret
      store:   config.session.store
      success: SocketIO.onAuthorizeSuccess
      fail:    SocketIO.onAuthorizeFail

    # Include any application socket routes
    # app.locals.config.path.socket index?
    require config.path.socketio

    debug 'create is returning the socketio io'
    @io


  # Passport fail
  @onAuthorizeFail: (data, message, error, accept) ->
    if error
      logger.error 'Socket authorization failed', message, error, data.socket
      return accept(new Error message)
      # Setup unauthorized routes
      # nsp unauth
    logger.warn 'Passport auth failed', message, data.headers?.cookie, data._query?.session_id
    accept( new Error message )


  # Passport success
  @onAuthorizeSuccess: (data, accept) ->
    logger.info 'Socket authorization succeeded User:', data.user.username,
      'Socketid', _.keys(data.socket)
    # Setup authorized messages
    # nsp auth
    accept()


  # Simple connection tracking
  # Other details about the socket can be tracked in here. SocketIO doesn't
  # appear to support that internally since 1.x
  @add_connection: (socket) ->
    logger.info 'Adding tracked socketio connection', socket.id
    evs = new EvSocket socket
    evs.init()
    socket.ev = evs  # This should go away when the socket is destroyed
    @connections[socket.id] = evs


  @get_connection: (socket_id) ->
    debug 'Looking up tracked socket.id %s in connections %j', socket_id, @connections
    @connections[socket_id]


  @del_connection: (socket, data) ->

    if @connections[socket.id]?
      @connections[socket.id].shutdown()
      delete @connections[socket.id]
    else
      logger.warn 'No tracked socketio connection to delete', socket.id

  @connected_users: ()->
    users = _.chain @connections
      .map (s)->
        _.get s, "socket.request.user.username"
      .compact()
      .uniq()
      .value()
    users


  # The main socket handlers
  @on_connection: (socket) ->

    debug 'socket connected', socket.conn.id, socket.conn.remoteAddress

    # session middleware to disconnect
    socket.use (s, done) ->
      # requires session to have been deleted on expiry
      config.session.store.get socket.request.sessionID, (err, session) ->
        debug "session ID check: [%s]", socket.request.sessionID
        if err
          logger.error err
          return done( new Error "Session failure")

        unless session
          socket.emit "logout", session: "timedout"
          socket.ev.warn "Session disconnected"
          socket.disconnect()

        # session still exists, proceed to next
        done()



    # Notify anyone who wants to know we have a socket connection
    server_event.emit 'oa::events::connected',
      socket: socket
      message: 'socket connected'

    socket.broadcast.emit( 'info::users', @connected_users())

    # Fill the grid with data
    # server_event.emit 'oa::events::populate',
    #   socket: socket
    #   message: 'socket connected'

    # Setup an error handler that does something useful
    socket.on 'error', (error) ->
      # Catch emitted errors and put them back into the promise
      if error.promise
        return error.promise.reject(error)
      logger.error 'SocketIO default error handler:', error.stack
      if error.name isnt 'ValidationError'
        console.error 'SocketIO default error handler', error, error.stack
        #throw error
        process.exit 1

    # Simple connection tracking
    socket.on 'disconnect', (data) =>
      user = if socket.request?.user?.username
        socket.request.user.username
      else
        'unknown'
      logger.info '%s %s socketio disconnected', socket.id, user, data, ''
      @del_connection socket, data
      # broadcast to everyone the currently logged in users
      @io.emit( 'info::users', @connected_users())

    # Setup the test echo
    socket.on 'test_request', ( content, cb )->
      debug 'recieved test_request', content
      socket.emit 'test_response', id: socket.conn.id, request: content
      cb(content) if _.isFunction(cb)

    # Setup SocketIO File Uploader
    if socket.request.user.group is "admin"
      @init_admin socket

    @init_routes socket

    # These need to move into app/socketio via init_routes
    # and get rid of the server_events
    # But the app needs some restructuring of the express/socket
    # setup to achieve that

    socket.on 'populate', ( data, client_cb )->
      server_event.emit 'oa::events::populate',
        socket: socket
        data:   data
        cb:     client_cb

    socket.on 'deletes', ( data, client_cb )->
      server_event.emit 'oa::events::deletes',
        socket: socket
        data:   data
        cb:     client_cb

    socket.on 'updates', ( data, client_cb )->
      server_event.emit 'oa::events::updates',
        socket: socket
        data:   data
        cb:     client_cb
        source: 'oa:socketio:updates'

      MongoPollers.emit_current_ids()

    socket.on 'severity', ( data, client_cb )->
      server_event.emit 'oa::events::severity',
        socket: socket
        data:   data
        cb:     client_cb

    socket.on 'event_add_note', ( data, client_cb )->
      server_event.emit 'oa::event::add_note',
        socket: socket
        data:   data
        cb:     client_cb

    socket.on 'event_add_note_bulk', ( data, client_cb )->
      server_event.emit 'oa::event::bulk::update',
        socket: socket
        data:   data
        cb:     client_cb

    # @deprecated?
    socket.on 'set_filter', ( data, client_cb )->
      server_event.emit 'oa::events::set_filter',
        socket: socket
        data:   data
        cb:     client_cb

    debug '@app name', @app.app.locals.name

    #debug '@', @
    socket.emit 'time_start', start: @app.app.locals.start_time


  # ## admin helper
  # Add admin only handlers to default namespace
  @init_admin: (socket)->
    # Import 
    ImportExport.init_importer socket

  # ## Routing helpers

  # ###### route( name, function )
  # Add a route to the default namespace
  @route: ( name, route_function, options = {} ) ->
    @client_routes[name] = route_function
    @


  # ###### route_return( name, function )
  #
  # Add a return route to the default namespace. A return routes deals with all
  # the client response for you. A return route expects a callback function as
  # the last paramater to the socketio message. You can return a straight value,
  # or the promise of a value from your `function` and it will be returned to
  # the client
  #
  # The only option currently supported it `timeout`, in which the requset must
  # be finalised by or the Promise timout error will be returned to the client
  #
  #     route_return 'some:socket:message',
  #       -> 'do something',
  #       { timeout: 20000 }
  #
  @route_return: ( name, route_function, options = {} ) ->
    timeout = 20000 or options.timeout
    @client_return_routes[name] =
      function: route_function
      timeout: timeout
    @

  # ###### init_routes( socket )
  #
  # Create the stored routes on a socket.
  # This is generally done on conneciton.
  # Doesn't deal with namespaces yet.
  #
  @init_routes: (socket) ->
    self = this
    debug 'creating connection socketio routes', socket.id

    for route, route_function of @client_routes
      do ( route, route_function, socket )->
        debug 'creating route', route
        socket.on route, (args...) ->
          last_arg = _.last(args)
          debug 'Receieved socketio route message', route, args

          RequestLogger.log_socket_combined logger, socket, route

          self.run_route_async(route_function, socket, args...)
          .timeout(20000, "Request timedout #{route} #{socket.id}")
          # .then ( result )->
          #   debug '%s promise returned', route, result

          # .catch Errors.ValidationError, ( error )->
          #   if _.isFunction(last_arg) then last_arg "#{error}"
          #   logger.error error, error.stack

          .catch ( error )->
            if _.isFunction(_.last(args)) then _.last(args) "#{error}"
            logger.error error, error.stack
          
          .finally ->
            # Do some request logging here in addition to (or instead of ) ingress
            debug "route done [%s/%s]", socket.id, route

    for route, route_data of @client_return_routes
      if @client_routes[route]
        throw new Error("Route already exists [#{route}]")
      do ( route, route_data, socket )->
        debug 'creating return route', route
        socket.on route, (args...) ->
          last_arg = _.last(args)
          # Log the request
          debug 'Receieved socketio route_return message', route, args
          RequestLogger.log_socket_combined logger, socket, route

          # Make sure we have a socket callback function
          unless _.isFunction(last_arg)
            logger.error 'Request did not include a callback', route, last_arg
          
          self.run_route_async(route_data.function, socket, args...)
          .timeout(route_data.timeout, "Request timedout #{route} #{socket.id}")
          .then ( result )->
            debug 'return route [%s] promise returned', route, result
            if _.isFunction(last_arg)
              last_arg null, result
            result

          .catch name: 'BadRequestError', ( error )->
            logger.error 'BadRequestError', error, route, args
            if _.isFunction(last_arg) then last_arg(error)
            
          .catch name: 'SocketMsgError', ( error )->
            logger.error 'SocketMsgError', error, route, args
            if _.isFunction(last_arg) then last_arg(error)

          .catch name: 'ValidationError', ( error )->
            logger.error 'Validation Error', error, route
            if _.isFunction(last_arg) then last_arg(error)

          .catch name: 'QueryError', ( error )->
            logger.error 'Query Error', error, route, error.stack
            if _.isFunction(last_arg) then last_arg(error)
          
          .catch name: 'UserExistsError', ( error )->
            logger.error 'User Exists', error, route
            if _.isFunction(last_arg) then last_arg(error)

          .catch ( error )->
            error_id = logger.error_id 'error in route_return', route, args, error, error.stack
            return unless _.isFunction(last_arg)
            if process.env.NODE_ENV is 'development'
              last_arg error.stack
            else
              last_arg "There was an error on the server\nError ID: #{error_id}"

          .finally ->
            # Do some request logging here in addition to (or instead of ) ingress
            debug "return route done [%s/%s]", socket.id, route


  @run_route_async: ( route_fn, socket, args... )->
    new Promise ( resolve, reject )->
      resolve route_fn( socket, args... )

  # ## Helpers

  # return the object of rooms, members
  @rooms: ->
    @io.sockets.adapter.rooms

  @room: (name)->
    @rooms()[name]

  @room_has_members: (name)->
    unless room = @room name
      logger.warn "No room #{name}"
      return false

    _.size(room) > 0



  # Check if an event message has a socket attached to it
  @socket_check_msg: ( msg )->
    unless msg.socket?
      return server_event.emit 'error', new Errors.SocketError('No socket on event!', msg)
    true


  # Check for data on a socket message
  @socket_check_data: ( msg )->
    unless msg.data?
      msg.socket.ev.exception 'SocketMsgError', "No data field on message"
      return false
    true


  # Check if an event message has the relevent info to act upon event id's
  @socket_check_ids: ( msg )->
    return false unless @socket_check_msg msg
    return false unless @socket_check_data msg

    unless msg.data.ids?
      msg.socket.ev.exception 'SocketMsgError', "No id's field in data on message"
      return false

    unless msg.data.ids instanceof Array
      msg.socket.ev.exception 'SocketMsgError', "Data ids must be an array"
      return false

    true


  # ### socket_error( socket, type, message )
  # This is a generic socket error thrower
  @socket_error: ( socket, type, message )->
    logger.error socket.id, type, message
    socket.emit 'message',
      error: type
      message: message
    false


module.exports.SocketIO = SocketIO
