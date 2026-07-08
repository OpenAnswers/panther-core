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
      ' -u --user   Username to setup/modify' +
      ' -p --pass   Password to set' +
      ' -e --email  Email address to set' +
      ' -g --group  Group (defaults "user")' +
      ' -h --help   This help'
  );
  process.exit(1);
}

// opt setup
opt.config = argv.c || argv.config || path.join(__dirname, '..', 'config.yml');
opt.user = argv.u || argv.user || opt_error.push('--user required');
opt.password = argv.p || argv.password || opt_error.push('--password required');
opt.email = argv.e || argv.email || opt_error.push('--email required');
opt.group = argv.g || argv.group || 'user';

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

if (opt.user === true || opt.user === false) {
  opt_error.push('--user requires a value');
}

if (opt.password === true || opt.password === false) {
  opt_error.push('--password requires a value');
}

if (opt.email === true || opt.email === false) {
  opt_error.push('--email requires a value');
}

if (opt.group === true || opt.group === false) {
  opt_error.push('--group requires a value');
}

if (opt_error.length > 0) {
  throw new Error('Problem with command line options.\n ' + opt_error.join('\n '));
}

// OA Config first, before anything else can get a `config` instance
// with nothing populated in it

try {
  config = require('../lib/config').load_file(opt.config, 'default');
} catch (error1) {
  const error = error1;
  logger.error(`Failed to load config file [${opt.config}]:\n${error}`);
  throw error;
}

// Then Load modules which rely on config
const { Mongoose } = require('../lib/mongoose');
const { User } = require('../app/model/user');
const { Filters } = require('../app/model/filters');

// setupAsync

const setup_Async = function (details) {
  debug('setup details', details);
  return new Promise(function (resolve, reject) {
    const user = new User(details);
    const { password } = details;
    delete details.password;
    let newuser = null;

    return User.register(user, password)
      .then(function (res_newuser) {
        newuser = res_newuser;
        console.log('setup user', details.username, newuser.created);

        return Filters.setup_initial_views(res_newuser.username);
      })
      .then(function (results) {
        logger.info('viewMine setup', results.mine._id);
        logger.info('viewAll setup', results.all._id);
        logger.info('viewUnack setup', results.unack._id);

        return resolve(newuser);
      })
      .catch(error => reject(error));
  });
};

// Get the mongoose User, set the passport password
// and then any user deyails
const password_Async = function (details) {
  debug('pass details', details);
  return new Promise((resolve, reject) =>
    User.findOne({ username: details.username })
      .then(user => user.setPassword(details.password))
      .then(function (user) {
        user.email = details.email;
        if (argv.group || argv.g) {
          user.group = details.group;
        }
        return user.save();
      })
      .then(function (res) {
        logger.info('user password saved');
        debug('res', res.ops);
        return resolve(res);
      })
      .catch(error => reject(error))
  );
};

Mongoose.connect(() => logger.debug('connected'));

// Emit connect
Mongoose.db.once('open', function (cb) {
  logger.info('Connection open', config.mongodb.uri);

  const details = {
    username: opt.user,
    password: opt.password,
    email: opt.email,
    group: opt.group,
  };

  debug('details', details);

  return User.collection
    .findOne({ username: details.username })
    .then(function (res) {
      if (res) {
        return password_Async(details);
      } else {
        return setup_Async(details);
      }
    })
    .then(function (res) {
      debug('res', res);
      return logger.info('all done [%s]', res.username);
    })
    .finally(() => Mongoose.db.close());
});
