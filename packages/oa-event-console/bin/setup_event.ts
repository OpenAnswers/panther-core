#!/usr/bin/env node
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// This script sets up a user, password and email via passport
// It's used by the ansible signup playbook to initilize admin users

// log modules
let conf_stat, config;
const { logger, debug } = require('oa-logging')('oa:event:app');
const Promise: any = require('bluebird');
Promise.longStackTraces();
const path = require('path');
const fs = require('fs');

// ### Process command line argument options
const argv = require('minimist')(process.argv.slice(2));
const opt: any = {};
const opt_error = [];

// opt help
opt.help = argv.h || argv.help || false;
if (opt.help) {
  console.log(
    ' -c --config Event Console config file (including db connection details)' +
      //    ' --node     Node to set'+
      //    ' --tag      Tag to set'+
      //    ' --summary  Summary to set'+
      //    ' --severity Severity to set'+
      ' -j --json     JSON blob to insert' +
      ' -h --help     This help'
  );
  process.exit(1);
}

// opt setup
opt.config = argv.c || argv.config || path.join(__dirname, '..', 'config.yml');
opt.json =
  argv.j ||
  argv.json ||
  (() => {
    throw new Error('--json option required');
  })();

// opt error handling
try {
  conf_stat = fs.statSync(opt.config);
} catch (e) {
  if (e.code === 'ENOENT') {
    conf_stat = false;
  } else {
    throw e;
  }
}

if (opt_error.length > 0) {
  throw new Error('Problem with command line options.\n ' + opt_error.join('\n '));
}

// OA Config first, before anything else can get a `config` instance
// with nothing populated in it

try {
  config = require('../lib/config').load_file(opt.config, 'default');
} catch (error) {
  logger.error(`Failed to load config file [${opt.config}]:\n${error}`);
  throw error;
}

// Then Load modules which rely on config
const { Mongoose } = require('../lib/mongoose');

Mongoose.connect(() => logger.debug('connected'));

// Emit connect
Mongoose.db.once('open', function (cb) {
  logger.info('Connection open', config.mongodb.uri);

  debug('json details', opt.json);
  let json = JSON.parse(opt.json);

  if (!Array.isArray(json)) {
    json = [json];
  }
  const inserts = [];

  for (var event of json as any[]) {
    var now = new Date();
    if (event.first_occurrence == null) {
      event.first_occurrence = now;
    }
    if (event.last_occurrence == null) {
      event.last_occurrence = now;
    }
    event.state_change = now;
    if (event.severity == null) {
      event.severity = 1;
    }
    if (event.node == null) {
      event.node = 'localhost';
    }
    if (event.summary == null) {
      event.summary = 'default';
    }
    event.acknowledged = !!event.acknowledged;
    if (!event.identifier) {
      event.identifier = `${event.node}:${event.severity}:${event.tag}:${event.summary}`;
    }

    debug('event details', event);

    inserts.push(Mongoose.alerts.update(event, { $set: event }, { upsert: true, multi: true }));
  }

  return Promise.all(inserts)
    .then(function (res) {
      debug('res', res);
      return logger.info('all done [%s]', res);
    })
    .finally(() => Mongoose.db.close());
});
