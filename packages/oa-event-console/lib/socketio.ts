//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # SocketIO

// logging modules
const { RequestLogger,
  logger,
  debug }         = require('oa-logging')('oa:event:socketio');

// npm modules
const Promise: any      = require('bluebird');
const { Server }        = require('socket.io');
const passportSocketIo  = require('passport.socketio');
const cookieParser      = require('cookie-parser');
const uuid              = require('uuid');
const siofu             = require('socketio-file-upload');
const { unlink }        = require('fs');

// Config before OA
const config            = require('./config').get_instance();

// OA modules
const Errors            = require('./errors');
const { server_event }  = require('./eventemitter');
const { EvSocket }      = require('./evsocket');
const { _,
  timer,
  objhash,
  random_string } = require('oa-helpers');

const { EventRules }    = require('oa-event-rules');
const { Path }          = require('./path');

const { ImportExport }  = require('./import-export');
const { MongoPollers }  = require('./mongopollers');


// ## Class SocketIO
// Singleton class to house the Socket connection and methods

class SocketIO {
  static io: any; static app: any; static connections: any;
  static client_routes: any; static client_return_routes: any;

  static initClass() {
  
    this.io = null;
    this.app = null;
    this.connections = {};
    this.client_routes = {};
    this.client_return_routes = {};
  }

  // Create the initial socket for on an express app
  static create(app) {
    this.app  = app;

    // Attach socketio to the Express `app`s http server
    this.io   = new Server(this.app.http, {
      pingTimeout:  31000,
      pingInterval: 15000,
      cookie: false
    }
    );
    debug('created the socketio on the express app', this.io.sockets.sockets);

    // Handle connectionsv
    this.io.on('connection', socket => {
      this.add_connection(socket);
      return this.on_connection(socket);
    });


    this.app.node_id = config.app.id || [0x0f, 0x0e, 0x0e];
    const uuid_node = [];
    uuid_node.push(...this.app.node_id || []);
    uuid_node.push(0x0d, 0x0a); // event_console express
    uuid_node.push(0x00); // unused

    this.io.use(function(socket, next){
      socket.uuid = uuid.v1({ node: uuid_node });
      return next();
    });

    debug('config.session.secret', config.session.secret);
    debug('config.session.store', config.session.store);
    if (!config.session || !config.session.secret || !config.session.store) {
      throw new Error("No config session to use for passport");
    }

    // Passport auth on the sockets (`socket.user`)
    this.io.use(passportSocketIo.authorize({
      cookieParser,
      key:    'panther.sid',
      secret:  config.session.secret,
      store:   config.session.store,
      success: SocketIO.onAuthorizeSuccess,
      fail:    SocketIO.onAuthorizeFail
    })
    );

    // Include any application socket routes
    // app.locals.config.path.socket index?
    require(config.path.socketio);

    debug('create is returning the socketio io');
    return this.io;
  }


  // Passport fail
  static onAuthorizeFail(data, message, error, accept) {
    if (error) {
      logger.error('Socket authorization failed', message, error, data.socket);
      return accept(new Error(message));
    }
      // Setup unauthorized routes
      // nsp unauth
    logger.warn('Passport auth failed', message, data.headers?.cookie, data._query?.session_id);
    return accept( new Error(message) );
  }


  // Passport success
  static onAuthorizeSuccess(data, accept) {
    logger.info('Socket authorization succeeded User:', data.user.username,
      'Socketid', _.keys(data.socket));
    // Setup authorized messages
    // nsp auth
    return accept();
  }


  // Simple connection tracking
  // Other details about the socket can be tracked in here. SocketIO doesn't
  // appear to support that internally since 1.x
  static add_connection(socket) {
    logger.info('Adding tracked socketio connection', socket.id);
    const evs = new EvSocket(socket);
    evs.init();
    socket.ev = evs;  // This should go away when the socket is destroyed
    return this.connections[socket.id] = evs;
  }


  static get_connection(socket_id) {
    debug('Looking up tracked socket.id %s in connections %j', socket_id, this.connections);
    return this.connections[socket_id];
  }


  static del_connection(socket, data) {

    if (this.connections[socket.id] != null) {
      this.connections[socket.id].shutdown();
      return delete this.connections[socket.id];
    } else {
      return logger.warn('No tracked socketio connection to delete', socket.id);
    }
  }

  static connected_users(){
    const users = _.chain(this.connections)
      .map(s => _.get(s, "socket.request.user.username")).compact()
      .uniq()
      .value();
    return users;
  }


  // The main socket handlers
  static on_connection(socket) {

    debug('socket connected', socket.conn.id, socket.conn.remoteAddress);

    // session middleware to disconnect
    socket.use((s, done) => // requires session to have been deleted on expiry
    config.session.store.get(socket.request.sessionID, function(err, session) {
      debug("session ID check: [%s]", socket.request.sessionID);
      if (err) {
        logger.error(err);
        return done( new Error("Session failure"));
      }

      if (!session) {
        socket.emit("logout", {session: "timedout"});
        socket.ev.warn("Session disconnected");
        socket.disconnect();
      }

      // session still exists, proceed to next
      return done();
    }));



    // Notify anyone who wants to know we have a socket connection
    server_event.emit('oa::events::connected', {
      socket,
      message: 'socket connected'
    }
    );

    socket.broadcast.emit( 'info::users', this.connected_users());

    // Fill the grid with data
    // server_event.emit 'oa::events::populate',
    //   socket: socket
    //   message: 'socket connected'

    // Setup an error handler that does something useful
    socket.on('error', function(error) {
      // Catch emitted errors and put them back into the promise
      if (error.promise) {
        return error.promise.reject(error);
      }
      logger.error('SocketIO default error handler:', error.stack);
      if (error.name !== 'ValidationError') {
        console.error('SocketIO default error handler', error, error.stack);
        //throw error
        return process.exit(1);
      }
    });

    // Simple connection tracking
    socket.on('disconnect', data => {
      const user = socket.request?.user?.username ?
        socket.request.user.username
      :
        'unknown';
      logger.info('%s %s socketio disconnected', socket.id, user, data, '');
      this.del_connection(socket, data);
      // broadcast to everyone the currently logged in users
      return this.io.emit( 'info::users', this.connected_users());
    });

    // Setup the test echo
    socket.on('test_request', function( content, cb ){
      debug('recieved test_request', content);
      socket.emit('test_response', {id: socket.conn.id, request: content});
      if (_.isFunction(cb)) { return cb(content); }
    });

    // Setup SocketIO File Uploader
    if (socket.request?.user?.group === "admin") {
      this.init_admin(socket);
    }

    this.init_routes(socket);

    // These need to move into app/socketio via init_routes
    // and get rid of the server_events
    // But the app needs some restructuring of the express/socket
    // setup to achieve that

    socket.on('populate', (data, client_cb) => server_event.emit('oa::events::populate', {
      socket,
      data,
      cb:     client_cb
    }
    ));

    socket.on('deletes', (data, client_cb) => server_event.emit('oa::events::deletes', {
      socket,
      data,
      cb:     client_cb
    }
    ));

    socket.on('updates', function( data, client_cb ){
      server_event.emit('oa::events::updates', {
        socket,
        data,
        cb:     client_cb,
        source: 'oa:socketio:updates'
      }
      );

      return MongoPollers.emit_current_ids();
    });

    socket.on('severity', (data, client_cb) => server_event.emit('oa::events::severity', {
      socket,
      data,
      cb:     client_cb
    }
    ));

    socket.on('event_add_note', (data, client_cb) => server_event.emit('oa::event::add_note', {
      socket,
      data,
      cb:     client_cb
    }
    ));

    socket.on('event_add_note_bulk', (data, client_cb) => server_event.emit('oa::event::bulk::update', {
      socket,
      data,
      cb:     client_cb
    }
    ));

    // @deprecated?
    socket.on('set_filter', (data, client_cb) => server_event.emit('oa::events::set_filter', {
      socket,
      data,
      cb:     client_cb
    }
    ));

    debug('@app name', this.app.app.locals.name);

    //debug '@', @
    return socket.emit('time_start', {start: this.app.app.locals.start_time});
  }


  // ## admin helper
  // Add admin only handlers to default namespace
  static init_admin(socket){
    // Import 
    return ImportExport.init_importer(socket);
  }

  // ## Routing helpers

  // ###### route( name, function )
  // Add a route to the default namespace
  static route( name, route_function, options ) {
    options ??= {};
    this.client_routes[name] = route_function;
    return this;
  }


  // ###### route_return( name, function )
  //
  // Add a return route to the default namespace. A return routes deals with all
  // the client response for you. A return route expects a callback function as
  // the last paramater to the socketio message. You can return a straight value,
  // or the promise of a value from your `function` and it will be returned to
  // the client
  //
  // The only option currently supported it `timeout`, in which the requset must
  // be finalised by or the Promise timout error will be returned to the client
  //
  //     route_return 'some:socket:message',
  //       -> 'do something',
  //       { timeout: 20000 }
  //
  static route_return( name, route_function, options ) {
    options ??= {};
    const timeout = options.timeout || 20000;
    this.client_return_routes[name] = {
      function: route_function,
      timeout
    };
    return this;
  }

  // ###### init_routes( socket )
  //
  // Create the stored routes on a socket.
  // This is generally done on conneciton.
  // Doesn't deal with namespaces yet.
  //
  static init_routes(socket) {
    let route;
    const self = this;
    debug('creating connection socketio routes', socket.id);

    for (route in this.client_routes) {
      var route_function = this.client_routes[route];
      (function( route, route_function, socket ){
        debug('creating route', route);
        return socket.on(route, function(...args) {
          const last_arg = _.last(args);
          debug('Receieved socketio route message', route, args);

          RequestLogger.log_socket_combined(logger, socket, route);

          return self.run_route_async(route_function, socket, ...args)
          .timeout(20000, `Request timedout ${route} ${socket.id}`)
          // .then ( result )->
          //   debug '%s promise returned', route, result

          // .catch Errors.ValidationError, ( error )->
          //   if _.isFunction(last_arg) then last_arg "#{error}"
          //   logger.error error, error.stack

          .catch(function( error ){
            if (_.isFunction(_.last(args))) { _.last(args)(`${error}`); }
            return logger.error(error, error.stack);}).finally(() => // Do some request logging here in addition to (or instead of ) ingress
          debug("route done [%s/%s]", socket.id, route));
        });
      })(route, route_function, socket);
    }

    return (() => {
      const result = [];
      for (route in this.client_return_routes) {
        var route_data = this.client_return_routes[route];
        if (this.client_routes[route]) {
          throw new Error(`Route already exists [${route}]`);
        }
        result.push((function( route, route_data, socket ){
          debug('creating return route', route);
          return socket.on(route, function(...args) {
            const last_arg = _.last(args);
            // Log the request
            debug('Receieved socketio route_return message', route, args);
            RequestLogger.log_socket_combined(logger, socket, route);

            // Make sure we have a socket callback function
            if (!_.isFunction(last_arg)) {
              logger.error('Request did not include a callback', route, last_arg);
            }
          
            return self.run_route_async(route_data.function, socket, ...args)
            .timeout(route_data.timeout, `Request timedout ${route} ${socket.id}`)
            .then(function( result ){
              debug('return route [%s] promise returned', route, result);
              if (_.isFunction(last_arg)) {
                last_arg(null, result);
              }
              return result;}).catch({name: 'BadRequestError'}, function( error ){
              logger.error('BadRequestError', error, route, args);
              if (_.isFunction(last_arg)) { return last_arg(error); }
            }).catch({name: 'SocketMsgError'}, function( error ){
              logger.error('SocketMsgError', error, route, args);
              if (_.isFunction(last_arg)) { return last_arg(error); }
            }).catch({name: 'ValidationError'}, function( error ){
              logger.error('Validation Error', error, route);
              if (_.isFunction(last_arg)) { return last_arg(error); }
            }).catch({name: 'QueryError'}, function( error ){
              logger.error('Query Error', error, route, error.stack);
              if (_.isFunction(last_arg)) { return last_arg(error); }
            }).catch({name: 'UserExistsError'}, function( error ){
              logger.error('User Exists', error, route);
              if (_.isFunction(last_arg)) { return last_arg(error); }
            }).catch(function( error ){
              const error_id = logger.error_id('error in route_return', route, args, error, error.stack);
              if (!_.isFunction(last_arg)) { return; }
              if (process.env.NODE_ENV === 'development') {
                return last_arg(error.stack);
              } else {
                return last_arg(`There was an error on the server\nError ID: ${error_id}`);
              }}).finally(() => // Do some request logging here in addition to (or instead of ) ingress
            debug("return route done [%s/%s]", socket.id, route));
          });
        })(route, route_data, socket));
      }
      return result;
    })();
  }


  static run_route_async( route_fn, socket, ...args ){
    return new Promise((resolve, reject) => resolve(route_fn( socket, ...args )));
  }

  // ## Helpers

  // return the object of rooms, members
  static rooms() {
    return this.io.sockets.adapter.rooms;
  }

  static room(name){
    return this.rooms().has(name);
  }

  static room_has_members(name){
    let room;
    if (!(room = this.room(name))) {
      logger.warn(`No room ${name}`);
    }

    return room;
  }



  // Check if an event message has a socket attached to it
  static socket_check_msg( msg ){
    if (msg.socket == null) {
      return server_event.emit('error', new Errors.SocketError('No socket on event!', msg));
    }
    return true;
  }


  // Check for data on a socket message
  static socket_check_data( msg ){
    if (msg.data == null) {
      msg.socket.ev.exception('SocketMsgError', "No data field on message");
      return false;
    }
    return true;
  }


  // Check if an event message has the relevent info to act upon event id's
  static socket_check_ids( msg ){
    if (!this.socket_check_msg(msg)) { return false; }
    if (!this.socket_check_data(msg)) { return false; }

    if (msg.data.ids == null) {
      msg.socket.ev.exception('SocketMsgError', "No id's field in data on message");
      return false;
    }

    if (!(msg.data.ids instanceof Array)) {
      msg.socket.ev.exception('SocketMsgError', "Data ids must be an array");
      return false;
    }

    return true;
  }


  // ### socket_error( socket, type, message )
  // This is a generic socket error thrower
  static socket_error( socket, type, message ){
    logger.error(socket.id, type, message);
    socket.emit('message', {
      error: type,
      message
    }
    );
    return false;
  }
}
SocketIO.initClass();


module.exports.SocketIO = SocketIO;
