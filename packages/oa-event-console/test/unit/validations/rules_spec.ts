//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { rules_group_name_schema, rules_agent_name_schema } = require('../../../app/validations/rules');

describe('Unit::EventConsole::validations::rules', function () {
  describe('rules_group_name_schema', function () {
    it('accepts a plain alphanumeric name', function () {
      const { error } = rules_group_name_schema.validate('Group1');
      expect(error).to.be.undefined;
    });

    it('accepts names with allowed punctuation', function () {
      const { error } = rules_group_name_schema.validate('my-group +test!');
      expect(error).to.be.undefined;
    });

    it('accepts names with @, #, $', function () {
      const { error } = rules_group_name_schema.validate('team@oa #1 $x');
      expect(error).to.be.undefined;
    });

    it('rejects names with disallowed characters', function () {
      const { error } = rules_group_name_schema.validate('bad/name');
      expect(error).to.exist;
      expect(error.message).to.contain('invalid characters');
    });

    it('rejects names with unicode', function () {
      const { error } = rules_group_name_schema.validate('gröüp');
      expect(error).to.exist;
    });
  });

  describe('rules_agent_name_schema', function () {
    it('accepts a 3-char alphanumeric name', function () {
      const { error } = rules_agent_name_schema.validate('abc');
      expect(error).to.be.undefined;
    });

    it('accepts a longer alphanumeric name', function () {
      const { error } = rules_agent_name_schema.validate('syslogAgent42');
      expect(error).to.be.undefined;
    });

    it('rejects a 2-char name (below min)', function () {
      const { error } = rules_agent_name_schema.validate('ab');
      expect(error).to.exist;
    });

    it('rejects names with spaces', function () {
      const { error } = rules_agent_name_schema.validate('agent name');
      expect(error).to.exist;
      expect(error.message).to.contain('invalid characters');
    });

    it('rejects names with dashes', function () {
      const { error } = rules_agent_name_schema.validate('agent-1');
      expect(error).to.exist;
    });

    it('rejects non-string values', function () {
      const { error } = rules_agent_name_schema.validate(123);
      expect(error).to.exist;
    });
  });
});
