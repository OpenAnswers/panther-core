//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { empty_schema } = require('../../../app/validations/empty');

describe('Unit::EventConsole::validations::empty', function () {
  it('accepts an empty object', function () {
    const { error } = empty_schema.validate({});
    expect(error).to.be.undefined;
  });

  it('rejects unknown keys', function () {
    const { error } = empty_schema.validate({ foo: 'bar' });
    expect(error).to.exist;
  });

  it('rejects a non-object', function () {
    const { error } = empty_schema.validate('string');
    expect(error).to.exist;
  });
});
