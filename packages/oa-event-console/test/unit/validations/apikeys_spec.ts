//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const {
  apikey_schema,
  apikey_create_schema,
  apikey_read_schema,
  apikey_delete_schema,
} = require('../../../app/validations/apikeys');
const { APIKEY_LENGTH } = require('../../../app/model/apikey');

const VALID_KEY = 'a'.repeat(APIKEY_LENGTH);

describe('Unit::EventConsole::validations::apikeys', function () {
  describe('apikey_schema', function () {
    it('accepts a key of exactly APIKEY_LENGTH alphanumeric chars', function () {
      const { error } = apikey_schema.validate(VALID_KEY);
      expect(error).to.be.undefined;
    });

    it('accepts a key mixing digits and letters', function () {
      const mixed = ('ab12' as string).repeat(APIKEY_LENGTH / 4);
      const { error } = apikey_schema.validate(mixed);
      expect(error).to.be.undefined;
    });

    it('rejects a missing (undefined) key as required', function () {
      const { error } = apikey_schema.validate(undefined);
      expect(error).to.exist;
      expect(error.message).to.equal('apikey is required');
    });

    it('rejects a non-string as "required"', function () {
      const { error } = apikey_schema.validate(12345);
      expect(error).to.exist;
      expect(error.message).to.equal('apikey is required');
    });

    it('rejects a key that is too short', function () {
      const { error } = apikey_schema.validate('a'.repeat(APIKEY_LENGTH - 1));
      expect(error).to.exist;
      expect(error.message).to.equal('apikey is invalid');
    });

    it('rejects a key that is too long', function () {
      const { error } = apikey_schema.validate('a'.repeat(APIKEY_LENGTH + 1));
      expect(error).to.exist;
      expect(error.message).to.equal('apikey is invalid');
    });

    it('rejects a key with non-alphanumeric characters', function () {
      const bad = '-'.repeat(APIKEY_LENGTH);
      const { error } = apikey_schema.validate(bad);
      expect(error).to.exist;
      expect(error.message).to.equal('apikey is invalid');
    });
  });

  describe('apikey_create_schema', function () {
    it('accepts an empty apikey object', function () {
      const { error } = apikey_create_schema.validate({ apikey: {} });
      expect(error).to.be.undefined;
    });

    it('rejects missing apikey key', function () {
      const { error } = apikey_create_schema.validate({});
      expect(error).to.exist;
    });

    it('rejects unknown top-level keys', function () {
      const { error } = apikey_create_schema.validate({ apikey: {}, extra: 1 });
      expect(error).to.exist;
    });
  });

  describe('apikey_read_schema', function () {
    it('accepts a valid apikey field', function () {
      const { error } = apikey_read_schema.validate({ apikey: VALID_KEY });
      expect(error).to.be.undefined;
    });

    it('rejects missing apikey', function () {
      const { error } = apikey_read_schema.validate({});
      expect(error).to.exist;
    });

    it('rejects a short apikey', function () {
      const { error } = apikey_read_schema.validate({ apikey: 'short' });
      expect(error).to.exist;
    });
  });

  describe('apikey_delete_schema', function () {
    it('accepts a valid apikey field', function () {
      const { error } = apikey_delete_schema.validate({ apikey: VALID_KEY });
      expect(error).to.be.undefined;
    });

    it('rejects missing apikey with custom message', function () {
      const { error } = apikey_delete_schema.validate({});
      expect(error).to.exist;
      expect(error.message).to.equal('apikey is required');
    });

    it('rejects an invalid apikey', function () {
      const { error } = apikey_delete_schema.validate({ apikey: 'not-valid' });
      expect(error).to.exist;
    });
  });
});
