# # OA Logging

# Provide a winston based logger and a debug instance with a commont tag
# A RequstLogger is also attached for express apps
#
#     { logger, debug } = require('oa-logging')('oa:module:class')
#
# or javascript 
#
#     var ref = require('oa-logging')('oa:module:class')
#     var logger = ref.logger
#     var debug  = ref.debug


# #### Modules

debug   = require('debug')('oa:logging')
winston = require 'winston'
{ ensure_array, random_string, _ } = require 'oa-helpers'


# ### Default Logger Options

# Create a single default winston logger instance that is the parent of 
# all the class tagged EventLoggers

# This means you can't do thing like send some classes to particular
# files (unless there's something in winston to direct on tags)

default_console_options =

# Default the level to info
  level: 'info'
# Give it colours
  colorize: true
# Include timestamps
  timestamp: true
# Don't use the winston exception handler as things go a bit wierd
  handleExceptions: false

# Create the logger with the transport set to the console, using the above options 
default_transports = [
  new winston.transports.Console default_console_options
]

default_logger = new winston.Logger({
  transports: default_transports
})

# Tell someone that we have setup the logger
debug 'logger setup'
default_logger.debug 'logger setup'


# The default formmater is not in use.. but could be used to set a default format different to 
# what winston ships with
default_formatter = (options) ->
  options.timestamp()
  options.level.toUpperCase()
  options.message || ''
  JSON.stringify options.meta?




# ## EventLogger

# Create our own winston instance that lets us log
# a metadata "tag" on top of a single winston logger instance.
# Notional child loggers, all using the one parent transport or
# set of transports. Helps for tracking where the loggin is coming 
# from.

# Idea based on https://github.com/citrix-research/node-winston-context

#     evl_a = new EventLogger winston_logger, 'my-special-name'
#     evl_a.info 'data'
#
#     => info: data logger=my-special-name

# All EventLoggers will have metadata `{ logger: @name }` attached
# You can attach extra if needed:

#     evl_b = new EventLogger winston_logger, 'my-blarg-name', { id = 'brap' }
#     evl_b.warn 'data'
#
#     => warn: data logger=my-sblarg-name id=brap

# You can create child loggers that will have attach extra data to the 
# `logger` meta data. So you could attach a logger with the socketid to a 
# socketio client, then all requests would be logged with that session id. 

#     evl_c = new EventLogger evl_a, 'extra-name'
#     evl_c.error 'oh no'
#
#     => error oh no logger=[ my-special-name, extra-name ]

class EventLogger
 
  # ###### `EventLogger.generate()`
  # Build a new event logger from a name
  @generate: ( name, logger = default_logger )->
    new EventLogger default_logger, name
 
  # ###### `new EventLogger( Logger, name, metadata )`
  constructor: ( @parent, @name, @metadata = {} ) ->

    # `parent` is the winston logger instance
    # `name` is the name for this logger, appended to all log entries
    # `metadata` is any additional metadata you want logger with this instance

    debug 'EventLogger constructor', @name, @metadata
    
    # Set the metadata for the logger, merging the parents metadata if needed
    if @parent.metadata?
      @merge_parent_metadata()
    else
      @metadata.logger = @name

    # `head` is the first parent logger, the grandaddy
    # There's only one real winston logger instance at the top. 
    # Everything else is just a metadata variant
    @head = if @parent.head? then @parent.head else @parent
      
    # Attach the different `level` helper functions to our instance
    @build_methods()

    debug 'EventLogger @metadata is ', @name, @metadata

  # ###### `.merge_parent_metadata`
  # Not sure an array is the best way to structure the data for
  # child loggers for think like querying the data later (using a transport that 
  # store the fields. I can't think of a better way to nest the children loggers ??
  merge_parent_metadata: ->
    _.defaults @metadata, @parent.metadata
    @metadata.logger = ensure_array @metadata.logger
    @metadata.logger.push @name

  # ###### `EventLogger.build_method( EventLogger, level )`
  # Creates a dynamic `level` method for the new logger
  # during instance construction
  @build_method: ( self, level ) ->
    ( args... ) ->
      method = level
      log_args = [ level, args... ]
      self.log.apply( self, log_args )
  
  # ###### `.build_methods( levels )` 
  # Builds all the winston log level functions on our EventLogger
  build_methods: (levels) ->
    debug 'building methods', _.keys(@head.levels)
    for level in _.keys(@head.levels)
      @[level] = EventLogger.build_method @, level

  # Add an error id producing error logger `error_id`
  # it attaches or adds `error_id` metadata
  error_id: ( args... )->
    error_id = random_string 8
    last_arg = _.last(args)
    if _.isObject( last_arg )
      last_arg.error_id = error_id unless last_arg.error_id
    else
      args.push { error_id: error_id }

    @error( args...)
    
    # give the called the id, note this will kill 
    # winstons possible chaining as we are not returning `this`
    error_id


  # ###### `.log( level, message, args... )` 
  
  # Main proxy function to Winston `log`
  # Does all the arg processing winstons `.log` does
  # We merge our instance metadata in here
  log: (level, msg, args... ) ->
    #debug 'log called with', level, msg, args...

    # Do what the winston `.log` does with args...
    while typeof _.last(args) is 'null'
      args.pop()

    callback = if typeof _.last(args) is 'function'
      args.pop()
    else
      null

    # Now we can get at the metadata, to append our loggers metadata
    # I don't know why winston used this setup. If you ever log an object
    # last, it doesn't do what you expect!
    metadata = if typeof _.last(args) is 'object'
      metadata = _.clone args.pop()
      _.assign( metadata, @metadata )
      metadata
    else
      @metadata

    # And then pass it all on to the real winston log function
    debug 'log calling winston log with', level,':',msg, ":", args..., ":", metadata
    @head.log level, msg, args..., metadata, callback


  # ###### `set_level( log_level, transport_name )`
  # Set the log level for all, or a named transport
  set_level: ( level, transport = null )->
    for key, val of @head.transports
      if not transport or transport is key
        val.level = level
        debug 'set transport to level', key, level



# ## EventLoggerMeta
# Logger instance with extra metadata
# So you don't need to add a name to log some extra metadata
# reqularly

# For things like the client session or socket ID that is always
# logged for that client
class EventLoggerMeta

  constructor: ( @parent, @metadata = {} ) ->
    # not sure yet. probably reproduce most of EventLogger :/



# ## RequestLogger

# A simple express/socketio logger, generating combined log format(ish)
# Unforunately it logs at the start of the request otherwise the middleware
# doesn't fire. It needs some way to attach at the start and callback once
# the request is finished. 

class RequestLogger

  # ###### `RequestLogger.combined( logger )`
 
  # Generate an instance with an EventLogger  `logger` attached
  @combined: ( logger )->
    debug 'generate logger is', logger
    logger.info 'creating a request logger'
    ( req, res, next ) ->
      debug 'log_combined', logger
      RequestLogger.log_combined( logger, req, res, next )
  

  # ###### `RequestLogger.log_combined ( logger, req, res, next )`

  # This is the basic middleware to log. It can't be used directly by express
  # as it needs a logger passed to it as well. 
  @log_combined: ( logger, req, res, next )->
    req.date      = new Date
    req_ip        = req.ip or req._remoteAddress or (req.connection and req.connection.remoteAddress) or '-'
    req_auth      = if req.user then req.user else '-'
    http_version  = "#{req.httpVersionMajor}.#{req.httpVersionMinor}"
    url           = req.originalUrl or req.url
    status        = if res.statusCode then "#{res.statusCode}" else '-'
    content_length = res['content-length'] or '-'
    referrer      = req.headers['referer'] or req.headers['referrer'] or '-'

    # Try to be a combined log
    logger.info 'request-http %s %s [%s] "%s %s HTTP/%s" %s %s "%s" "%s"',
      req_ip, req_auth, req.date.toISOString(), req.method, url, http_version,
      status, content_length, referrer, req.headers['user-agent']

    next()


  # ###### `RequestLogger.log_socket_combined( EventLogger, socket, route )`
  
  # Fits into the combined format as best as possible. Will need some tweaking
  # To include some extra details. 
  @log_socket_combined: ( logger, socket, route )->
    ip = socket.conn.remoteAddress or '-'
    loguser = socket.client.request.user.username or '-'
    referer = socket.handshake.headers['referer'] or '-'
    user_agent = socket.handshake.headers['user-agent']
    logger.info 'request-socketio %s %s/%s [%s] "%s%s WS" - - "%s" "%s"', ip, socket.id, loguser, new Date().toISOString(), socket.nsp.name, route, referer, user_agent

  constructor: (@logger, @options)->
  
  log_socket_combined: ( socket, route )->
    @constructor.log_socket_combined @logger, socket, route
 
  log_combined: ( req, res, next )->
    @constructor.log_combined @logger, req, res, next


# ### Export via a function

# Provide a function so a `name` can be passed in at `require` time.
# This will be the `debug` and `logger` name that comes out with each log line
#
#     { logger, debug } = require('oa-logging')('oa:module:class')
#
# or javascript 
#
#     var ref = require('oa-logging')('oa:module:class')
#     var logger = ref.logger
#     var debug  = ref.debug
#     

exports = module.exports = (name,options={}) ->

  # If we were given a logger name, setup debug and logger
  if name?
    head_logger = options.logger || default_logger
    logger_named  = new EventLogger head_logger, name
    debug_named   = require('debug')(name)

    # Test helpers, so we don't log all over the tests
    if process.env.NODE_ENV is 'test' or process.env.NODE_TEST
      logger_named.set_level 'warn'
      debug 'test env, defaulting to warn level logging'
    else
      debug 'not test env, leaving log level alone'

  else
    logger_tag  = null
    debug_tag   = null

  {
    debug:    debug_named
    logger:   logger_named
    EventLogger: EventLogger
    default_logger: default_logger
    RequestLogger: RequestLogger
  }
