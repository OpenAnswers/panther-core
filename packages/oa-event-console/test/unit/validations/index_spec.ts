//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const validations = require('../../../app/validations');

describe('Unit::EventConsole::validations::index', function () {
  const expected_exports = [
    'empty_schema',
    'apikeys_read_schema',
    'apikey_schema',
    'apikey_create_schema',
    'apikey_read_schema',
    'apikey_delete_schema',
    'password_requested_schema',
    'password_reset_token_schema',
    'password_reset_schema',
    'inventory_delete_schema',
    'rules_agent_name_schema',
    'rules_group_name_schema',
    'schedule_delete_schema',
    'schedule_update_days_schema',
    'users_read_schema',
    'user_create_schema',
    'user_read_schema',
    'user_delete_schema',
    'user_update_schema',
    'user_reset_password_schema',
    'git_commit_msg_schema',
  ];

  expected_exports.forEach(function (name) {
    it(`re-exports ${name}`, function () {
      expect(validations[name]).to.exist;
      expect(validations[name].validate).to.be.a('function');
    });
  });

  it('aliases apikeys_read_schema to empty_schema', function () {
    expect(validations.apikeys_read_schema).to.equal(validations.empty_schema);
  });
});
