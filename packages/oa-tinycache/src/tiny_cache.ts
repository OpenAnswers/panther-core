// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # TinyCache

// A Tiny Cache
// Doesn't store falsey values!
// It is a little dumb, but tiny.

const debug = require('debug')('oa:tinycache:tinycache');

// ## Error TinyCacheError
//
class TinyCacheError extends Error {
  static initClass() {
    this.prototype.name = 'TinyCacheError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    for (var key of Object.keys(options || {})) {
      var value = options[key];
      this[key] = value;
    }
    this.name = 'TinyCacheError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TinyCacheError);
    }
  }

  // Error.prototype sets `message` as a non-enumerable own property, so the
  // default JSON.stringify(err) drops it. Attach toJSON so name, message, and
  // any copied options survive serialization (log pipelines, IPC, etc).
  toJSON() {
    const json: any = { name: this.name, message: this.message };
    for (const key of Object.keys(this)) {
      if (key !== 'name' && key !== 'message') {
        json[key] = (this as any)[key];
      }
    }
    return json;
  }
}
TinyCacheError.initClass();

// ## Class TinyCache
//
class TinyCache {
  // `new TinyCache({timeout: 100, limit: 100})`
  constructor(options) {
    if (options == null) {
      options = {};
    }
    const self = this;

    // Set the default timeout for objects in the cache
    this.timeout = options.timeout || 60;

    // Limit the total number of objects in the cache
    this.limit = options.limit || 1000;

    // Keep expired objects, up to limit
    // Useful for failure caches
    this.keep = !!options.keep || false;

    // Supply a callback to run on expirey
    // For example a log call
    this.expirey_cb = options.expirey_cb;
    // and force expirey
    this.force_expirey_cb = options.force_expirey_cb;

    // Supply a callback to be run on error
    this.error_cb = options.error_cb;

    // Run the expire on a timer, in seconds
    this.bg_expire = options.bg_expire || false;
    this.bg_expire_timer = null;

    // Don't actively expire items on get, unless we hit the limit
    this.limit_expire_only = !!options.limit_expire_only;

    if (this.bg_expire) {
      this.bg_expire_timer = setInterval(function () {
        debug('background expire triggered');
        return self.expire.apply(self);
      }, this.bg_expire * 1000);
    }

    // Initialise the cache store
    this.init();
  }

  //@promise = options.promise or undefined

  // #### Set in the store
  // `set( id, value )`
  set(id, value) {
    debug('set', id);
    if (!value) {
      throw new TinyCacheError(`Can't store falsey values: ${value}`, { value });
    }
    const cache_value = new TinyCacheItem(value, this.timeout);
    this.store.delete(id);
    this.store.set(id, cache_value);
    if (!this.bg_expire && this.store.size > this.limit) {
      this.expire();
    }
    return value;
  }

  // #### Get from the store
  // `get( id )`
  get(id) {
    debug('get', id);
    const obj = this.store.get(id);
    if (!obj) {
      return false;
    }
    if (obj.expired()) {
      debug('get is expired, return false', id, obj.expires);
      if (!this.limit_expire_only) {
        this.del(id);
      }
      return false;
    }
    return obj.value();
  }

  // #### Get from the store, even if expired
  // `get_any( id )`
  get_any(id) {
    debug('get', id);
    const obj = this.store.get(id);
    if (!obj) {
      return false;
    }
    if (obj.expired()) {
      debug('get is expired, getting anyway', id, obj.expires);
    }
    return obj.value();
  }

  // #### Delete from the store
  // `del( id )`
  del(id) {
    debug('del', id);
    return this.store.delete(id);
  }

  // #### Trigger expire run
  // Removes any expired elements in the cache
  // `expire( id )`
  // Should add a timer to run expire
  // Should add a hard expire as this can grow
  // Should add an lru expire
  expire() {
    let err = null;
    debug('Running expire', this.store.keys());
    if (!this.limit_expire_only) {
      // es6 maps and cs don't mix. can't break out of a `forEach` easily.
      //@store.forEach ( obj, id, object )=>
      //@del id if obj.expired()
      let item;
      const iter = this.store.entries();
      while (((item = iter.next()), !item.done)) {
        var [id, obj] = Array.from(item.value);
        if (obj.expired()) {
          this.del(id);
        } else {
          break;
        }
      }
    }

    if (this.store.size > this.limit) {
      debug('Store size [%s] is greater than limit [%s], force expire', this.store.size, this.limit);
      err = 'had to force expire';
      this.schedule_expire_force();
    }

    if (this.expirey_cb) {
      this.expirey_cb(err, this.store.size);
    }
    return this.store.size;
  }

  schedule_expire_force() {
    if (this.expire_force_scheduled) {
      debug('expire force already scheduled or running');
      return;
    }
    this.expire_force_scheduled = true;
    return process.nextTick(() => {
      this.expire_force.apply(this);
      return (this.expire_force_scheduled = false);
    });
  }

  // #### Trigger expire run
  // Removes the oldest expired elements in the cache higher
  // `expire_force()`
  expire_force() {
    let item;
    const err = null;
    const start_size = this.store.size;
    debug('Running force expire', this.store.keys());
    if (!(this.store.size > this.limit)) {
      return;
    }

    const iter = this.store.entries();
    while (((item = iter.next()), !item.done)) {
      var [id, obj] = Array.from(item.value);
      this.del(id);
      var ninety_percent = this.limit - Math.floor(this.store.size / 10);
      if (this.store.size < ninety_percent) {
        debug('back below limit [%s] for current size [%s]', this.limit, this.store.size);
        if (this.force_expirey_cb) {
          this.force_expirey_cb(err, this.store.size);
        }
        return this.store.size;
      }
    }
    if (this.force_expirey_cb) {
      this.force_expirey_cb('force expirey did not expire enough', this.store.size);
    }
    return this.store.size;
  }

  // #### Drop the store
  // Remove all elements in the store
  // `dump()`
  drop() {
    return this.init();
  }
  init() {
    return (this.store = new Map());
  }

  total() {
    return this.store.size;
  }

  // In case you are discarding the TinyCache often enough to care
  cleanup() {
    debug('bg_expire_timer', this.bg_expire_timer);
    if (this.bg_expire_timer) {
      return clearInterval(this.bg_expire_timer);
    }
  }
}

// # Get or retrieve via a function/callback if expired
// fetch: ( id, cb )->
//   value = get id
//   return cb value if value
//   @callback ( err, value )->
//     set id, value unless err
//     cb err, value

// # Get or retrieve via a promise, if expired
// fetchAsync: ( id )->
//   new Promise ( resolve, reject )->
//     value = get id
//     return resolve value if value
//     @promise().then ( value )->
//       set id, value
//       resolve value
//     .catch ( err )->
//       reject err

// ## Class TinyCacheItem

// A single cache item which tracks the value and
// the create/expire/access time
//
class TinyCacheItem {
  constructor(value, timeout) {
    if (timeout == null) {
      timeout = 60;
    }
    this.created = Date.now();
    this.accessed = this.created;
    this.timeout = timeout;
    this.expires = this.created + this.timeout * 1000;
    this._value = value;
  }

  // `.expires` is tracked in TinyCache too.
  // value_expirey: ->
  //   @accessed = Date.now()
  //   @expires  = @accessed + (@timeout*1000)
  //   @_value

  value() {
    this.accessed = Date.now();
    return this._value;
  }

  expired() {
    return Date.now() > this.expires;
  }
}

// #### Exports
module.exports = {
  TinyCache,
  TinyCacheItem,
  TinyCacheError,
};
