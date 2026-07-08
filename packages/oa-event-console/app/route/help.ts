// # Routes - /help

// logging
const { logger, debug } = require('oa-logging')('oa:event:routes:help');
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// npm modules
const pug = require('pug');
const router = require('express').Router();

// oa modules
const Errors = require('oa-errors');
const { _ } = require('oa-helpers');

const config = require('../../lib/config').get_instance();

// Some help info
router.get('/', function (req, res) {
  const { app } = config;
  return res.render('help', {
    title: 'Help',
    user: req.user,
    domain: app.domain,
    url: app.url,
    syslog_port: app.syslog_port,
  });
});

module.exports = router;
