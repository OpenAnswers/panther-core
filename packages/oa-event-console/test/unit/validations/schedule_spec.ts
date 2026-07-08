//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { schedule_update_days_schema, schedule_delete_schema } = require('../../../app/validations/schedule');

// A valid v1 UUID for tests (variant '1' in position 15)
const VALID_UUID_V1 = 'c232ab00-9414-11ec-b909-0242ac120002';
const UUID_V4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('Unit::EventConsole::validations::schedule', function () {
  describe('schedule_update_days_schema', function () {
    it('accepts a uuidv1 with a weekday list', function () {
      const { error } = schedule_update_days_schema.validate({
        uuid: VALID_UUID_V1,
        days: ['Monday', 'Friday'],
      });
      expect(error).to.be.undefined;
    });

    it('accepts an empty days array', function () {
      const { error } = schedule_update_days_schema.validate({
        uuid: VALID_UUID_V1,
        days: [],
      });
      expect(error).to.be.undefined;
    });

    it('rejects a non-v1 uuid', function () {
      const { error } = schedule_update_days_schema.validate({
        uuid: UUID_V4,
        days: ['Monday'],
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid schedule uuid');
    });

    it('rejects a non-uuid string', function () {
      const { error } = schedule_update_days_schema.validate({
        uuid: 'not-a-uuid',
        days: ['Monday'],
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid schedule uuid');
    });

    it('rejects missing uuid', function () {
      const { error } = schedule_update_days_schema.validate({
        days: ['Monday'],
      });
      expect(error).to.exist;
    });

    it('rejects invalid weekday names', function () {
      const { error } = schedule_update_days_schema.validate({
        uuid: VALID_UUID_V1,
        days: ['Funday'],
      });
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid schedule weekeday');
    });

    it('accepts all seven weekdays', function () {
      const { error } = schedule_update_days_schema.validate({
        uuid: VALID_UUID_V1,
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      });
      expect(error).to.be.undefined;
    });
  });

  describe('schedule_delete_schema', function () {
    it('accepts a uuidv1', function () {
      const { error } = schedule_delete_schema.validate({ uuid: VALID_UUID_V1 });
      expect(error).to.be.undefined;
    });

    it('rejects missing uuid', function () {
      const { error } = schedule_delete_schema.validate({});
      expect(error).to.exist;
    });

    it('rejects a non-v1 uuid', function () {
      const { error } = schedule_delete_schema.validate({ uuid: UUID_V4 });
      expect(error).to.exist;
      expect(error.message).to.equal('Invalid schedule uuid');
    });
  });
});
