/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:server:mvc');
var logger = logging.logger;
var debug = logging.debug;

var fs = require('fs');
var async = require('async');
var path = require('path');
var inspect = require('util').inspect;

var express = require('express');

exports.boot = function (app, finished_cb) {
  //  http://www.google.co.uk/codesearch/p?hl=en#4BLVglZP740/examples/mvc/mvc.js&q=app.get%5C(%20lang:js&d=2
  bootControllers(app, finished_cb);
};

// Bootstrap controllers

function bootControllers(app, finished_cb) {
  fs.readdir(path.join(__dirname, '/../controllers'), function (err, files) {
    if (err) finished_cb(err);

    async.forEachSeries(
      files,
      function (file, cb) {
        if (file[0] == '.') {
          debug('Skipping file', file);
          cb(null);
        } else {
          debug('Booting Controller', file);
          bootController(app, file, cb);
        }
      },
      finished_cb
    );
  });
}

// Example (simplistic) controller support

function bootController(app, file, cb) {
  var name = file.replace('.js', ''),
    actions = require('../controllers/' + name),
    plural = name + 's', // realistically we would use an inflection lib
    prefix = '/' + plural;

  // Special case for "app"
  if (name == 'app') {
    prefix = '/';
  }

  var security_func = function (req, res, next) {
    logger.debug('default blank security func() called');
    next();
    return;
  };

  if (actions.secure != undefined && actions.secure == true) {
    security_func = function (req, res, next) {
      logger.debug('calling alerts secure func');
      debug('secure func', arguments[2]);

      if (req.session.user) {
        logger.debug('restricting alerts ok...');
        next();
      } else {
        logger.warn('alerts are restricted');
        if (req.is('json')) {
          logger.debug('json restricted');
          res.render('401', { status: 401, layout: 'simple' });
        } else {
          res.redirect('/logins');
        }
      }
    };
  }

  Object.keys(actions).map(function (action) {
    var fn = controllerAction(name, plural, action, actions[action]);
    debug('booting: [%s] controller [%s] action [%s]', prefix, name, action);
    switch (action) {
      case 'index':
        app.get(prefix, security_func, fn);
        break;
      case 'show':
        app.get(prefix + '/:id.:format?', security_func, fn);
        break;
      case 'add':
        app.get(prefix + '/:id/add', security_func, fn);
        break;
      case 'create':
        app.post(prefix + '/', security_func, fn);
        app.post(prefix, security_func, fn);
        break;
      case 'edit':
        app.get(prefix + '/:id/edit', security_func, fn);
        break;
      case 'update':
        app.put(prefix + '/:id', security_func, fn);
        break;
      case 'destroy':
        app.del(prefix + '/:id', security_func, fn);
        break;
    }
  });
  logger.debug('Completed booting controller ' + name);

  cb(null);
}

// Proxy res.render() to add some magic

function controllerAction(name, plural, action, fn) {
  return function (req, res, next) {
    var render = res.render,
      format = req.params.format,
      view_path = path.join(__dirname, '/../views/', name, '/', action);

    logger.debug('Action path: ' + view_path);
    res.render = function (obj, options, fn) {
      logger.debug('-Action path: ' + view_path);

      res.render = render;
      // Template path
      if (typeof obj === 'string') {
        return res.render(obj, options, fn);
      }

      // Format support
      if (action == 'show' && format) {
        if (format === 'json') {
          return res.send(obj);
        } else {
          throw new Error('unsupported format "' + format + '"');
        }
      }
      // Render template
      res.render = render;
      options = options || {};
      options.locals = options.locals || {};
      // Expose obj as the "users" or "user" local
      if (action == 'index') {
        options.locals[plural] = obj;
      } else {
        options.locals[name] = obj;
      }
      return res.render(view_path, options, fn);
    };
    fn.apply(this, arguments);
  };
}
