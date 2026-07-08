
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # MongoPoll

// A class to manage polling of a db for a filter/view.
// It maintains only instance per filter/view via a hash of the filter object


// Logging module
const { logger, debug}  = require('oa-logging')('oa:event:mongopoll');

// npm modules
const Promise: any      = require('bluebird');

// OA modules
// SocketIO is lazily required inside mongopoll_base_init to break the
// socketio -> mongopollers -> mongopoll -> socketio circular dependency.
const { timer,
  _,
  objhash }       = require('oa-helpers');
const { server_event }  = require('./eventemitter');

const config            = require('./config').get_instance();

//{ promiseFilterSummary } = require('../lib/queries')



class MongoPollBase {
  SocketIO: any; sleep: any; emitter: any;
  pollerIdentifier: any; index: any; last_query_value: any;
  debug: any; running: any;

  promise(): any { return undefined; } // overridden by subclass

  constructor(){}

  mongopoll_base_init( options ){
    options ??= {};

    debug('new', options);

    // Store SocketIO after circular dependencies have been resolved
    this.SocketIO = require('./socketio').SocketIO;

    // #### @sleep
    // The gap between polls
    this.sleep  = options.sleep ?? config.mongodb.timer ?? 30000;


    // #### @emitter
    // The function to run on success
    const self =  this;
    //@emitter = options.emitter

    if (!_.isFunction(this.emitter)) { //or @promise _.isFunction
      logger.error('MongoPollBase requires an emitter function');
      throw new Error('MongoPollBase requires an emitter function');
    }

    if (!_.isFunction(this.promise)) {
      logger.error('MongoPollBase requires a promise function');
      throw new Error('MongoPollBase requires a promise function');
    }

    if (!this.pollerIdentifier) {
      logger.error('MongoPollBase requires an identifier');
      throw new Error('MongoPoll requires an identifier');
    }

 
    // #### @last_query_value
    // The last index to be returned
    // This is where the next poll will pick up from
    this.last_query_value = new Date();

    // #### @debug
    // Create a debug for this instance, so we don't need to include
    // the filterhash/roomid everywhere
    this.debug  = require('debug')("oa:event:mongopoll:base");

    logger.info('Created poller on [%s] every [%s]ms',
      this.index, this.sleep);

    // Start it up
    return this.start();
  }


  // ### stop()
  // Stop the poller form running
  stop() {
    // need some way of signalling mongopollers I am gone
    return this.running = false;
  }


  // ### start()
  // Kick off a poll
  start() {
    if (this.running) {
      logger.debug('poll already running');
      return true;
    }

    const promise = this.promise();
    this.running = true;
    return promise;
  }
}





// ### MongoPoll

// This where updates are pulled from the database
// and pushed out to the clients for a view/filter
// We have an instance of MongoPoll for each view/filter
// currently in use.

// Multiple users/sockets share a single MongoPoll by joing
// a room named via a sha256 checksum of the view/filter object

class MongoPoll extends MongoPollBase {
  filter: any; filter_hash: any;

  constructor( options ){
    options ??= {};

    debug('new', options);

    // #### @filter
    // This is filter to poll for
    if (options.filter == null) {
      logger.error('No filter for new poll');
      throw new Error('No filter for new poll');
    }
    super();
    this.filter = options.filter;

    // #### @index
    // The mongo index field used to track each poll query
    // Greater than last query will grab all previous
    // This field should be indexed in the db!!
    this.index  = options.index ?? 'state_change';

  
    // #### @filter_hash
    // And the filter hash for the filter, which may be
    // expensive to generate, so save it
    this.filter_hash = objhash(this.filter);
    this.pollerIdentifier = this.filter_hash;

    // #### @emitter
    // The function to run on success
    const self =  this;
    const default_emitter  = function( docs ){
      self.debug('emitting deltas', docs);
      return self.SocketIO.io.to(self.filter_hash).emit('deltas', {
        updates: docs,
        inserts: []
      });
    };

    this.emitter = options.emitter ?? default_emitter;
    this.mongopoll_base_init(options);
  }


  // ### promise()
  // This is a recursive promise. once it had delayed and the db_find is complete
  // it will call itself again, if anyone is still listening to this filter. 
  promise() {
    debug('Scheduling db_find promise', this.pollerIdentifier, this.sleep);
    
    // Class access in the promise
    const self = this;

    return Promise.delay( self.sleep ).then(function() {
      // Convenient place to tell clients which ids should be in their view
      // This is for handling events that have been altered without emitting
      // a server side event. e.g. backend triggers or manual deletion from DB
      self.emit_current_ids({});

      // find and emit events for filtered room to client.
      return self.db_find(undefined, undefined);}).then(function( res ) {
      if (self.SocketIO.room_has_members(self.pollerIdentifier)) {
        // Run this delay/query again
        self.promise();
      } else {
        //logger.info "Ceasing poll for [%j] with hash [%s] as it's so lonely",
        //  self.filter, self.filter_hash
        logger.info("Ceasing poll for [%s] with hash [%s] as it's so lonely",
          self.filter,
          self.pollerIdentifier);
        self.stop();
      }

      return true;
    });
  }

    // .catch (err) ->
    //   self.stop()
    //   logger.error err
    //   throw err


  // ### db_find( @filter, @emitter )
  // Find updates for a filter, repeatedly
  // Should be setup on a room when a client sets a filter, or on connection
  // for the users default filter
  db_find( filter?, emitter? ){
    if (filter == null) { ({
      filter
    } = this); }
    if (emitter == null) { ({
      emitter
    } = this); }
    const self = this;
    this.debug('db_find running for filter', filter);
    if (filter == null) { throw new Error('No filter for db_find'); }
    
    // Create an object to hold our query and get the latest updates
    return self.get_since_async(filter, self.index, self.last_query_value)
    .then(function( docs ) {

      if ((docs != null) && (docs.length > 0)) {
        //js_docs = JSON.stringify docs
        // Get the first `index` fields value.
        // This can cause problems if you have a lot of data going into the DB
        // and your filter doesn't update often and your index field isn't indexed.
        const last_query_value = _.first(docs)[self.index];
        if (last_query_value == null) { throw new Error(`No field on document [${self.index}]`); }

        self.debug('sending [%s] docs for [%j]', docs.length, filter);
        logger.debug('Got [%s] doc updates from db, sending to emitter', docs.length);

        // Now we are happy, save the last query and emit the data
        self.last_query_value = last_query_value;
        return emitter(docs);
        
      } else {
        return self.debug('MongoPoll found nothing for filter - %j', self.filter);
      }}).catch(function( error ){
      // Not sure if a query error should crash or just error.
      // Depend if they are db connection related or specifically
      // about the query.
      // the db does have an 'error' event which will crash it
      self.stop();
      logger.error(error);
      throw error;
    });
  }


  // ###### get_since_async( filter, index, last )
  // Run the query getting anything newer than a previous `index`
  get_since_async( filter, index, last ){
    
    const query = _.clone(filter);
    query[index] = { '$gt': last };
    
    const sort = {};
    sort[index] = -1;

    filter = {
      history: false,
      notes: false,
      matches: false
    };
    
    return require('./mongoose').Mongoose.alerts
      .find(query, filter)
      .sort(sort)
      .toArray();
  }


  // ###### emit_current_ids()
  // We need some way to track changes that aren't in a users view/filter.
  // Deletes are one case. People moving an event out of the view/filter to another.
  // Currently this is a bit of a hack, but we send out all the ID's that should be 
  // in a filter and the client can check that list against it's local view
  emit_current_ids( options ){
    options ??= {};
    const self = this;
    const {
      filter
    } = this;

    // The all filter ({}) doesn't need a list of ids
    // This is the sha hash for {}
    // If the objhash implementation changed... this would change!
    if ((this.filter_hash === "bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f") &&
        (options.type !== 'clear')) {
      return;
    }

    const p = require('./mongoose').Mongoose.alerts
      .find(filter, { _id: 1 })
      .toArray();
    debug("Finder returned");

    return p.then(function( ids ) {
      const ids_obj = {};
      for (var doc of ids) {
        ids_obj[doc['_id']] = 1;
      }
      debug('emitting current ids for filter [%s]', self.filter_hash, ids_obj);

      // Emit the ids to the view/filter room
      self.SocketIO.io.to(self.filter_hash).emit('events::ids',
        {ids: ids_obj});

      return ids_obj;}).catch(function( error ){
      throw error;
    });
  }
}

// FIXME
// this needs a refactor to reuse the common parts of MongoPoll

class MongoSummaryPoll extends MongoPollBase {
  filter_hash: any;

  constructor( options ){
    options ??= {};
    super();
    this.filter_hash = objhash(options);
    this.pollerIdentifier = this.filter_hash;

    // #### @emitter
    // The function to run on success
    const self =  this;
    const default_emitter  = function( docs ){
      self.debug('emitting summary', self.filter_hash, docs);
      return self.SocketIO.io.to("summary").emit('events::severities', docs);
    };

    this.emitter = options.emitter ?? default_emitter;
    this.mongopoll_base_init(options);
  }


  // ### promise()
  // This is a recursive promise. once it had delayed and the db_find is complete
  // it will call itself again, if anyone is still listening to this filter. 
  promise() {
    debug('Scheduling summary db_find promise', this.filter_hash, this.sleep);
    
    // Class access in the promise
    const self = this;

    return Promise.delay( self.sleep ).then(() => self.db_find()).then(function( res ) {
      // Run this delay/query again
      self.promise();

      return true;
    });
  }

  db_find( emitter? ){
    if (emitter == null) { ({
      emitter
    } = this); }
    const { promisedFilterSummary } = require('./queries');
    return promisedFilterSummary()
    .then(function( docs ) {
      if (docs) {
        docs.groups = config.rules.set.groups.store_order;
        debug("Emitting summary DOCS");
        return emitter(docs);
      }
    });
  }
}

module.exports.MongoPoll = MongoPoll;
module.exports.MongoSummaryPoll = MongoSummaryPoll;