/*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

var async = require("async");
var opts = require("opts");
mongoose = require("mongoose");
Users = require("../models/user");
Layouts = require("../models/layout");
Filters = require("../models/filter");

var inspect = require("util").inspect;

var username = undefined;
var groupname = undefined;
var password = undefined;

DEFAULT_HOSTNAME = "localhost";
DEFAULT_DATABASE = "oa";

DEFAULT_PASSWORD = "changeme";
DEFAULT_GROUP = "user";

async.series(
  {
    args: function(cb) {
      var options = [
        {
          short: "u",
          long: "username",
          description: "username to create",
          value: true
        },
        {
          short: "g",
          long: "group",
          description: "Group name",
          value: true
        },
        {
          short: "p",
          long: "password",
          description: "password for user",
          value: true
        },
        {
          short: "h",
          long: "hostname",
          description: "MongoDB hostname",
          value: true
        },
        {
          short: "d",
          long: "database",
          description: "database name ",
          value: true
        }
      ];

      opts.parse(options, true);
      var hostname = opts.get("hostname") || DEFAULT_HOSTNAME;
      var database = opts.get("database") || DEFAULT_DATABASE;
      username = opts.get("username");
      if (!username) return cb("username missing, use --help");

      password = opts.get("password") || DEFAULT_PASSWORD;
      groupname = opts.get("group") || DEFAULT_GROUP;

      var connection_url = "mongodb://" + hostname + "/" + database;
      console.log("connecting to: " + connection_url);

      var db = mongoose.connect(connection_url);
      db.connection.on("open", function() {
        // console.log( "mongo connected" );
        cb(null);
      });
    },
    check_user_doesnt_exist: function(cb) {
      Users.findOne({ login: username }, function(err, doc) {
        //console.log( "checked user: " + inspect( arguments ) );
        if (err) cb(err);
        if (doc) cb("user: " + username + " already exists");
        else cb(err || doc);
      });
    },
    create_user: function(cb) {
      console.log("creating user");
      var user = new Users();
      user.login = username;
      user.password = password;
      user.group = groupname;

      user.save(cb);
    },
    create_default_layout: function(cb) {
      Layouts.findOne({ name: "default", system: true, user: null }, { columns: 1 }, function(err, result) {
        if (err) return cb(err);
        if (!result) return cb(new Error("Could not find the system default view"));

        var users_default_view = new Layouts({
          name: "default",
          system: false,
          user: username,
          columns: result.columns
        });
        users_default_view.save(cb);
      });
    },
    create_default_filter: function(cb) {
      var default_filter = { name: "default", user: username };
      default_filter.f = new Array();
      var users_default_filter = new Filters(default_filter);
      users_default_filter.save(cb);
    }
  },
  function(err, args) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
);
