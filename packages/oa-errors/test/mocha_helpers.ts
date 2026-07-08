//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const mocha = require('mocha');
const expect = require('chai').expect;
const sinon = require('sinon');

require('source-map-support').install();

const debug = require('debug')('oa:mocha:helpers');

module.exports = {
  mocha,
  expect,
  sinon,
  debug,
};
