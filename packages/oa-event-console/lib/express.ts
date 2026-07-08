//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging modules
const { RequestLogger,
  logger,
  debug }        = require('oa-logging')('oa:event:console:express');

// npm modules
const express          = require('express');
const io               = require('socket.io');
const http             = require('http');
const pug              = require('pug');
const session          = require('express-session');
const MongoStore       = require('connect-mongo');
const { buildAssetHelpers } = require('./assets');
const favicon          = require('serve-favicon');
const bodyParser       = require('body-parser');
const cookieParser     = require('cookie-parser');
const passport         = require('passport');
const LocalStrategy    = require('passport-local').Strategy;
const uuid             = require('uuid');
const siofu            = require('socketio-file-upload');

// oa modules
const Errors           = require('oa-errors');
const { Mongoose }     = require('./mongoose');
const { server_event } = require('./eventemitter');


// ### Express app server with io and mongoose

express.io = io;

// Create a default Express/Jade app
class ExpressApp {
  options: any; config: any; path: any; socketio: any;
  app: any; http: any; server: any;

  constructor( options ) {
    this.options = options;
    this.config   = this.options.config;
    this.path     = this.options.config.path;
    this.socketio = this.options.socketio;
    debug('Config', this.config);
    debug('Path',   this.path);
    debug('Socket', this.options.socketio);

    this.create();
  }


  // Main app creation
  create() {
    const self = this;

    logger.info('Creating express app', this.config.app.name);

    this.app  = express();
    this.http = http.Server( this.app );

    this.app.set('is_production', (this.app.get('env') === 'production'));

    this.app.locals.name  = this.config.app.name;
    this.app.locals.email = this.config.app.email;
    this.app.locals.config = this.config;
    const { Path } = require('./path');
    this.app.locals.version = require(Path.join(Path.base, 'package.json')).version;
    this.app.locals.node_env = process.env.NODE_ENV || 'production';
    this.app.locals.no_refresh_env = (process.env.NO_REFRESH != null);

    this.app.locals.nav_user = [
      [ 'Logout',   '/logout' ]
    ];

    this.app.node_id = this.config.app.id || [0x0f, 0x0e, 0x0e];
    const uuid_node = [];
    uuid_node.push(...this.app.node_id || []);
    uuid_node.push(0x0d, 0x0a); // event_console express
    uuid_node.push(0x00); // unused
    this.app.uuid_node = uuid_node;

    // Attach a uuid to the request for tracking
    this.app.use(function( req, res, next ) {
      req.uuid = req.headers['x-uuid'] || uuid.v1({ node: self.app.uuid_node });
      return next();
    });

    // Logging - Combined Log Format
    this.app.use(RequestLogger.combined(logger));

    this.app.use(function( req, res, next ) {
      res.setHeader('X-Powered-By', 'Unicorns');
      return next();
    });

    // Allow json and normal posts
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Favicon
    this.app.use(favicon( this.path.public + '/favicon.ico' ));

    // Static
    logger.info('Static files', this.path.public);
    const static_assets = express.static(`${this.path.public}/assets/bld`, {
      index: false,
      maxage: 2419200000
    });
    this.app.use('/assets/bld', static_assets);
    this.app.use(express.static(this.path.public, {
      index: false,
      maxage: 1800000
    }
    )
    );

    // Configure views
    logger.info('Views', this.path.views);
    this.app.set('views', this.path.views);
    this.app.set('view engine', 'pug');
    this.app.engine('pug', pug.__express);

    // Prod view pug pre caching
    if (this.app.get('is_production')) {
      require('./express-pug-cache')(this.path.views);
    }


    // ### Assets (Vite manifest-based — replaces connect-assets)
    logger.info('Assets (Vite manifest)', this.path.public, process.env.NODE_ENV);

    // Expose js(key) and css(key) template helpers that resolve hashed Vite filenames
    const { js, css } = buildAssetHelpers();
    this.app.locals.js  = js;
    this.app.locals.css = css;


    if (!this.app.get('is_production')) {
      this.app.use('/dev', express.static(this.path.local('dev')));
    }

    // ### Sessions/Auth

    // Setup the session to use mongoose
    this.config.session.store = MongoStore.create({
      //mongooseConnection: Mongoose.db
      mongoUrl: this.config.mongodb.uri || 'http://localhost:27017/sessions',
      mongoOptions: {
        useUnifiedTopology: true
      },
      ttl: this.config.session.timeout || ( 60 * 60 * 1000 ),
      collectionName: this.config.session.collection || 'sessions_passport'
    });

    debug('session store setup and added to config', this.config.session.store);

    // behind a TLS reverse proxy trust it
    if (this.config.app.url.match(/^https/)) {
      this.app.set('trust proxy', 1);
    }

    // Create the session middleware for later use
    const session_middleware = session({
      secret:   this.config.session.secret,
      name:     'panther.sid',
      resave:   false,
      saveUninitialized: false,
      store:    this.config.session.store,
      cookie: {
        secure: this.config.app.url.match(/^https/) ? true : false,
        sameSite: 'lax'
      }
    });

    // Support both session auth and apikeys in certain circumstances
    this.app.use(function( req, res, next ) {
      if (req.headers['x-api-token']) {
        if ((req.originalUrl.lastIndexOf('/api/apikey', 0) === 0) &&
        self.config.app.key.apikey[req.headers['x-api-token']]) {
          return next();
        } else {
          logger.warn('Apikey auth error key[%s] path[%s]', req.headers['x-api-token'], req.originalUrl);
          const err = new Errors.HttpError401('Unknown Api Key');
          err.apikey = req.headers['x-api-token'];
          err.url = req.originalUrl;
          return next(err);
        }
      }
      return session_middleware(req, res, next);
    });

    // Passport authentication
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // SocketIO file upload
    this.app.use(siofu.router);

    // Load the app routes from elsewhere
    require(this.path.routes).route(this.app);


    // finally catch any errors
    this.setup_error_handler();

    debug('express app returning', this.config.app.name);
    server_event.emit('express::setup_done', {
      message: 'setup done',
      app: this.config.app.name
    }
    );
    return this;
  }


  // Method to set locals on the the class
  set_locals( name, value) {
    return this.app.locals[name] = value;
  }

  // The default error handler
  setup_error_handler() {
    return this.app.use(function(err, req, res, next) {
      // 404
      if (err.status === 404) {
        return res.render('error/404',
          {error: 'Uh oh, not found'});
      }
      if (err.status === 401) {
        return res.render('error/401',
          {error: err.message});
      }

      // Error handling
      logger.error('Express error', err.message, err, err.stack, '');
      const resdata: any =
        {error: err};

      // Attach stack trace when running in development mode
      if (process.env.DEBUG && (process.env.NODE_ENV === "development")) {
        resdata.stack = err.stack;
      }

      return res.render('error/500', resdata);
    });
  }


  // 404. Needs to happen last, after socket io setup!!
  setup_catchall_route() {
    return this.app.get('/*path', function(req, res, next) {
      const err: any = new Error(`Not found: ${req.path}`);
      err.status = 404;
      return next(err);
    });
  }


  serve(done) {
    const self = this;
    debug('Starting up server', this.config.http.port);
    if (this.server) {
      if (done) { done(null, this.server); }
      logger.warn('Server already started');
      return done(null, self.server);
    }
      
      
    this.server = this.http.listen(this.config.http.port, function( error, data ) {
      if (error) {
        logger.error('Error starting http, error.stack');
        return done(error);
      }
      const host = self.server.address().address;
      const {
        port
      } = self.server.address();

      logger.info('%s is at http://%s:%s', self.app.locals.name, host, port);

      if (done) { return done(null, self.server); }
    });

    //@setup_catchall_route()

    // Return this for chaining
    return this;
  }
}


module.exports =
  {ExpressApp};
