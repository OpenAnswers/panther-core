//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const router = require('express').Router();

router.get('/', (req, res) => res.render('settings', { title: 'Settings' }));

router.get('/:action', (req, res) => res.render('settings', { title: 'Settings' }));

module.exports = router;
