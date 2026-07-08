//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Routing Index

// This is the main entry point for express http routes.
// Most routes are required from other files and mounted on a path.

// Logging
const { debug, logger } = require('oa-logging')('oa:event:route:index');

// NPM modules
const fs = require('fs');
const router = require('express').Router();
const passport = require('passport');
const mongoose = require('mongoose');

// OA modules
const { User } = require('../model/user');
const { Activities } = require('../../lib/activities');

const config = require('../../lib/config').get_instance();

// Create a passport authentication stategy from the model
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// We create a `route` function that is the main
// export for `express` to require and run.
const route = function (app) {
  // The `status` route is a special case which populates some info on
  // app.locals. Need a better way to pass it `app` or do this
  // setup elsewhere.
  require('./status').setup(app);

  app.use('/status', require('./status').router);
  app.use('/api', require('./api'));

  app.use('/apiconsole', require('./apiconsole'));
  app.use('/admin', require('./admin'));
  app.use('/console', require('./console'));
  app.use('/dashboard', require('./dashboard'));
  app.use('/debug', require('./debug'));
  app.use('/password', require('./password'));
  app.use('/rules', require('./rules'));
  app.use('/settings', require('./settings'));
  app.use('/views', require('./views'));
  app.use('/help', require('./help'));

  // Landing page
  app.get('/', function (req, res) {
    const redirectUrl = req.query?.redirectUrl;
    if (req.user?.username) {
      return res.render('dashboard', {
        title: 'Dashboard',
        user: req.user,
      });
    } else {
      return res.render('index', {
        title: 'Login',
        redirectUrl,
      });
    }
  });

  app.use('/', function (req, res, next) {
    if (mongoose.connection.readyState !== 1) {
      const err: any = new Error('Database connection is not ready');
      err.code = mongoose.connection.readyState;
      err.status = 503;
      return next(err);
    }
    return next();
  });

  // Not needed
  app.get('/login', (req, res) =>
    res.render('index', {
      title: 'Login',
    })
  );

  // Passport can produce non intuitive errors here.
  // Probably need to setup a custom callback to handle
  // errors (like form fields missing:400)
  app.post('/login', function (req, res, next) {
    debug('/login auth', req.body);
    //res.redirect '/dashboard'

    // Note passport.authenticate creates a function that is
    // called with ( req, res, next)
    return passport.authenticate('local', function (err, user, info) {
      logger.info('Passport Authenticate err[%s] info[%s] req.body.user[%s]', err, info, req.body.username);
      if (err) {
        logger.error('Authentication passport error for user[%s]', user, err, '');
        return next(err);
      }
      if (info) {
        logger.warn('Authentication failure [%s]', info);
        if (info.name === 'TooManyAttemptsError') {
          return res.redirect('/?account-locked');
        }
        if (info.name === 'AttemptTooSoonError') {
          return res.redirect('/?account-locked-temporarily');
        }
      }
      if (!user) {
        logger.error('Authentication failed for user[%s] info[%s]', user, info);
        return res.redirect('/?failed-login');
      }
      return req.logIn(user, function (err) {
        if (err) {
          logger.error('Authentication logIn error for user [%s]', user, err, '');
          return next(err);
        }
        Activities.store('user', 'login', user.username, { username: user.username });
        logger.info('Login UserID [%s]', user.id);
        let redirectUrl =
          req.body.redirectUrl != null && req.body.redirectUrl.length > 0 ? req.body.redirectUrl : '/dashboard';
        if (!redirectUrl.startsWith('/') || redirectUrl.startsWith('//')) {
          redirectUrl = '/dashboard';
        }
        return res.redirect(redirectUrl);
      });
    })(req, res, next);
  });

  // Logout the session
  app.all('/logout', function (req, res) {
    if (req.user) {
      Activities.store('user', 'logout', req.user.username, { username: req.user.username });
      logger.info('Logout UserID [%s]', req.user.id);
    }
    return req.logout(function (err) {
      if (err) {
        logger.error('Failed to logout: ', err);
      }
      // ensure session data is purged from the database
      req.session.destroy(function (err) {
        if (err) {
          return logger.error('Failed to destroy session: ', err);
        }
      });
      return res.redirect('/');
    });
  });

  if (config.app.swagger_docs && config.app.swagger_json) {
    const swaggerUi = require('swagger-ui-express');
    try {
      logger.info('Loading swagger document from ' + config.app.swagger_json);
      const swaggerDocument = JSON.parse(fs.readFileSync(config.app.swagger_json));
      app.use(
        '/api-docs',
        function (req, res, next) {
          if (req.user) {
            return next();
          } else {
            logger.error('Client tried to API-DOCS without authenticating');
            return res.redirect('/');
          }
        },
        swaggerUi.serve,
        swaggerUi.setup(swaggerDocument, { explorer: true })
      );

      app.get('/swagger.json', function (req, res, next) {
        if (req.user) {
          return res.json(swaggerDocument);
        } else {
          logger.error('Client tried to get swagger.json without authenticating');
          res.status(401);
          return res.json({ name: 'error', message: 'Not Permitted' });
        }
      });
    } catch (error) {
      logger.error('No `swagger.json` was found', error);
    }
  }

  // Not needed
  return app.get('/ping', (req, res) => res.status(200).send('pong!'));
};

module.exports = {
  route,
};
