
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # EvSocket

// Quick accessors for the data we want to store/use on a socket
// for our application
// It looks like socketio 0.x had an inbuilt `get` method but
// 1.x remove this feature
// This is stored on the socket as `socket.ev`
// It's also returned from the connection tracking in SocketIO

// This also contains the messaging interface to the "notifications"
// in the UI.


// logging modules
const { logger, debug } = require('oa-logging')('oa:event:evsocket');

// npm modules
// _                 = require 'lodash'

// OA modules
const { server_event }  = require('./eventemitter');
const { MongoPollers }  = require('./mongopollers');

const Errors            = require('./errors');
const { objhash, _ }    = require('oa-helpers');
const config            = require('./config').get_instance();



// ## EvSocket

class EvSocket {
  socket: any; id: any; MongoPollers: any;
  _event_filter: any; _event_group: any; _event_severity: any;
  _event_filter_running: any; _filter_room: any; ping_timer_id: any;

  constructor( socket, options ) {
    options ??= {};

    // #### @id
    // The socketio id
    this.socket = socket;
    this.id = this.socket.id;

    if (options.event_filter) {
      this.event_filter(options.event_filter);
    }

    // Attach mongopoller after circular dependencies are resolved
    this.MongoPollers = require('./mongopollers').MongoPollers;

    this._event_filter = {};
    this._event_group = 'All';
    this.ping_timer_id = null;
    this._filter_room = null;
  }


  init() {
    if (!this.ping_timer_id) { 
      debug("Starting server -> client ping [%s]", this.id);
      return this.ping();
    }
  }
  
  shutdown() {
    debug("Removing server -> client ping [%s]", this.id);
    return clearInterval(this.ping_timer_id);
  }

  ping() {
    const self = this;
    return this.ping_timer_id = setInterval(function(){
      debug("Emitting server -> client ping [%s]", self.id);
      return self.socket.emit('ping', {});
    }
    ,29000);
  }


  // ### user()
  // return the passport authed socket username
  user() {
    if (!this.socket.request?.user) {
      throw new Errors.SocketError('No user structure on socket.request');
    }
    return this.socket.request.user.username;
  }

  // ### email()
  // return the passport authed socket email address
  email() {
    if (!this.socket.request?.user) {
      throw new Errors.SocketError('No user structure on socket.request');
    }
    return this.socket.request.user.email;
  }


  // ###### rooms()
  // return the socket object of rooms, contianing member socket ids
  rooms() {
    if (!this.socket.adapter?.rooms) {
      throw new Errors.SocketError('No rooms structure on socket.adapter');
    }
    return this.socket.adapter.rooms;
  }


  // ###### group_filter( group )
  // Get/Set a group filter.. and names
  event_group( event_group ){
    if (event_group != null) {
      this._event_group = event_group;
      // handle when no group was specified
      if (event_group === 'No Group') { this._event_group = ''; }
      this.filter_room( true );
      return this._event_group;
    } else {
      return this._event_group;
    }
  }


  // ###### event_filter( mongo_filter )
  // Get/Set an event filter.. and names
  event_filter( event_filter ){
    if (event_filter != null) {
      this._event_filter = event_filter;
      this.filter_room( true );
      return this._event_filter;
    } else {
      return this._event_filter;
    }
  }


  // ###### event_severity( severity )
  // Get/Set an event filter.. and names
  event_severity( event_severity ){
    if (event_severity != null) {
      this._event_severity = event_severity;
      this.filter_room( true );
      return this._event_severity;
    } else {
      return this._event_severity;
    }
  }

  // ### event_filter_running()
  // Return the running event filter
  event_filter_running() {
    return this._event_filter_running;
  }


  // ### filter_room()
  // Manage the filter room for the current socket
  // The filter and group currently set are taken into account when
  // building the hash that identifies the room.
  //
  // The hash for the room name is built from the eventual mongo filter object
  //
  // The `objhash()` implementation is in oa-helpers
  //
  // The filter_room is left so it can possibly be cleaned up
  //
  filter_room( regen ){
    if (regen || (this._filter_room == null)) {
      // Create the new hash of a filter, and group
      this._event_filter_running = _.cloneDeep(this._event_filter);

      // FIXME needs a "_none"
      if ((this._event_group !== 'All') && (this._event_group !== undefined)) {
        debug('merging group to filter [%s] [%j]', this._event_group, this._event_filter);
        _.merge(this._event_filter_running, { group: this._event_group });
      }

      if ((this._event_severity !== 'All') && (this._event_severity !== undefined)) {
        debug('merging sev to filter [%s] [%j]', this._event_severity, this._event_filter);
        _.merge(this._event_filter_running, { severity: this._event_severity });
      }

      const old_filter_room = this._filter_room;
      this._filter_room = objhash(this._event_filter_running);
      
      const self = this;
      // callback to join the correct socketio room and start the poller
      const joinAndStart = function() {
        // join the new room
        debug('joining filter room [%s] [%j]', self._filter_room, self._event_filter_running);
        const socket_joined = self.socket.join(self._filter_room);
          // Get a poll on the room, or create a new one
        self.MongoPollers.fetch_id_and_start(self._filter_room,
          {filter: self._event_filter_running});
        return socket_joined;
      };
      
      // leave the old room if we were in one
      if (old_filter_room != null) {
        debug('leaving filter room [%s]', this._filter_room);
        // asynchronous call so requires 'joinAndStart' callback
        const socket_left = this.socket.leave(old_filter_room);
        return joinAndStart();
      } else { 
        return joinAndStart();
      }

    } else {
      return (this._filter_room != null);
    }
  }


  // ### message( type, msg, timeout, data )
  // Send a message to a socket client
  message( type, msg, timeout, data ){
    timeout ??= 10;
    return this.socket.emit('message', {
      type,
      message:  msg,
      timeout,
      data
    }
    );
  }

  // ### success( message, timeout, data )
  // Send a success message to a socket client
  success( msg, timeout, data ){
    timeout ??= 10;
    return this.message('Success', msg, timeout, data);
  }

  // ### info( message, timeout, data )
  // Send a info message to a socket client
  info( msg, timeout, data ){
    timeout ??= 10;
    logger.info(this.id, this.user(), 'client', msg);
    return this.message('Info', msg, timeout, data);
  }

  // ### info_title( message, timeout, data )
  // Send a info message to a socket client
  info_title( title, msg, timeout, data ){
    timeout ??= 10;
    logger.info(this.id, this.user(), 'client', msg);
    return this.message(title, msg, timeout, data);
  }

  // ### warn( message, timeout, data )
  // Send a warn message to a socket client
  warn( msg, timeout, data ){
    timeout ??= 10;
    logger.warn(this.id, this.user(), 'client', msg);
    return this.message('Warning', msg, timeout, data);
  }

  // ### error( message, timeout, data )
  // Send an error message to a socket client
  error( msg, timeout, data ){
    timeout ??= 10;
    logger.warn(this.id, this.user(), 'client', msg);
    return this.message('Error', msg, timeout, data);
  }

  // ### error( message, timeout, data )
  // Send an info message to a socket client, tag it with debug
  debug( msg, timeout, data ){
    timeout ??= 10;
    msg = `DEBUG: ${msg}`;
    logger.debug(this.id, this.user(), 'client', msg);
    return this.message('Info', msg, timeout, data);
  }

  // ### error( message, timeout, data )
  // Send a copy of an exception to a socket client
  exception( type, msg, timeout, data ){
    timeout ??= 0;
    logger.error(msg, type);
    return this.socket.emit('message', {
      error: type.toString(),
      message: msg,
      timeout,
      data
    }
    );
  }
}


module.exports.EvSocket = EvSocket;
