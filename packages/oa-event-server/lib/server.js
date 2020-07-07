/*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

// Logging
var logging = require("oa-logging")("oa:event:server");
var logger = logging.logger;
var debug = logging.debug;

var http = require("http");
var async = require("async");
var inspect = require("util").inspect;
var fs = require("fs");
var SocketIO = require("socket.io");
var path = require("path");
var Mongoose = require("mongoose");
var nconf = require("nconf");
let bus = require("./ipcbus").internal_bus;

var OAmonHome = require("./OAmonHome").OAmonHome;
var oamonhome = new OAmonHome();

var ExpressServer = require("./express_server").ExpressServer;

// Create a server configuration object by parsing in the command line
// arguments and reading the server config file
var ServerConfig = require("./server_config");
var server_config = new ServerConfig.ServerConfig();

AutomationManager = require("./automations").AutomationManager;
Severity = require("./severity").Model;
ClientManager = require("./ClientManager").ClientManager;

var OAmonServer = function OAmonServer() {
  let mongoose = require("mongoose");
  this.mongoose = mongoose;
  this.util = require("util");

  var EventEmitter = require("events").EventEmitter;
  this.events = new EventEmitter();

  this.controllers = [];

  /*
   * this is where we'll be enforcing the schema for the alerts tables
   */
  this.mandatory_alert_columns = [];
  this.allowed_alert_columns = [];

  this.client_websockets = {};
  this.client_connections = {};
};

OAmonServer.prototype.start = function(started_cb) {
  var self = this;

  async.series(
    {
      // Setup the configuration parameter
      setupLogging: function(cb) {
        var level = server_config.nconf.get("loglevel");
        level = level.toString().toLowerCase();
        logger.set_level(level);
        cb(null);
      },

      // Establish the Mongoose mongodb connection
      connect_to_db: function(cb) {
        /*
       * somewhat complex mechanism for signalling success/failure
       * part 1
       *
       * register on the mongoose connection two event handlers
       * that will call cb() with success/failure
       */
        Mongoose.connection.on("error", function(err) {
          var msg = "Could not connect to MongoDB on host " + server_config.DbHostname() + ": " + err;
          logger.error(msg);
          cb(err);
        });
        Mongoose.connection.on("open", function() {
          logger.info("Connected to MongoDB");
          cb(null);
        });

        var connection_string = server_config.DbConnectionString();
        logger.debug("Connecting... " + connection_string);

        self.db = Mongoose.connect(connection_string);

        /*
       * somewhat complex mechanism
       * part 2
       * this also seems required and must exist with part one above
       * having one or the other is not enough, and *both* must be used
       * FIXME: this is possibly a bug in mongoose, mongodb-driver or
       * in the way its being used
       */
        self.db.connection.on("error", function(err) {
          debug("arguments", arguments);
          logger.error("Could not connect to MongoDB at [%s] %s", server_config.DbConnectionString(), err);
          cb(err);
        });
      },

      initial_settings: function(cb) {
        var ServerSettings = require("../models/settings.js");

        let s = ServerSettings.update(
          { owner: "_system_" },
          { owner: "_system_", key: "tracking", value: "0" },
          { upsert: true }
        );
        s
          .exec()
          .then((result) => {
            logger.debug("SS results", result);
            cb(null);
          })
          .catch((error) => {
            cb(error);
          });
      },

      // Read in the alert definitions file and register the Mongoose schema
      define_alerts: function(cb) {
        var AlertsLoader = require("./alerts_loader").AlertsLoader;
        var alerts = new AlertsLoader();
        self.alerts = alerts;

        alerts.setup();

        logger.debug("LOADER all: " + inspect(alerts.getAllColumns()));
        alerts.registerAlertsSchema(self.db, function(err, lerts) {
          /*
         * lerts is the Mongoose Schema for an Alert 
         */
          // make Alerts a global
          Alerts = lerts;
          cb(err, lerts);
        });
      },

      // Monitor Server is the piece that receives events from monitors
      monitor_server: function(cb) {
        logger.debug("Starting Monitor server side");

        var MonitorServer = require("./monitor_server").MonitorServer;
        self.monitor_server = new MonitorServer({
          Alerts: Alerts,
          mandatoryColumns: self.alerts.getMandatoryColumns(),
          allowedColumns: self.alerts.getAllColumns(),
          endpoint: server_config.DeltaPort()
        });

        bus.on("/tracking", (data) => {
          logger.debug("IPCBUS /tracking", data);
          if (data === "1") {
            self.monitor_server.setServerRulesTracking(true);
          } else {
            self.monitor_server.setServerRulesTracking(false);
          }
        });

        self.monitor_server.start(cb);
      },

      express_setup: function(cb) {
        self.es = new ExpressServer({
          listeningPort: server_config.Port(),
          deltaPort: server_config.DeltaPort(),
          alerts: self.alerts
        });

        self.es.start();
        cb(null);
      },
      external_commands_setup: function(cb) {
        /*
       * external commands is in its own method now,
       * which allows us to re-read it on a signal
       * still needs to be setup when the server starts though
       */
        self.external_commands_setup(cb);
      },
      automations: function(cb) {
        /*
       * start the automations subsystem if its been enabled
       */
        if (nconf.get("automations") == 1) {
          self.automations = new AutomationManager();
          self.automations.setup(function(err, args) {
            if (err) return cb(err);
            else self.automations.start(cb);
          });
        } else {
          logger.info("automations are disabled");
          logger.debug('automations can be enabled by setting "automations = 1" in etc/server.ini');
          cb(null);
        }
      },
      listen: function(cb) {
        self.es.listen();
        cb(null);
      },
      signal_handlers: function(cb) {
        process.on("SIGHUP", function() {
          self.events.emit("init.ExternalCommands", function(err) {
            logger.info("Server re-read external commands on SIGHUP");
          });
        });

        cb(null);
      }
    },
    function(err, results) {
      if (err) logger.error(err);

      if (started_cb && typeof started_cb == "function") started_cb(err);
    }
  );
};

OAmonServer.prototype.external_commands_setup = function(finished_cb) {
  var self = this;

  var fs = require("fs");
  var env = process.env;

  debug("Setting up external classes");
  ExternalClasses = require("../models/externalclass");
  ExternalCommands = require("./external_commands");

  ExternalClasses.find({}, function(err, results) {
    /*
     * failure in finding external classes is propogated back up
     * no results found is treated as all OK.
     * any results are examined to check that the commands actually exist
     */
    if (err) finished_cb(err);
    else if (!results) finished_cb(null);
    else {
      async.forEach(
        results,
        function(item, cb) {
          var command = item.command;

          /*
         * commands without absolute paths are assumed to be under external_commands
         */
          if (item.command.indexOf("/") != 0)
            command = path.join(oamonhome.getExternalCommandsDir(), "/" + item.command);

          if (command == undefined) {
            logger.warn("undefined command for item: " + inspect(item));
            cb(null);
          } else {
            logger.debug("Checking command exists: " + command);
            fs.stat(command, function(err, stats) {
              if (err) cb(err);
              else {
                if (!stats.isFile()) {
                  logger.error("missing command: " + command);
                  cb("ENOENT: " + command);
                } else cb(null);
              }
            });
          }
        },
        finished_cb
      );
    }
  });
};

// oafserver becomes global
oafserver = module.exports = new OAmonServer();

oafserver.events.on("init.ExternalCommands", function(finished_cb) {
  async.series(
    {
      init: function(cb) {
        debug("Reading external commands");
        oafserver.external_commands_setup(cb);
      }
    },
    function(err, results) {
      finished_cb(err);
    }
  );
});

/*
 * start up the server
 */

oafserver.start(function(err) {
  if (err) process.exit(1);
});
