/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var async = require('async');
var opts = require('opts');
mongoose = require('mongoose');
User = require('../models/user');
var inspect = require('util').inspect;
var async = require('async');

var groupname = undefined;
var username = undefined;
var password = undefined;

DEFAULT_HOSTNAME = 'localhost';
DEFAULT_DATABASE = 'oa';

async.series(
  {
    args: function (cb) {
      var options = [
        {
          short: 'g',
          long: 'group',
          description: 'primary group to set',
          value: true,
        },
        {
          short: 'u',
          long: 'username',
          description: 'user to modify',
          value: true,
        },
        {
          short: 'p',
          long: 'password',
          description: 'set password',
          value: true,
        },
        {
          short: 'h',
          long: 'hostname',
          description: 'MongoDB hostname',
          value: true,
        },
        {
          short: 'd',
          long: 'database',
          description: 'database name ',
          value: true,
        },
      ];

      opts.parse(options, true);

      groupname = opts.get('group');
      username = opts.get('username');
      password = opts.get('password');
      if (!username) return cb('user missing, use --help');

      var hostname = opts.get('hostname') || DEFAULT_HOSTNAME;
      var database = opts.get('database') || DEFAULT_DATABASE;
      var connection_url = 'mongodb://' + hostname + '/' + database;
      console.log('connecting to: ' + connection_url);
      var db = mongoose.connect(connection_url);
      db.connection.on('open', cb);
    },
    modify_group: function (cb) {
      if (!groupname) return cb(null);
      console.log('creating Group');
      User.findOne({ login: username }, function (err, user) {
        if (err) return cb(err);
        if (!user) return cb('User: ' + username + ' not found');
        user.group = groupname;
        user.save(cb);
      });
    },
    modify_password: function (cb) {
      if (!password) return cb(null);
      User.findOne({ login: username }, function (err, user) {
        if (err) return cb(err);
        if (!user) return cb('User: ' + username + ' not found');
        user.password = password;
        user.save(cb);
      });
    },
  },
  function (err, args) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
);
