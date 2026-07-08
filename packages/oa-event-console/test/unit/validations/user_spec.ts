//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const {
  users_read_schema,
  user_create_schema,
  user_read_schema,
  user_update_schema,
  user_delete_schema,
  user_reset_password_schema,
} = require('../../../app/validations/user');

const VALID_USER = {
  username: 'alice',
  group: 'admin',
  email: 'alice@example.com',
};

describe('Unit::EventConsole::validations::user', function () {
  describe('users_read_schema', function () {
    it('accepts an empty object', function () {
      const { error } = users_read_schema.validate({});
      expect(error).to.be.undefined;
    });

    it('rejects unknown keys', function () {
      const { error } = users_read_schema.validate({ foo: 'bar' });
      expect(error).to.exist;
      expect(error.message).to.equal('read is invalid');
    });

    it('rejects a non-object', function () {
      const { error } = users_read_schema.validate('string');
      expect(error).to.exist;
    });
  });

  describe('user_create_schema', function () {
    it('accepts a full valid user', function () {
      const { error } = user_create_schema.validate({ user: VALID_USER });
      expect(error).to.be.undefined;
    });

    it('rejects missing user key', function () {
      const { error } = user_create_schema.validate({});
      expect(error).to.exist;
      expect(error.message).to.equal('No user in data');
    });

    it('rejects missing username', function () {
      const { error } = user_create_schema.validate({
        user: { group: 'admin', email: 'a@b.com' },
      });
      expect(error).to.exist;
    });

    it('rejects username below min length', function () {
      const { error } = user_create_schema.validate({
        user: { ...VALID_USER, username: 'abc' },
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Username must be at least 4 characters');
    });

    it('rejects username with non-alphanumerics', function () {
      const { error } = user_create_schema.validate({
        user: { ...VALID_USER, username: 'bad user' },
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Username can only contain alphanumeric');
    });

    it('rejects non-string username', function () {
      const { error } = user_create_schema.validate({
        user: { ...VALID_USER, username: 42 },
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Username must be a string');
    });

    it('rejects malformed email', function () {
      const { error } = user_create_schema.validate({
        user: { ...VALID_USER, email: 'nope' },
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Email address is invalid');
    });

    it('rejects missing email', function () {
      const { error } = user_create_schema.validate({
        user: { username: 'alice', group: 'admin' },
      });
      expect(error).to.exist;
    });

    it('rejects non-alphanumeric group', function () {
      const { error } = user_create_schema.validate({
        user: { ...VALID_USER, group: 'bad-group' },
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Group can only contain alphanumeric');
    });

    it('rejects unknown top-level keys', function () {
      const { error } = user_create_schema.validate({ user: VALID_USER, extra: 1 });
      expect(error).to.exist;
    });
  });

  describe('user_read_schema', function () {
    it('accepts a valid username', function () {
      const { error } = user_read_schema.validate({ user: 'alice' });
      expect(error).to.be.undefined;
    });

    it('accepts empty (user field optional)', function () {
      const { error } = user_read_schema.validate({});
      expect(error).to.be.undefined;
    });

    it('rejects short username', function () {
      const { error } = user_read_schema.validate({ user: 'ab' });
      expect(error).to.exist;
    });

    it('rejects unknown keys', function () {
      const { error } = user_read_schema.validate({ user: 'alice', extra: 1 });
      expect(error).to.exist;
    });
  });

  describe('user_update_schema', function () {
    it('accepts a full valid update', function () {
      const { error } = user_update_schema.validate({
        _id: 'deadbeef1234',
        ...VALID_USER,
      });
      expect(error).to.be.undefined;
    });

    it('rejects missing _id', function () {
      const { error } = user_update_schema.validate({ ...VALID_USER });
      expect(error).to.exist;
    });

    it('rejects non-alphanumeric _id', function () {
      const { error } = user_update_schema.validate({
        _id: 'bad-id',
        ...VALID_USER,
      });
      expect(error).to.exist;
    });

    it('rejects missing email', function () {
      const { error } = user_update_schema.validate({
        _id: 'deadbeef1234',
        username: 'alice',
        group: 'admin',
      });
      expect(error).to.exist;
    });

    it('rejects unknown keys', function () {
      const { error } = user_update_schema.validate({
        _id: 'deadbeef1234',
        ...VALID_USER,
        extra: 1,
      });
      expect(error).to.exist;
      expect(error.message).to.equal('No user in data');
    });
  });

  describe('user_delete_schema', function () {
    it('accepts a valid username', function () {
      const { error } = user_delete_schema.validate({ user: 'alice' });
      expect(error).to.be.undefined;
    });

    it('rejects missing user field', function () {
      const { error } = user_delete_schema.validate({});
      expect(error).to.exist;
      expect(error.message).to.equal('No user in data');
    });

    it('rejects short username', function () {
      const { error } = user_delete_schema.validate({ user: 'ab' });
      expect(error).to.exist;
      expect(error.message).to.equal('Username must be at least 4 characters');
    });
  });

  describe('user_reset_password_schema', function () {
    it('accepts a valid username', function () {
      const { error } = user_reset_password_schema.validate({ user: 'alice' });
      expect(error).to.be.undefined;
    });

    it('rejects missing user field', function () {
      const { error } = user_reset_password_schema.validate({});
      expect(error).to.exist;
      expect(error.message).to.equal('No user in data');
    });

    it('rejects non-alphanumeric username', function () {
      const { error } = user_reset_password_schema.validate({ user: 'bad user' });
      expect(error).to.exist;
      expect(error.message).to.equal('Username can only contain alphanumeric');
    });
  });
});
