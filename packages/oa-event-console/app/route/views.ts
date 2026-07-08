//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { logger, debug } = require('oa-logging')('oa:event:route:filters');

const router = require('express').Router();

const { Field } = require('../../lib/field');

// Protect this route
router.use(function (req, res, next) {
  if (req.user != null) {
    return next();
  } else {
    logger.error('Client tried to access console without auth session', req.sessionID);
    return res.redirect(`/?redirectUrl=${req.originalUrl}`);
  }
});

// Display the filter interface
router.get('/', (req, res, next) =>
  res.render('views', {
    title: 'Views',
    user: req.user,
    fields_list: Field.list(),
  })
);

module.exports = router;
