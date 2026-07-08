//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const {
  password_requested_schema,
  password_reset_token_schema,
  password_reset_schema,
} = require('../../../app/validations/password');
const { RESET_TOKEN_LENGTH } = require('../../../app/model/user');

const VALID_TOKEN = 'a'.repeat(RESET_TOKEN_LENGTH);

describe('Unit::EventConsole::validations::password', function () {
  describe('password_reset_token_schema', function () {
    it('accepts a token of exactly RESET_TOKEN_LENGTH alphanumerics', function () {
      const { error } = password_reset_token_schema.validate(VALID_TOKEN);
      expect(error).to.be.undefined;
    });

    it('rejects a token that is too short', function () {
      const { error } = password_reset_token_schema.validate('a'.repeat(RESET_TOKEN_LENGTH - 1));
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid reset token');
    });

    it('rejects a token that is too long', function () {
      const { error } = password_reset_token_schema.validate('a'.repeat(RESET_TOKEN_LENGTH + 1));
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid reset token');
    });

    it('rejects a token with non-alphanumeric characters', function () {
      const { error } = password_reset_token_schema.validate('-'.repeat(RESET_TOKEN_LENGTH));
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid reset token');
    });

    it('rejects a missing token', function () {
      const { error } = password_reset_token_schema.validate(undefined);
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid reset token');
    });
  });

  describe('password_reset_schema', function () {
    it('accepts matching password + confirm with a valid token', function () {
      const { error } = password_reset_schema.validate({
        token: VALID_TOKEN,
        password: 'secret',
        confirm: 'secret',
      });
      expect(error).to.be.undefined;
    });

    it('rejects mismatched password and confirm', function () {
      const { error } = password_reset_schema.validate({
        token: VALID_TOKEN,
        password: 'secret',
        confirm: 'other',
      });
      expect(error).to.exist;
      expect(error.message).to.equal("Passwords don't match, try again");
    });

    it('rejects missing token', function () {
      const { error } = password_reset_schema.validate({
        password: 'secret',
        confirm: 'secret',
      });
      expect(error).to.exist;
    });

    it('rejects missing password', function () {
      const { error } = password_reset_schema.validate({
        token: VALID_TOKEN,
        confirm: 'secret',
      });
      expect(error).to.exist;
    });

    it('rejects missing confirm', function () {
      const { error } = password_reset_schema.validate({
        token: VALID_TOKEN,
        password: 'secret',
      });
      expect(error).to.exist;
    });
  });

  describe('password_requested_schema', function () {
    it('accepts a valid email', function () {
      const { error } = password_requested_schema.validate({ email: 'user@example.com' });
      expect(error).to.be.undefined;
    });

    it('rejects a malformed email', function () {
      const { error } = password_requested_schema.validate({ email: 'not-an-email' });
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid email address');
    });

    it('rejects a missing email', function () {
      const { error } = password_requested_schema.validate({});
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid email address');
    });

    it('rejects an email shorter than 3 chars', function () {
      const { error } = password_requested_schema.validate({ email: 'a' });
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid email address');
    });

    it('rejects unknown top-level keys', function () {
      const { error } = password_requested_schema.validate({
        email: 'user@example.com',
        extra: 1,
      });
      expect(error).to.exist;
    });
  });
});
