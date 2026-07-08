//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { git_commit_msg_schema } = require('../../../app/validations/import_rules');

describe('Unit::EventConsole::validations::import_rules', function () {
  describe('git_commit_msg_schema', function () {
    it('accepts a simple message', function () {
      const { error } = git_commit_msg_schema.validate('fix rules for agent-1');
      expect(error).to.be.undefined;
    });

    it('accepts messages with allowed punctuation', function () {
      const { error } = git_commit_msg_schema.validate('update +new -old $env !fix #42 @user');
      expect(error).to.be.undefined;
    });

    it('treats empty string as undefined (empty()-converted)', function () {
      const { error, value } = git_commit_msg_schema.validate('');
      expect(error).to.be.undefined;
      expect(value).to.be.undefined;
    });

    it('rejects messages with disallowed characters', function () {
      const { error } = git_commit_msg_schema.validate('bad/commit');
      expect(error).to.exist;
      expect(error.message).to.equal('Commit Message contains invalid characters');
    });

    it('rejects messages with newlines', function () {
      const { error } = git_commit_msg_schema.validate('line1\nline2');
      expect(error).to.exist;
      expect(error.message).to.equal('Commit Message contains invalid characters');
    });

    it('accepts a message of exactly 256 bytes', function () {
      const msg = 'a'.repeat(256);
      const { error } = git_commit_msg_schema.validate(msg);
      expect(error).to.be.undefined;
    });

    it('rejects a message longer than 256 bytes', function () {
      const msg = 'a'.repeat(257);
      const { error } = git_commit_msg_schema.validate(msg);
      expect(error).to.exist;
      expect(error.message).to.equal('Commit Message is too long');
    });
  });
});
