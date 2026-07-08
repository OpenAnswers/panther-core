//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Mocha App Instance

// An express app loaded, so all mocha tests can startup and use the single
// Express app. Still needs a mongodb instance

const debug = require('debug')('oa:event:mocha:app');
const fs = require('fs');
const Promise = require('bluebird');
const { copy_rules_Async } = require('./mocha_helpers');

// Get a config
const config = require('../lib/config').load_file('./test/fixture/config.test.yml', 'default');
debug('config', config);

// Set test so logging is silenced
process.env.NODE_ENV = 'test';

let app: any = null;
let connected_status = false;
let express: any = null;

// Mongoose and connected status
const { SocketIO } = require('../lib/socketio');
const { Mongoose } = require('../lib/mongoose');
const { ExpressApp } = require('../lib/express');

const is_connected = function () {
  return connected_status;
};

const get_app = function () {
  return express.app;
};

const app_up = function (cb: Function) {
  if (connected_status) {
    return cb(null, app);
  }
  debug('connecting');

  copy_rules_Async()
    .then(function (results: any) {
      debug('files copied');
      Mongoose.connect(function (err: any, res: any) {
        if (err) {
          console.error(err);
          if (cb) {
            cb(err);
          }
          throw err;
        }
        debug('connected to mongoose');
        connected_status = true;

        // Setup the app
        express = new ExpressApp({ config });
        const sio = SocketIO.create(express);
        app = express.app;
        debug('express app setup for testing');
        cb(null, app);
      });
    })
    .catch(function (error: any) {
      cb(error);
    });
};

// And allow everyone to access the instance
module.exports = app_up;
