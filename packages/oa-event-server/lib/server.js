/*
 * Copyright (C) 2012, 2020 Open Answers Ltd https://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Production entry point. The OAmonServer class lives in ./OAmonServer so
// tests can instantiate it without this file's auto-start side effects.
// Requiring this file still sets the `oafserver` global and starts the
// server, matching the behaviour before the OAmonServer extraction.

var async = require('async');
var logging = require('oa-logging')('oa:event:server');
var logger = logging.logger;
var debug = logging.debug;

var { OAmonServer } = require('./OAmonServer');

// oafserver becomes global
oafserver = module.exports = new OAmonServer();

oafserver.events.on('init.ExternalCommands', function (finished_cb) {
  async.series(
    {
      init: function (cb) {
        debug('Reading external commands');
        oafserver.external_commands_setup(cb);
      },
    },
    function (err, results) {
      finished_cb(err);
    }
  );
});

/*
 * start up the server
 */

oafserver.start(function (err) {
  if (err) process.exit(1);
});
