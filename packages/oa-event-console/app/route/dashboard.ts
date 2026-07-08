//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:route:dashboard');

// npm modules
const router = require('express').Router();

// Protect this route
router.use(function (req, res, next) {
  if (req.user != null) {
    return next();
  } else {
    logger.error('Client tried to access dashboard without auth session', req.sessionID);
    return res.redirect(`/?redirectUrl=${req.originalUrl}`);
  }
});

// Dashboard
router.get('/', (req, res) =>
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user,
  })
);

module.exports = router;
