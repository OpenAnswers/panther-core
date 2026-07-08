
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// ### MongoPollers

// A class to manage polling of a db for a filter, once per filter


// Logging module
const { logger, debug}  = require('oa-logging')('oa:event:mongopollers');

// OA modules
const { MongoPoll, MongoSummaryPoll } = require('./mongopoll');
const { _,
  objhash }       = require('oa-helpers');
const { server_event }  = require('./eventemitter');
const Promise: any      = require('bluebird');

const config            = require('./config').get_instance();


// ### MongoPollers

// MongoPollers stores a set of MongoPoll by the hash of the mongo
// "filter" object. So for any hash, you only have one MongoPoll


class BaseMongoPollers {
  static instances: any;
  static pollImpl: any;

  static initClass() {
    this.instances = {};
    this.pollImpl = undefined;
  }

  static add( options ){
    debug('add', options);
    const poll = new this.pollImpl(options);
    return this.instances[poll.filter_hash] = poll;
  }


  // ## By filter

  static get( filter ){
    debug('get', filter);
    const filter_hash = objhash(filter);
    return this.get_id(filter_hash);
  }

  static fetch( filter, options ){
    options ??= {};
    debug('fetch', filter);
    if (options.filter == null) { options.filter = filter; }
    const filter_hash = objhash(filter);
    return this.fetch_id(filter_hash, options);
  }

  static delete( filter ){
    debug('delete', filter);
    const filter_hash = objhash(filter);
    return this.delete_id(filter_hash);
  }


  // ## By filter_hash

  static get_id( filter_hash ){
    debug('get_id', filter_hash);
    return this.instances[filter_hash] ?? false;
  }

  static fetch_id( filter_hash, options ){
    options ??= {};
    debug('fetch_id', filter_hash, (this.instances[filter_hash] != null));
    return this.instances[filter_hash] ?? this.add(options);
  }

  static delete_id( filter_hash ){
    debug('delete_id', filter_hash);
    if (this.instances[filter_hash] != null) {
      this.instances[filter_hash].stop();
      delete this.instances[filter_hash];
      return true;
    } else {
      return false;
    }
  }

  static fetch_id_and_start( filter_hash, options ){
    options ??= {};
    const poll = this.fetch_id(filter_hash, options);
    poll.start();
    return poll;
  }


  // ###### emit_current_ids()
  // We need some way to track changes that aren't in a users view/filter.
  // Deletes are one case. People moving an event out of their current
  // view/filter is another.
  static emit_current_ids( options ){
    options ??= {};
    const { type } = options;
    debug('emitting current ids for all filters');

    const arr = _.toArray( this.instances );

    const finalPromise = Promise.map(arr, function(instance){
      debug("sending ids to filter [%s] [%j]", instance.pollerIdentifier, instance.filter);
      return instance.emit_current_ids(options);
    });
    return finalPromise.then(finalResult => true);
  }
}
BaseMongoPollers.initClass();


// class singletons, no constructors
class MongoPollers extends BaseMongoPollers {
  static instances: any;
  static pollImpl: any;

  static initClass() {
    this.instances = {};
    this.pollImpl = MongoPoll;
  }
}
MongoPollers.initClass();

class MongoSummaryPollers extends BaseMongoPollers {
  static instances: any;
  static pollImpl: any;

  static initClass() {
    this.instances = {};
    this.pollImpl = MongoSummaryPoll;
  }
}
MongoSummaryPollers.initClass();

module.exports = { BaseMongoPollers, MongoPollers, MongoSummaryPollers };
