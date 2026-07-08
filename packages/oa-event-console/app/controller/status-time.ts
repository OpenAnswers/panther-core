//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Routes - rules

// logging modules
const { logger, debug } = require('oa-logging')('oa:event:controller:status');

// node modules
const fs = require('fs');
const path = require('path');

// oa modules
const { Path } = require('../../lib/path');
const { Config } = require('../../lib/config');
const { SocketIO } = require('../../lib/socketio');

debug('status setup');

const isDirectorySync = function (path) {
  const stat = fs.statSync(path);
  return stat && stat.isDirectory();
};

var walk = function (dir) {
  debug('walking directory sync', dir);
  let results = [];
  const entries = fs.readdirSync(dir);

  entries.forEach(function (entry) {
    entry = path.join(dir, entry);
    if (isDirectorySync(entry)) {
      debug('walk sync found directory');
      results.push(entry);
      return (results = results.concat(walk(entry)));
    }
  });

  return results;
};

// Not in use yet
const isDirectory = function (path, cb) {
  let stat;
  return (stat = fs.stat(path, function (err, cb) {
    if (err) {
      cb(err);
    }
    if (stat && stat.isDirectory()) {
      return cb(null, path);
    }
  }));
};

const walkDirectory = function (dir, cb) {
  debug('walking directory async', dir);
  const results = [];
  return fs.readdir(dir, (err, entries) =>
    entries.forEach(function (entry) {
      entry = path.join(dir, entry);
      return isDirectory(entry, function (err, path) {
        debug('walk async found directory', path);
        return cb(path);
      });
    })
  );
};

// We need `app` to set the app local variables.
// There's probably a better way to do this
module.exports = function (app) {
  let dir;
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const dirs = [Path.views, Path.assets];
  let watch_dirs = dirs;

  for (dir of dirs) {
    watch_dirs = watch_dirs.concat(walk(dir));
  }

  //dirs = for dir in fs.readdirSync(Path.views) when
  logger.debug('watching dirs for changes', watch_dirs);

  return (() => {
    const result = [];
    for (dir of watch_dirs) {
      result.push(
        fs.watch(dir, function (event, filename) {
          debug('event is: ' + event);
          app.locals.update_time = Date.now();
          SocketIO.io.emit('time_update', {
            time: Date.now(),
            event,
          });

          if (filename) {
            return debug('filename provided: ' + filename);
          } else {
            return debug('filename not provided');
          }
        })
      );
    }
    return result;
  })();
};
