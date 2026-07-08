//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { debug, logger } = require('oa-logging')('oa:event:route:apiconsole');

// npm modules
const _ = require('lodash');
const router = require('express').Router();

const { ApiKey } = require('../model/apikey');

const config = require('../../lib/config').get_instance();

// Protect this route
router.use(function (req, res, next) {
  if (req.user != null) {
    return next();
  } else {
    logger.error('Client tried to access admin without auth session', req.sessionID);
    return res.redirect(`/?redirectUrl=${req.originalUrl}`);
  }
});

// Protect this route
router.use(function (req, res, next) {
  debug('req.user', req.user, req.user.group);
  if (req.user.group && req.user.group === 'admin') {
    return next();
  } else {
    logger.error('Client tried to access admin without admin permissions', req.sessionID);
    return res.redirect('/dashboard?error=not-an-admin');
  }
});

router.get('/', function (req, res) {
  debug('req.user', req.user.username);
  return ApiKey.user_tokens_Async(req.user.username)
    .then(function (token_doc) {
      let api_url;
      if (config.app.url.match(/^https/)) {
        api_url = config.app.url;
      } else {
        api_url = `http://${config.event_monitors.http.host}:${config.event_monitors.http.port}`;
      }

      return res.render('apiconsole', {
        title: 'API Console',
        user: req.user,
        api: {
          tokens: _.map(token_doc, 'apikey'),
          url: api_url,
        },
      });
    })
    .catch(error =>
      res.render(
        'apiconsol',
        res.render('apiconsole', {
          title: 'API Console',
          user: req.user,
          tokens: '',
          error: {
            message: 'Failed to retrieve any API Keys',
          },
        })
      )
    );
});

module.exports = router;
