# # TinyCache

# A Tiny Cache
# Doesn't store falsey values!
# It is a little dumb, but tiny.

debug   = require('debug') 'oa:tinycache:tinycache'


# ## Error TinyCacheError
#
class TinyCacheError extends Error
  name: 'TinyCacheError'
  constructor: ( @message, options = {} )->
    @[key] = value for own key, value of options
    @name = 'TinyCacheError'
    Error.captureStackTrace(this, TinyCacheError) if Error.captureStackTrace


# ## Class TinyCache
#
class TinyCache
  
  # `new TinyCache({timeout: 100, limit: 100})`
  constructor: ( options = {} )->
    self = @

    # Set the default timeout for objects in the cache
    @timeout    = options.timeout or 60
    
    # Limit the total number of objects in the cache
    @limit      = options.limit or 1000

    # Keep expired objects, up to limit
    # Useful for failure caches
    @keep       = !!options.keep or false

    # Supply a callback to run on expirey
    # For example a log call
    @expirey_cb = options.expirey_cb
    # and force expirey
    @force_expirey_cb = options.force_expirey_cb
    
    # Supply a callback to be run on error
    @error_cb   = options.error_cb

    # Run the expire on a timer, in seconds
    @bg_expire  = options.bg_expire or false
    @bg_expire_timer = null

    # Don't actively expire items on get, unless we hit the limit
    @limit_expire_only  = !!options.limit_expire_only

    if @bg_expire
      @bg_expire_timer = setInterval ->
        debug 'background expire triggered'
        self.expire.apply self
      , @bg_expire*1000

    # Initialise the cache store
    @init()

    #@promise = options.promise or undefined

  # #### Set in the store
  # `set( id, value )`
  set: ( id, value )->
    debug 'set', id
    unless value
      throw new TinyCacheError "Can't store falsey values: #{value}", 
        value: value
    cache_value = new TinyCacheItem( value, @timeout )
    @store.delete( id )
    @store.set( id, cache_value )
    if !@bg_expire and @store.size > @limit
      @expire()
    return value

  # #### Get from the store
  # `get( id )`
  get: ( id )->
    debug 'get', id
    obj = @store.get( id )
    return false unless obj
    if obj.expired()
      debug 'get is expired, return false', id, obj.expires
      if !@limit_expire_only then @del( id )
      return false
    obj.value()

  # #### Get from the store, even if expired
  # `get_any( id )`
  get_any: ( id )->
    debug 'get', id
    obj = @store.get( id )
    return false unless obj
    if obj.expired()
      debug 'get is expired, getting anyway', id, obj.expires
    obj.value()

  # #### Delete from the store
  # `del( id )`
  del: ( id )->
    debug 'del', id
    @store.delete( id )

  # #### Trigger expire run
  # Removes any expired elements in the cache
  # `expire( id )`
  # Should add a timer to run expire
  # Should add a hard expire as this can grow
  # Should add an lru expire
  expire: ()->
    err = null
    debug 'Running expire', @store.keys()
    if !@limit_expire_only
      # es6 maps and cs don't mix. can't break out of a `forEach` easily.
      #@store.forEach ( obj, id, object )=>
        #@del id if obj.expired()
      iter = @store.entries()
      while(item = iter.next(); !item.done)
        [id, obj] = item.value
        if obj.expired() then @del( id ) else break

    if @store.size > @limit
      debug 'Store size [%s] is greater than limit [%s], force expire', @store.size, @limit
      err = 'had to force expire'
      @schedule_expire_force()

    @expirey_cb err, @store.size if @expirey_cb
    @store.size

  schedule_expire_force: ()->
    if @expire_force_scheduled
      debug 'expire force already scheduled or running'
      return
    @expire_force_scheduled = true
    process.nextTick =>
      @expire_force.apply(@)
      @expire_force_scheduled = false

  # #### Trigger expire run
  # Removes the oldest expired elements in the cache higher
  # `expire_force()`
  expire_force: ()->
    err = null
    start_size = @store.size
    debug 'Running force expire', @store.keys()
    return unless @store.size > @limit

    iter = @store.entries()
    while(item = iter.next(); !item.done)
      [id, obj] = item.value
      @del id
      ninety_percent = @limit - Math.floor(@store.size/10)
      if @store.size < ninety_percent
        debug 'back below limit [%s] for current size [%s]', @limit, @store.size
        @force_expirey_cb err, @store.size if @force_expirey_cb
        return @store.size
    @force_expirey_cb 'force expirey did not expire enough', @store.size if @force_expirey_cb
    @store.size

  # #### Drop the store
  # Remove all elements in the store
  # `dump()`
  drop: -> @init()
  init: ->
    @store = new Map()

  total: -> @store.size

  # In case you are discarding the TinyCache often enough to care
  cleanup: ->
    debug 'bg_expire_timer', @bg_expire_timer
    if @bg_expire_timer then clearInterval(@bg_expire_timer)

  # # Get or retrieve via a function/callback if expired
  # fetch: ( id, cb )->
  #   value = get id
  #   return cb value if value
  #   @callback ( err, value )->
  #     set id, value unless err
  #     cb err, value

  # # Get or retrieve via a promise, if expired
  # fetchAsync: ( id )->
  #   new Promise ( resolve, reject )->
  #     value = get id
  #     return resolve value if value
  #     @promise().then ( value )->
  #       set id, value
  #       resolve value
  #     .catch ( err )->
  #       reject err


# ## Class TinyCacheItem

# A single cache item which tracks the value and
# the create/expire/access time
#
class TinyCacheItem

  constructor: ( value, timeout = 60 )->
    @created  = Date.now()
    @accessed = @created
    @timeout  = timeout
    @expires  = @created + (@timeout*1000)
    @_value   = value

  # `.expires` is tracked in TinyCache too.
  # value_expirey: ->
  #   @accessed = Date.now()
  #   @expires  = @accessed + (@timeout*1000)
  #   @_value

  value: ->
    @accessed = Date.now()
    @_value

  expired: -> ( Date.now() > @expires )


# #### Exports
module.exports =
  TinyCache: TinyCache
  TinyCacheItem: TinyCacheItem
  TinyCacheError: TinyCacheError