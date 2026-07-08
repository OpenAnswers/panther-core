//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { debug, logger } = require('oa-logging')('oa:event:route:admin');

// npm modules
const router = require('express').Router();

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

router.get('/', (req, res) =>
  res.render('admin', {
    title: 'Admin',
    user: req.user,
  })
);

module.exports = router;
