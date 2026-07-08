//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Mongoose

// Manage the mongoose connection. Provide some helper functions

// ### Modules
// Logging
const { logger, debug}  = require('oa-logging')('oa:event:mongoose');

// Npm
const mongoose          = require('mongoose');
const Promise: any      = require('bluebird');

// OA
const { SocketIO }      = require('./socketio');
const config            = require('./config').get_instance();
const { timer,
  _,
  objhash }       = require('oa-helpers');
const { server_event }  = require('./eventemitter');



// ### Mongoose client

// Simple wrapper for including mongoose, attaching some data  and providing some
// helper functions


var Mongoose = (function() {
  let self = undefined;
  Mongoose = class Mongoose {
    static mongoose: any; static db: any; static last_query_time: any;
    static connected: any; static connect_limit: any; static connect_count: any;
    static alerts: any; static alertoccurrences: any; static event_rsyslog: any;
    static rulematches: any; static inventory: any; static raw_stream: any;

    static initClass() {
      const self = this;
      this.mongoose =  mongoose;
      this.db = this.mongoose.connection;
      this.last_query_time = new Date;
   
      // Connection Limits
      this.connected = false;
      this.connect_limit = config.mongodb.max_connects;
      this.connect_count = 0;
  
      // External collections, model controlled by event_server
      this.alerts = this.db.collection('alerts');
      this.alertoccurrences = this.db.collection('alertoccurrences');
      this.event_rsyslog = this.db.collection('event_rsyslog');
      this.rulematches = this.db.collection('rulematches');
      this.inventory = this.db.collection('inventories');
      
      // Emit errors
      this.db.on('error', function(error) {
        logger.error('Mongoose error:', error.message, error.stack, error);
        return server_event.emit('error', error);
      });
  
      this.db.on('disconnect', () => logger.error('Mongoose is disconnected from the mongo database'));
  
      // Emit connect
      this.db.once('open', function(cb) {
        logger.info('Mongoose is connected to the mongo database');
        return server_event.emit('mongodb::connect', "db connected", self.db);
      });
  
      // Play nice on exit
      process.on('SIGINT', function() {
        logger.info('Closing mongoose connection');
        return mongoose.connection.close(function() {
          logger.info('Mongoose connection disconnected on sigint');
          return process.exit(0);
        });
      });
    }


    // initial connect
    static connect( connect_cb ) {
      const self = this;
      if (this.connected) {
        connect_cb(null, this.db);
        return this.db;
      }
      debug('creating a mongoose connection', config.mongodb);
      if (!config.mongodb.uri) {
        if (connect_cb) {
          return connect_cb("config.mongodb.uri is undefined");
        } else {
          throw new Error("config.mongodb.uri is undefined");
        }
      }

      this.do_connect( connect_cb );
      return this.db;
    }

    static do_connect( connect_cb ){
      const self = this;
      this.connect_count += 1;
      if (this.connect_count >= this.connect_limit) {
        server_event.emit('fatal', `Too many connection attempts: ${self.connect_count}`);
      }
      debug('DB ', this.db);
      // https://mongoosejs.com/docs/5.x/docs/deprecations.html
      // used by :
      //   User.update_data -> User.findByIdAndUpdate()
      return this.db.openUri(config.mongodb.uri, {})
      .then(function(onFulFill, onRejected){
       if (onRejected) {
          logger.error("connection rejected", onRejected);
          debug('connect err!', onRejected, config.mongodb.uri);
          logger.warn(`Error with initial connection. Retrying[${self.connect_count}] in 2s`, onRejected.stack);
          setTimeout(() => self.do_connect(connect_cb)
          , 2000);
          return;
        }
       if (onFulFill) {
          logger.info("connection open cb", config.mongodb.uri);
          self.connect_count = 0;
          self.connected = true;
          if (connect_cb) { connect_cb(null, self.db); }
          return self.db;
        }
      });
    }
      
    // ###### @.recids_to_objectid( ids )

    // Create mongoose object ids from id strings
    static recids_to_objectid(ids) {
      return ids.map((id) =>
        this.recid_to_objectid(id));
    }


    // ###### @.recid_to_objectid( ids )

    // Create a mongoose object id from an id string
    static recid_to_objectid(id) {
      return mongoose.Types.ObjectId(id);
    }


    // ###### @.recid_to_objectid_false( ids )

    // Catch all objectid errors, return false
    static recid_to_objectid_false(id) {
      if (id == null) {
        return false;
      }

      if (!_.isString(id)) {
        return false;
      }
  
      if (!/^[0-9a-f]{24}$/i.test(id)) {
        return false;
      }

      return mongoose.Types.ObjectId(id);
    }

    static recids_to_objectids_false(ids){
      const oids = [];
      for (var id of ids) {
        var oid = this.recid_to_objectid_false(id);
        if (oid !== false) { oids.push(oid); }
      }
      return oids;
    }

    // ###### @.recid_to_objectid_safe( ids )

    // Catch all objectid errors, throwing nice info on where you went wrong
    static recid_to_objectid_safe(id) {
      if (!id) {
        throw new Error("No event id on message");
      }

      if (!_.isString(id)) {
        throw new Error(`Event id not a string [${typeof id}] [${id}]`);
      }
  
      if (!/^[0-9a-f]{24}$/i.test(id)) {
        throw new Error(`Invalid event id on msg [${id}]`);
      }

      return mongoose.Types.ObjectId(id);
    }


    // Allow something to run on the stream of events in the mongodb
    // capped collection.
    //@event_raw_stream: ( cb )->
    static event_raw_stream() {
      const filter = {};

      if (this.raw_stream) {
        return this.raw_stream;
      }

      this.raw_stream = this.event_rsyslog
        .find(filter, { tailable: true, awaitData: true, noCursorTimeout: true, numberOfRetries: Number.MAX_VALUE})
        .comment('event_raw_stream');
            
      // Send the data out
      this.raw_stream.on('data', function( doc ){
        debug('raw_stream', {document: doc});
        return SocketIO.io.to('raw_stream').emit('events::raw_stream', {document: doc});
      });
        //cb null, document: doc

      // Send the data out
      this.raw_stream.on('error', function( error ){
        debug('raw_stream', {error});
        return SocketIO.io.to('raw_stream').emit('events::raw_stream', {error});
      });
        //cb null, document: doc

      // Send the data out
      this.raw_stream.once('end', function( doc ){
        debug('raw_stream finished');
        return SocketIO.io.to('raw_stream').emit('events::raw_stream', {message: 'finished'});
      });
        //cb null, message: 'finished'

      return this.raw_stream;
    }
  };
  Mongoose.initClass();
  return Mongoose;
})();


module.exports.Mongoose = Mongoose;
