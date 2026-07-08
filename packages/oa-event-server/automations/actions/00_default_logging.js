//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

var inspect = require('util').inspect;

var logit = function (obj, cb) {
  logger.warn('default action caught with alert(s)' + inspect(obj));
  cb(null);
};

module.exports = {
  type: 'internal_function',
  command: logit,
  name: 'default',
};
