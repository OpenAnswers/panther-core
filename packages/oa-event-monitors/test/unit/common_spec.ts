//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const OaMon = require('../../common');

describe('common', function () {
  it('provides an OaMon instance', function () {
    const oamon = new OaMon();
    expect(oamon).to.be.a('object');
  });
});
