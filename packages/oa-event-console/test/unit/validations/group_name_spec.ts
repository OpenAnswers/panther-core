//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { group_name_definition } = require('../../../app/validations/group_name');

describe('Unit::EventConsole::validations::group_name', function () {
  it('accepts a valid alphanumeric name', function () {
    const { error, value } = group_name_definition.validate('admin');
    expect(error).to.be.undefined;
    expect(value).to.equal('admin');
  });

  it('accepts a single character', function () {
    const { error } = group_name_definition.validate('a');
    expect(error).to.be.undefined;
  });

  it('accepts mixed case and digits', function () {
    const { error } = group_name_definition.validate('Group1');
    expect(error).to.be.undefined;
  });

  it('rejects an empty string with a helpful message', function () {
    const { error } = group_name_definition.validate('');
    expect(error).to.exist;
    expect(error.message).to.equal('Group must not be empty');
  });

  it('rejects non-string values', function () {
    const { error } = group_name_definition.validate(42);
    expect(error).to.exist;
    expect(error.message).to.equal('Group must be a string');
  });

  it('rejects names with non-alphanumeric characters', function () {
    const { error } = group_name_definition.validate('bad name');
    expect(error).to.exist;
    expect(error.message).to.equal('Group can only contain alphanumeric');
  });

  it('rejects names with punctuation', function () {
    const { error } = group_name_definition.validate('admin-group');
    expect(error).to.exist;
    expect(error.message).to.equal('Group can only contain alphanumeric');
  });
});
