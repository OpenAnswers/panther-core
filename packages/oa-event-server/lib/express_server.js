/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:server:express');
var logger = logging.logger;
var debug = logging.debug;

var http = require('http');
var inspect = require('util').inspect;
var path = require('path');

var Joose = require('joose');
var Class = Joose.Class;

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
// var expressLayouts = require('express-ejs-layouts');
var SocketIO = require('socket.io');
// var connect = require("connect");
// var session = require("express-session");

//var MongoSessionStore = require("session-mongoose")(connect);

/*
 * create a server configuration object by parsing in the command line
 * arguments and reading the server config file
 */

var ServerConfig = require('./server_config').ServerConfig;
var OAmonHome = require('./OAmonHome').OAmonHome;
var bus = require('./ipcbus').internal_bus;

var oamonhome = new OAmonHome();
var server_config = new ServerConfig();

var ExpressServer = (exports.ExpressServer = Class('ExpressServer', {
  has: {
    listeningPort: { is: 'rw', init: server_config.Port() },
    deltaPort: { is: 'rw', init: server_config.DeltaPort() },
    defaultLayout: { is: 'rw' },
    server: { is: 'r' },
    sio: { is: 'r' },
    app: Joose.I.Object,
    sessionStore: Joose.I.Object,
    alerts: Joose.I.Object,
    vm: Joose.I.Object,
    client_connections: Joose.I.Array,
    previous_bus_delete: { is: 'rw' },
  },

  after: {
    initialize: function (config) {
      debug('config called', config);
    },
  },

  methods: {
    is_logged_in: function (req, res, next) {
      if (req.session && req.session.user) return next();

      if (req.is('json')) res.render('401', { status: 401, layout: 'simple' });
      else res.redirect('/logins');
    },

    setup: function () {
      var self = this;
      var express = require('express');
      // var connect = require("connect");

      // Setup the session handling
      /*
      this.sessionStore = new MongoSessionStore({
        url: server_config.DbConnectionString(),
        interval: 120000,
      });

      this.sessionStore_session = session({
        store: self.sessionStore,
        secret: "4&lope1$23z=314kj343po4[ld[ae;f]fdlka",
        name: "express.sid",
        resave: false,
        saveUninitialized: false,
      });
      */

      // Create and configure the server
      this.app = express();
      this.server = http.createServer(this.app);

      // Views
      // var view_path = path.join(oamonhome.getServerDir(), '/views');
      // this.app.set('views', view_path);
      // this.app.set('view engine', 'ejs');

      // Use our logger for express
      this.app.use(logging.RequestLogger.combined(logger));

      // Some bits for the socket/cookie auth
      this.app.use(bodyParser.urlencoded({ extended: false }));
      this.app.use(cookieParser());

      // Tell express to use the session storage
      // this.app.use(this.sessionStore_session);

      // support the old layouts in new express
      // this.app.use(expressLayouts);

      // Specify the public document root
      // var dir = path.join(oamonhome.getServerDir(), '/public');
      // this.app.use(express.static(dir));

      // Setup a generic error handler
      function errorHandler(err, req, res, next) {
        res.status(500);
        res.render('error', { error: err });
      }
      this.app.use(errorHandler);

      // Restrict access to these paths
      // this.app.all('/oaec/*', self.is_logged_in);

      this.app.use('/api/v1', require('./api'));
    },

    /*
    setup_dynamic: function () {
      var self = this;

      this.app.get('/logins', function (req, res) {
        res.render('login', {
          version: oamonhome.getVersion(),
          layout: 'simple',
        });
      });
    },
    */
    setup_socket_io: function () {
      var self = this;
      // Setup the listening websocket that the browser connects
      //   to, which allows oafserver to push deltas to the client
      var sock_opts = {};

      var sock_opts = {
        pingTimeout: 20000,
        pingInterval: 10000,
      };

      var sio = SocketIO.listen(this.server, sock_opts);

      // Piggy back on the express sessions
      sio.use(function (socket, next) {
        self.sessionStore_session(socket.request, socket.request.res, next);
      });

      // Check for the Auth cookie
      sio.use(function (socket, next) {
        var has_cookie = false;

        debug('pre session', socket.request.session);

        if (!socket || !socket.request || !socket.request.session || !socket.request.session.user)
          return next(new Error('No session user'));

        next();
      });

      sio.sockets.on('connection', function (socket) {
        var session_id = socket.request.sessionID;

        if (!session_id) {
          var msg = new Error('No session_id attached to socket:');
          logger.error(msg + inspect(socket));
          socket.emit('error', msg);
          return socket.disconnect(msg);
        }

        debug('socket connection', socket);
      });

      // store the master socket.
      self.sio = sio;
      logger.info('Express socket.io listener setup initiated');
    },

    listen: function () {
      var port = server_config.Port();
      logger.info('server listening on port ' + port);
      this.server.listen(port);
    },

    start: function (cb) {
      this.setup();
      // this.setup_dynamic();
      this.setup_socket_io();
      logger.info('Express setup');
    },
  },
}));
