//
// Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
var logging = require('oa-logging')('event:server:api');
var logger = logging.logger;
var debug = logging.debug;

// npm modules
//var bodyParser = require('body-parser');

const express = require('express');

const router = express.Router();

router.get('/', function (req, res) {
  res.json({ message: 'welcome to the API', version: 'v1' });
});

//router.use(bodyParser.json());

router.use('/settings', require('./settings'));

module.exports = router;
