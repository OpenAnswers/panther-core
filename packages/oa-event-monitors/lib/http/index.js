/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:http');
var logger = logging.logger;
var debug = logging.debug;

var pkg = require('../../package.json');

var Class = require('joose').Class;
var express = require('express');
//var passport    = require('passport')
var Promise = require('bluebird');
var bodyParser = require('body-parser');
var lodashMerge = require('lodash').merge;
var fs = require('node:fs');
var needle = Promise.promisifyAll(require('needle'));
var moment = require('moment');

var Errors = require('oa-errors');
var AgentRole = require('../utils/agent_role').Role;
var rules = require('oa-event-rules');
var TinyCache = require('oa-tinycache').TinyCache;

var validator = require('./schema');

logger.info('AGENT LOADED HTTP');

var DEFAULT_HTTP_PORT = 5001;
var DEFAULT_APIKEY_SERVER = 'http://localhost:3001';
var DEFAULT_APIKEY_PATH = '/api/apikey/exists';
var DEFAULT_APIKEY_TOKEN = 'uuid-blah-uuid';

exports.Agent = Class('AgentHttp', {
  my: {
    has: {
      properties: { is: 'ro', init: ['port', 'apikeyserver', 'apikeytoken', 'app', 'weblog'] },
    },
  },

  does: [AgentRole], // picks up props and eventCB

  has: {
    port: { is: 'rw', init: DEFAULT_HTTP_PORT },
    apikeytoken: { is: 'rw', init: DEFAULT_APIKEY_TOKEN },
    apikeyserver: { is: 'rw', init: DEFAULT_APIKEY_SERVER },
    app: { is: 'rw', init: null },
    weblog: { is: 'rw', init: null },
  },

  after: {
    initialize: function (args) {
      var self = this;
      this.token_cache = new TinyCache({ timeout: 60, limit: 1000 });
      this.setPort(self.getProps().port || DEFAULT_HTTP_PORT);
      this.setApikeytoken(self.getProps().apikeytoken || DEFAULT_APIKEY_TOKEN);
      this.setApikeyserver(self.getProps().apikeyserver || DEFAULT_APIKEY_SERVER);
      this.setWeblog(self.getProps().weblog || null);
    },
  },

  methods: {
    // Check if a token is in the cache, or fetch it from the http service
    checkTokenAsync: function (token) {
      var self = this;
      return new Promise(function (resolve, reject) {
        // Check local cache
        const cached_body = self.token_cache.get(token, 60);
        if (cached_body) return resolve(cached_body);

        // Else request
        // ### Generic api auth
        var request_options = {
          headers: 'X-Api-Token: ' + self.getApikeytoken(),
          open_timeout: 5000,
          read_timeout: 5000,
          json: true,
        };
        var request_url = self.getApikeyserver() + DEFAULT_APIKEY_PATH;

        var url = request_url + '/' + token;
        debug('request to auth', url, request_options);

        needle
          .getAsync(url, request_options)
          .then(function (response, something) {
            debug('apikey response', response.body);
            if (response.body && response.body.found === true) {
              self.token_cache.set(token, response.body);
              return resolve(response.body);
            } else {
              self.token_cache.set(token, response.body, 10);
              logger.error('API Key Authentication failed. response[%j]', response.body, '');
              return reject(new Errors.HttpError401('API Key Authentication failed'));
            }
          })
          .catch(function (error) {
            logger.error('Auth service failed', error, '');
            var new_error = new Errors.HttpError401('Auth service failed');
            new_error.original = error;
            reject(new_error);
          });
      });
    },

    // Setup the express http listener
    setup: function (cb) {
      var self = this;

      let app = express();
      this.setApp(app);

      // request logging
      app.use(logging.RequestLogger.combined(logger));

      // hide backend server implementation
      app.use(function (req, res, next) {
        res.setHeader('X-Powered-By', 'Unicorns');
        return next();
      });

      // Cors - Let anyone use it
      app.all('/api/*', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header(
          'Access-Control-Allow-Headers',
          'X-Api-Token, Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With'
        );
        res.header('Access-Control-Allow-Methods', 'GET, PUT, POST');
        return next();
      });

      // Cors preflight
      app.options('/api/event/:action', function (req, res) {
        return res.send('');
      });

      //app.use('/', require('./routes'))

      // Allow json and normal posts
      app.use(bodyParser.json({ limit: 4096, strict: true }));

      // And fix the json errors
      app.use(function logJsonParseError(err, req, res, next) {
        if (err.status === 400 && err.name === 'SyntaxError' && err.body) {
          // Display extra information for JSON parses
          logger.error('JSON body parser error!', req.method + ' ' + req.url);
          logger.error('JSON body parser error!', err.body.slice(0, 100).toString());
        }
        err.code = 400;
        return next(err);
      });

      // Welcome
      app.get('/', function (req, res) {
        return res.json({
          message: 'Welcome to ' + pkg.name + ' ' + pkg.version,
        });
      });

      // ApiKey Service Auth for all events
      app.use('/api/event/:action', function (req, res, next) {
        debug('event pre auth', req.body);

        if (!req.headers['x-api-token']) return next(new Errors.HttpError401('No x-api-token header'));

        self
          .checkTokenAsync(req.headers['x-api-token'])
          .then(function (body) {
            debug('auth success', body);
            if (body.found === true) return next();
            else logger.error('API Key Authentication failed. response[%j]', body, '');
            return next(new Errors.HttpError401('API Key Authentication failed'));
          })
          .catch(Errors.HttpError401, function (error) {
            if (error.original) {
              logger.error('There was a problem with the authentication service');
              logger.error(error.original.stack);
            }
            next(error);
          })
          .catch(function (error) {
            logger.error('Request failed', error.stack);
            next(error);
          });
      });

      // Generic validation for all events
      app.use('/api/event/:action', function (req, res, next) {
        debug('event validation', req.body);

        if (!req.body.event) return next(new Errors.ValidationError('no event'));

        var ev = req.body.event;

        var v = validator(req.body);
        debug('validation says: ', v, validator.errors);

        if (v === true) {
          return next();
        }

        if (validator.errors && validator.errors.length > 0) {
          validator.errors.forEach(function (err) {
            logger.error('[%s] %s', err.dataPath, err.message);
          });
          let error = new Errors.ValidationError(validator.errors[0].message);
          error.event = ev;
          return next(error);
        }
        // validation has failed but no errors were found.

        logger.error('unexpected validation error');
        debug('validator: ', validator);
        let finalError = new Errors.ValidationError('validation error');
        finalError.event = ev;
        return next(finalError);
      });

      // Queue an event locally
      app.post('/api/event/queue', function (req, res) {
        self.getEventCB()(
          req.body.event, // event obj
          null, // normal CB
          function (err, result) {
            // queue CB
            debug('queue result', err, result);
            if (err) return res.status(400).json({ error: err.name, message: err.message });
            writeWebLog(self.getWeblog(), req.body.event);

            res.json({ status: 'Queued' });
          }
        );
      });

      // Create an event on the server
      app.post('/api/event/create', function (req, res) {
        self.getEventCB()(
          req.body.event, // event obj
          function (err, result) {
            // normal CB
            debug('create result', err, result);
            if (err) return res.status(400).json({ error: err.name, message: err.message });

            // check there was a result
            if (!result) return res.status(400).json({ error: 'empty', message: 'result from server was empty' });

            writeWebLog(self.getWeblog(), req.body.event);

            var data = { status: 'Created', message: '', event: {} };
            res.json(lodashMerge(data, { message: result.message, event: result.event }));
          },
          undefined, // queue CB
          function (err2, responseObj) {
            // local? CB
            if (err2) {
              return res.status(400).json({ error: err2.name || '', message: err2.message || 'unreported' });
            }

            var data = { status: '', message: '', event: {} };
            res.json(lodashMerge(data, responseObj));
          }
        );
      });

      app.use(function (error, req, res, next) {
        if (error.name === 'ValidationError' && !error.code) error.code = 400;
        const code = error.code ? error.code : 500;
        if (error.code !== 404 && error.code !== 401) logger.error(error.message, error.stack);
        const response = { error: { message: 'An error occurred' } };
        if (error.message !== undefined) response.error.message = error.message;
        if (error.name !== undefined) response.error.name = error.name;
        if (error.type !== undefined) response.error.type = error.type;
        if (error.status !== undefined) response.error.status = error.status;
        res.status(code).json(response);
      });
    },

    // Start up the server
    start: function (cb) {
      var self = this;

      this.setup();

      this.getApp().listen(self.getPort(), function (err) {
        return logger.info('Server listening on [%s]', self.getPort());
        cb(null, config.http.port);
      });

      //module.exports.app = app
    },
  },
});

const writeWebLog = (logfile, event) => {
  if (logfile === null) {
    return;
  }
  try {
    const syslogDate = moment().format('YYYY-MM-DDTHH:mm:ss');
    const syslogNode = event.node || 'unknown-node';
    const syslogTag = event.tag || 'unknown-tag';
    const syslogSummary = event.summary || 'unknown-summary';

    const syslogMsg = `${syslogDate} ${syslogNode} ${syslogTag}: ${syslogSummary}\n`;

    fs.writeFileSync(logfile, syslogMsg, { flag: 'a+' });
  } catch (err) {
    logger.error(`Failed to write weblog entry: ${err}`);
  }
};
