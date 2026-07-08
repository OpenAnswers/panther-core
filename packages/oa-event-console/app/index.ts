//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Event Console

// Entry point for the event console web app

// Logging
let config, config_file, error;
const { logger, debug } = require('oa-logging')('oa:event:app');

// Get command line args
const argv = require('minimist')(process.argv.slice(2));
debug('process.argv', process.argv);
if (argv.c) {
  config_file = argv.c;
}
if (argv.config) {
  config_file = argv.config;
}
if (process.env.OA_CONFIG_FILE) {
  config_file = process.env.OA_CONFIG_FILE;
}
if (config_file == null) {
  config_file = 'config.yml';
}
debug('config_file from argv', config_file);

// Load OA Config first, before anything else can setup a `config` instance
// with nothing populated in it
try {
  config = require('../lib/config').load_file(config_file, 'default');
} catch (error1) {
  error = error1;
  logger.error(`Failed to load config file [${config_file}]:\n${error}`);
  throw error;
}

// Modules

const { Path } = require('../lib/path');
const { ExpressApp } = require('../lib/express');
const { EventRules, Agents } = require('oa-event-rules');
const { SocketIO } = require('../lib/socketio');
const { Mongoose } = require('../lib/mongoose');
//{ Zmq }         = require '../lib/zmq'
const { server_event } = require('../lib/eventemitter');
const { _ } = require('oa-helpers');

// Node modules
const { statSync } = require('fs');
const mkdirp = require('mkdirp');
const listEndpoints = require('express-list-endpoints');

// Logging to file
//EventLogger.add_file Path.logs + '/all.log'

const start = function (startup_cb) {
  // Load the rules (move this into a helper)
  try {
    // The types array should be the basis for the rules loads
    //config.rules.types = Agents.types_array()

    config.rules.server = new EventRules({
      path: config.rules_path('server'),
      server: true,
    });
    // Allow legacy rules setup to still work FIXME
    config.rules.set = config.rules.server;

    // Load each agents individual rules
    _.forEach(
      config.rules.agents,
      agentName =>
        (config.rules[agentName] = new EventRules({
          path: config.rules_path(agentName),
          agent: true,
        }))
    );
  } catch (error2) {
    error = error2;
    logger.error(`Failed to load rules:\n${error}`);
    throw error;
  }

  // create uploads directory if required
  const upload_directory = _.get(config, 'app.upload.directory', null);

  try {
    mkdirp.sync(upload_directory);
  } catch (error3) {
    error = error3;
    logger.error(`Failed configuration for upload.directory:\n ${error}`);
    throw error;
  }

  // Include all the server events
  require('./events');

  // Create a db connection
  return Mongoose.connect(function (error) {
    if (error) {
      return startup_cb(error);
    }

    // Setup the app and add socketio
    const express = new ExpressApp({ config });
    const sio = SocketIO.create(express);

    // Rules changes should emit reloads out to socket clients
    // Again, the types array should be the basis for this
    config.rules.server.reload_cb = function () {
      logger.debug('Emit rules reloaded message to socket clients');
      return SocketIO.io.emit('event_rules::reloaded', { type: 'server' });
    };

    _.forEach(
      config.rules.agents,
      agentName =>
        (config.rules[agentName].reload_cb = function () {
          logger.debug('Emit rules reloaded message to socket clients');
          return SocketIO.io.emit('event_rules::reloaded', { type: 'agent', sub_type: agentName });
        })
    );

    // Then startup the server
    return express.serve(function (error, data) {
      if (error) {
        logger.error('server failed', error.stack);
        process.exit(1);
      }
      logger.info('All setup and running');

      // Optionally log all endpoints
      if (process.env.NODE_ENV === 'development') {
        const endpoints = listEndpoints(express.app);

        debug('ENDPOINTS: ', endpoints);
        _.forEach(endpoints, endpoint => logger.info('ENDPOINT ' + endpoint.path + ' ' + endpoint.methods.join(',')));
      }

      module.exports.app = express.app;
      if (startup_cb) {
        return startup_cb(error, express.app);
      }
    });
  });
};

module.exports.start = start;
module.exports.app;
