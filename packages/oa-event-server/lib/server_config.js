/*
 * Copyright (C) 2012, 2020 Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var path = require('path');

var nconf = require('nconf');
var Class = require('joose').Class;
var OAmonHome = require('./OAmonHome').OAmonHome;
var oamonhome = new OAmonHome();

DEFAULT_HOSTNAME = 'localhost';
DEFAULT_DATABASE = 'panther';

var DEFAULT_SERVER_PORT = 4002;
var DEFAULT_SOCKIO_PORT = 4003;
var DEFAULT_LOG_LEVEL = 'info';
var DEFAULT_DB_HOSTNAME = 'localhost';
var DEFAULT_DB_PORT = 27017;
var DEFAULT_DB_COLLECTION = 'panther';
var DEFAULT_AUTOMATIONS_STATE = 1;
var DEFAULT_RULES_FILE = path.join(oamonhome.getServerEtcDir(), 'server.rules.yml');
var DEFAULT_RULES_TRACKING = true;
var DEFAULT_EXPIRE_OCCURRENCES = 60 * 60 * 24 * 14; // two weeks
var DEFAULT_EXPIRE_MATCHES = 60 * 60 * 24 * 14; // two weeks

var DEFAULT_LOG_COMPONENTS = [
  'server',
  'express',
  'SocketIO',
  'automations',
  'monitors',
  'trigger',
  'action',
  'deltas',
];

var ServerConfig = (exports.ServerConfig = Class('ServerConfig', {
  has: {
    configFile: { is: 'rw' },
    nconf: Joose.I.Object,
  },

  after: {
    initialize: function (props) {
      var self = this;
      nconf.argv();

      // use commandline --configfile path if it was specified
      if (nconf.get('configfile')) this.setConfigFile(nconf.get('configfile'));
      else if (props.configFile == undefined)
        // otherwise use the default value
        this.setConfigFile(path.join(oamonhome.getServerEtcDir(), 'server.ini'));

      // now permit arguments to come from teh environment
      nconf.env();
      var args = { file: self.getConfigFile() };
      if (path.extname(self.getConfigFile()) == '.ini') args.format = nconf.formats.ini;

      // use the settings from specified config file
      nconf.use('file', args);

      // keep a copy of nconf in the object
      this.nconf = nconf;

      // set the default value to fallback to if none specified already
      this.setDefaults();
    },
  },

  methods: {
    setDefaults: function () {
      nconf.defaults({
        port: DEFAULT_SERVER_PORT,
        sockio_port: DEFAULT_SOCKIO_PORT,
        loglevel: DEFAULT_LOG_LEVEL,
        logcomps: DEFAULT_LOG_COMPONENTS,
        automations: DEFAULT_AUTOMATIONS_STATE,
        rules_file: DEFAULT_RULES_FILE,
        rules_tracking: DEFAULT_RULES_TRACKING,
        expires: {
          alert_occurrences: DEFAULT_EXPIRE_OCCURRENCES,
          alert_matches: DEFAULT_EXPIRE_MATCHES,
        },
        db: {
          hostname: DEFAULT_DB_HOSTNAME,
          port: DEFAULT_DB_PORT,
          collection: DEFAULT_DB_COLLECTION,
        },
      });
    },

    ExpireOccurrences: function () {
      var ttl = this.nconf.get('expires:alert_occurrences');
      if (isNaN(ttl)) throw new Error('expire:alert_occurrences not a number [' + ttl + ']');
      return parseInt(ttl);
    },

    ExpireMatches: function () {
      var ttl = this.nconf.get('expires:alert_matches');
      if (isNaN(ttl)) throw new Error('expire:alert_matches not a number [' + ttl + ']');
      return parseInt(ttl);
    },

    Port: function () {
      // this should be in the setter, but joose?
      var port = this.nconf.get('port');
      if (isNaN(port)) throw new Error('port not a number [' + port + ']');
      return parseInt(port);
    },

    DbHostname: function () {
      return this.nconf.get('db:hostname');
    },

    DbPort: function () {
      // this should be in the setter, but joose?
      var port = this.nconf.get('db:port');
      if (isNaN(port)) throw new Error('db:port not a number [' + port + ']');
      return port;
    },

    DbCollection: function () {
      return this.nconf.get('db:collection');
    },

    DbConnectionString: function () {
      return 'mongodb://' + this.DbHostname() + ':' + this.DbPort() + '/' + this.DbCollection();
    },

    DeltaPort: function () {
      // this should be in the setter, but joose?
      var port = this.nconf.get('sockio_port');
      if (isNaN(port)) throw new Error('sockio_port not a number [' + port + ']');
      return parseInt(port);
    },

    LogComponents: function () {
      return this.nconf.get('logcomps');
    },

    RulesFile: function () {
      var rules = this.nconf.get('rules_file');
      return rules;
    },

    RulesTracking: function () {
      return this.nconf.get('rules_tracking');
    },
  },
}));
