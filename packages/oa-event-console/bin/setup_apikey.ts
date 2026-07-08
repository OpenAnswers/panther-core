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
      ' -u apikey owner' +
      ' -o --once ' +
      ' -h --help   This help'
  );
  process.exit(1);
}

// opt setup
opt.config = argv.c || argv.config || path.join(__dirname, '..', 'config.yml');
opt.owner = argv.u;
opt.once = argv.o || argv.once;

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

if (opt.config === true || opt.config === false || !conf_stat) {
  opt_error.push('--config requires a file that exists');
}

if (opt.owner === false) {
  opt_error.push('-u <username> required');
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
const { ApiKey } = require('../app/model/apikey');

// Connect and do the stuff
Mongoose.connect(function () {
  logger.info('Connection open', config.mongodb.uri);

  debug('owner', opt.owner);

  return ApiKey.findOne({ username: opt.owner })
    .then(function (result) {
      let apiKey;
      if (opt.once) {
        if (!result) {
          apiKey = new ApiKey();
          apiKey.username = opt.owner;
          apiKey.created = new Date();
          return apiKey.save();
        }
      } else {
        apiKey = new ApiKey();
        apiKey.username = opt.owner;
        apiKey.created = new Date();
        return apiKey.save();
      }
    })
    .then(function (res) {
      debug('res', res);
      if (res) {
        return logger.info('added ApiKey [%s] for [%s]', res.apikey, opt.owner);
      } else {
        return logger.info('ApiKey for [%s] already exists', opt.owner);
      }
    })
    .finally(() => Mongoose.db.close());
});
