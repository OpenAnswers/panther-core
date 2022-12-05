#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# logging modules
{ RequestLogger
  logger
  debug }        = require('oa-logging')('oa:event:console:express')

# npm modules
express          = require 'express'
io               = require 'socket.io'
http             = require 'http'
pug              = require 'pug'
session          = require 'express-session'
MongoStore       = require('connect-mongo')
Assets           = require "connect-assets"
favicon          = require 'serve-favicon'
bodyParser       = require 'body-parser'
cookieParser     = require 'cookie-parser'
passport         = require 'passport'
LocalStrategy    = require('passport-local').Strategy
uuid             = require 'node-uuid'
siofu            = require 'socketio-file-upload'

# oa modules
Errors           = require 'oa-errors'
{ Mongoose }     = require './mongoose'
{ server_event } = require './eventemitter'


# ### Express app server with io and mongoose

express.io = io

# Create a default Express/Jade app
class ExpressApp

  constructor: ( @options ) ->
    @config   = @options.config
    @path     = @options.config.path
    @socketio = @options.socketio
    debug 'Config', @config
    debug 'Path',   @path
    debug 'Socket', @options.socketio

    @create()


  # Main app creation
  create: ->
    self = @

    logger.info 'Creating express app', @config.app.name

    @app  = express()
    @http = http.Server( @app )

    @app.set 'is_production', (@app.get('env') is 'production')

    @app.locals.name  = @config.app.name
    @app.locals.email = @config.app.email
    @app.locals.config = @config
    @app.locals.version = require('../package.json').version
    @app.locals.node_env = process.env.NODE_ENV || 'production'
    @app.locals.no_refresh_env = process.env.NO_REFRESH?

    @app.locals.nav_user = [
      [ 'Logout',   '/logout' ]
    ]

    @app.node_id = @config.app.id or [0x0f, 0x0e, 0x0e]
    uuid_node = []
    uuid_node.push @app.node_id...
    uuid_node.push 0x0d, 0x0a # event_console express
    uuid_node.push 0x00 # unused
    @app.uuid_node = uuid_node

    # Attach a uuid to the request for tracking
    @app.use ( req, res, next ) ->
      req.uuid = req.headers['x-uuid'] or uuid.v1( node: self.app.uuid_node )
      next()

    # Logging - Combined Log Format
    @app.use RequestLogger.combined(logger)

    @app.use ( req, res, next ) ->
      res.setHeader('X-Powered-By', 'Unicorns')
      next()

    # Allow json and normal posts
    @app.use bodyParser.urlencoded({ extended: true })

    # Favicon
    @app.use favicon( @path.public + '/favicon.ico' )

    # Static
    logger.info 'Static files', @path.public
    static_assets = express.static("#{@path.public}/assets/bld",
      index: false
      maxage: 2419200000)
    @app.use '/assets/bld', static_assets
    @app.use express.static @path.public,
      index: false
      maxage: 1800000

    # Configure views
    logger.info  'Views', @path.views
    @app.set     'views', @path.views
    @app.set     'view engine', 'pug'
    @app.engine  'pug', pug.__express

    # Prod view pug pre caching
    if @app.get('is_production')
      require('./express-pug-cache')(@path.views)


    # ### Assets
    logger.info 'Assets', @path.assets, @path.bower, @config.app.assets_build_dir, process.env.NODE_ENV

    if @app.get('is_production')
      asset_sourceMaps  = false
      asset_compile     = false
      asset_servePath   = "/assets/bld"
      asset_buildDir    = @config.app.assets_build_dir
    else
      asset_sourceMaps  = true
      asset_compile     = true
      asset_servePath   = 'assets'
      asset_buildDir    = 'public/assets/bld'

    logger.info 'asset_servePath:%s asset_sourceMaps:%s asset_compile:%s', asset_sourceMaps, asset_servePath, asset_compile

    # Compiled assets (connect-assets ~ sprockets)
    @app.use Assets
      #src:      @path.assets
      paths:      [ @path.assets ]
      buildDir:   asset_buildDir
      sourceMaps: asset_sourceMaps
      servePath:  asset_servePath
      compile:    asset_compile


    unless @app.get('is_production')
      @app.use '/dev', express.static @path.local('dev')

    # ### Sessions/Auth

    # Setup the session to use mongoose
    @config.session.store = MongoStore.create
      #mongooseConnection: Mongoose.db
      mongoUrl: @config.mongodb.uri || 'http://localhost:27017/sessions'
      mongoOptions:
        useUnifiedTopology: true
      ttl: @config.session.timeout || ( 60 * 60 * 1000 )
      collectionName: @config.session.collection || 'sessions_passport'

    debug 'session store setup and added to config', @config.session.store

    # behind a TLS reverse proxy trust it
    if @config.app.url.match(/^https/)
      @app.set 'trust proxy', 1

    # Create the session middleware for later use
    session_middleware = session
      secret:   @config.session.secret
      name:     'panther.sid'
      resave:   false
      saveUninitialized: false
      store:    @config.session.store
      cookie:
        secure: if @config.app.url.match(/^https/) then true else false

    # Support both session auth and apikeys in certain circumstances
    @app.use ( req, res, next ) ->
      if req.headers['x-api-token']
        if req.originalUrl.lastIndexOf('/api/apikey', 0) is 0 and
        self.config.app.key.apikey[req.headers['x-api-token']]
          return next()
        else
          logger.warn 'Apikey auth error key[%s] path[%s]', req.headers['x-api-token'], req.originalUrl
          err = new Errors.HttpError401('Unknown Api Key')
          err.apikey = req.headers['x-api-token']
          err.url = req.originalUrl
          return next(err)
      return session_middleware req, res, next

    # Passport authentication
    @app.use passport.initialize()
    @app.use passport.session()

    # SocketIO file upload
    @app.use siofu.router

    # Load the app routes from elsewhere
    require(@path.routes).route(@app)


    # finally catch any errors
    @setup_error_handler()

    debug 'express app returning', @config.app.name
    server_event.emit 'express::setup_done',
      message: 'setup done'
      app: @config.app.name
    @


  # Method to set locals on the the class
  set_locals: ( name, value) ->
    @app.locals[name] = value

  # The default error handler
  setup_error_handler: ->
    @app.use (err, req, res, next) ->
      # 404
      if err.status == 404
        return res.render 'error/404',
          error: 'Uh oh, not found'
      if err.status == 401
        return res.render 'error/401',
          error: err.message

      # Error handling
      logger.error 'Express error', err.message, err, err.stack, ''
      resdata =
        error: err
      
      # Attach stack trace when running in development mode
      if process.env.DEBUG and process.env.NODE_ENV == "development"
        resdata.stack =  err.stack

      res.render 'error/500', resdata


  # 404. Needs to happen last, after socket io setup!!
  setup_catchall_route: ->
    @app.get '*', (req, res, next) ->
      err = new Error "Not found: #{req.path}"
      err.status = 404
      next err


  serve: (done) ->
    self = @
    debug 'Starting up server', @config.http.port
    if @server
      done(null, @server) if done
      logger.warn 'Server already started'
      return done(null, self.server)
      
      
    @server = @http.listen @config.http.port, ( error, data ) ->
      if error
        logger.error 'Error starting http, error.stack'
        return done(error)
      host = self.server.address().address
      port = self.server.address().port

      logger.info '%s is at http://%s:%s', self.app.locals.name, host, port

      done(null, self.server) if done

    #@setup_catchall_route()

    # Return this for chaining
    @


module.exports =
  ExpressApp: ExpressApp
