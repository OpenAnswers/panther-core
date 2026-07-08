//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { inventory_delete_schema } = require('../../../app/validations/inventory');

describe('Unit::EventConsole::validations::inventory', function () {
  describe('inventory_delete_schema', function () {
    it('accepts a data array of alphanumeric ids', function () {
      const { error } = inventory_delete_schema.validate({
        data: ['abc123', 'def456'],
      });
      expect(error).to.be.undefined;
    });

    it('accepts an empty data array', function () {
      const { error } = inventory_delete_schema.validate({ data: [] });
      expect(error).to.be.undefined;
    });

    it('rejects missing data key', function () {
      const { error } = inventory_delete_schema.validate({});
      expect(error).to.exist;
    });

    it('rejects non-object input', function () {
      const { error } = inventory_delete_schema.validate('abc');
      expect(error).to.exist;
    });

    it('rejects ids containing non-alphanumerics', function () {
      const { error } = inventory_delete_schema.validate({
        data: ['abc-123'],
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid inventory::delete');
    });

    it('rejects unknown top-level keys', function () {
      const { error } = inventory_delete_schema.validate({
        data: ['abc'],
        extra: 'nope',
      });
      expect(error).to.exist;
    });
  });
});
