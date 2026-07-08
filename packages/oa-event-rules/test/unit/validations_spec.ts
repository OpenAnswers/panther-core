//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:unit:rules:validations');

const { expect } = require('../mocha_helpers');

const {
  rule_validator,
  ruleset_validator,
  group_validator,
  groups_validator,
  schedule_validator,
  server_rules_validator,
  validate_server_rules,
  validate_server_groups_section,
  joi_error_summary,
} = require('../../lib/validations');

describe('validations', function () {
  describe('rule_validator', function () {
    it('accepts a rule with a selector and an action', function () {
      const { error } = rule_validator.validate({
        name: 'r1',
        equals: { node: 'n1' },
        discard: true,
      });
      expect(error).to.equal(undefined);
    });

    it('rejects a rule with no selector', function () {
      const { error } = rule_validator.validate({
        name: 'r1',
        discard: true,
      });
      expect(error).to.be.ok;
      expect(error.message).to.match(/missing a selector|must contain at least one/i);
    });

    it('rejects a rule with no action', function () {
      const { error } = rule_validator.validate({
        name: 'r1',
        all: true,
      });
      expect(error).to.be.ok;
    });

    it('populates a uuid default when none provided', function () {
      const { error, value } = rule_validator.validate({
        name: 'r1',
        all: true,
        discard: true,
      });
      expect(error).to.equal(undefined);
      expect(value.uuid).to.exist;
    });

    it('rejects an invalid uuid', function () {
      const { error } = rule_validator.validate({
        name: 'r1',
        uuid: 'not-a-uuid',
        all: true,
        discard: true,
      });
      expect(error).to.be.ok;
    });

    it('accepts replace as an array of replacement definitions', function () {
      const { error } = rule_validator.validate({
        name: 'r1',
        all: true,
        replace: [
          { field: 'summary', this: 'a', with: 'b' },
          { field: 'summary', this: 'c', with: 'd' },
        ],
      });
      expect(error).to.equal(undefined);
    });
  });

  describe('ruleset_validator', function () {
    it('accepts an empty ruleset', function () {
      const { error } = ruleset_validator.validate({ rules: [] });
      expect(error).to.equal(undefined);
    });

    it('rejects a ruleset containing an invalid rule', function () {
      const { error } = ruleset_validator.validate({
        rules: [{ name: 'r1' }],
      });
      expect(error).to.be.ok;
    });
  });

  describe('schedule_validator', function () {
    it('accepts a well-formed schedule', function () {
      const { error } = schedule_validator.validate({
        name: 'business-hours',
        start: '09:00',
        end: '17:30',
        days: ['Monday', 'Tuesday'],
      });
      expect(error).to.equal(undefined);
    });

    it('requires name / start / end', function () {
      expect(schedule_validator.validate({ start: '09:00', end: '10:00' }).error).to.be.ok;
      expect(schedule_validator.validate({ name: 's', end: '10:00' }).error).to.be.ok;
      expect(schedule_validator.validate({ name: 's', start: '09:00' }).error).to.be.ok;
    });

    it('rejects malformed times', function () {
      expect(
        schedule_validator.validate({
          name: 's',
          start: '9:00',
          end: '10:00',
        }).error
      ).to.be.ok;
      expect(
        schedule_validator.validate({
          name: 's',
          start: '09:00',
          end: '10:99',
        }).error
      ).to.be.ok;
    });

    it('rejects unknown day names', function () {
      const { error } = schedule_validator.validate({
        name: 's',
        start: '09:00',
        end: '10:00',
        days: ['Funday'],
      });
      expect(error).to.be.ok;
    });

    it('rejects unknown properties', function () {
      const { error } = schedule_validator.validate({
        name: 's',
        start: '09:00',
        end: '10:00',
        bogus: true,
      });
      expect(error).to.be.ok;
      expect(error.message).to.match(/is not permitted in schedule/);
    });
  });

  describe('group_validator', function () {
    it('accepts a group with selector block and rules', function () {
      const { error } = group_validator.validate({
        select: { all: true },
        rules: [{ name: 'r1', all: true, discard: true }],
      });
      expect(error).to.equal(undefined);
    });

    it('accepts a group with top-level selector keys (no select: block)', function () {
      const { error } = group_validator.validate({
        all: true,
        rules: [{ name: 'r1', all: true, discard: true }],
      });
      expect(error).to.equal(undefined);
    });

    it('rejects a group that mixes select: block and top-level selectors', function () {
      const { error } = group_validator.validate({
        select: { all: true },
        equals: { node: 'n' },
        rules: [],
      });
      expect(error).to.be.ok;
      expect(error.message).to.match(/Can not have both a select: block/);
    });

    it('rejects a group with no selector at all', function () {
      const { error } = group_validator.validate({
        rules: [],
      });
      expect(error).to.be.ok;
    });
  });

  describe('groups_validator', function () {
    it('accepts a minimal groups document', function () {
      const { error } = groups_validator.validate(
        {
          _order: ['g1'],
          g1: { all: true, rules: [] },
        },
        { context: { ordered_groups: ['g1'], group_keys: ['g1'], schedule_names: [] } }
      );
      expect(error).to.equal(undefined);
    });

    it('rejects keys that begin or end with whitespace', function () {
      const { error } = groups_validator.validate({
        _order: [' g1 '],
        ' g1 ': { all: true, rules: [] },
      });
      expect(error).to.be.ok;
      expect(error.message).to.match(/can not begin or end with whitespace/);
    });
  });

  describe('validate_server_groups_section', function () {
    it('accepts matching _order and group keys', function () {
      const { error } = validate_server_groups_section({
        _order: ['g1'],
        g1: { all: true, rules: [] },
      });
      expect(error).to.equal(undefined);
    });

    it('flags an _order entry with no matching group', function () {
      const { error } = validate_server_groups_section({
        _order: ['missing'],
        g1: { all: true, rules: [] },
      });
      expect(error).to.be.ok;
    });

    it('flags a group that is not in _order', function () {
      const { error } = validate_server_groups_section({
        _order: ['g1'],
        g1: { all: true, rules: [] },
        g2: { all: true, rules: [] },
      });
      expect(error).to.be.ok;
    });
  });

  describe('validate_server_rules', function () {
    const valid_yaml = {
      globals: { rules: [] },
      groups: {
        _order: ['g1'],
        g1: { all: true, rules: [{ name: 'r1', all: true, discard: true }] },
      },
      schedules: [{ name: 'biz', start: '09:00', end: '17:00' }],
    };

    it('accepts a well-formed server.rules document', function () {
      const { error } = validate_server_rules(valid_yaml);
      expect(error).to.equal(undefined);
    });

    it('rejects an unknown top-level property', function () {
      const bad = { ...valid_yaml, bogus: 123 };
      const { error } = validate_server_rules(bad);
      expect(error).to.be.ok;
      expect(error.message).to.match(/is not permitted/);
    });

    it('cross-references schedule names used from rules', function () {
      const bad = {
        ...valid_yaml,
        groups: {
          _order: ['g1'],
          g1: {
            all: true,
            rules: [
              {
                name: 'r1',
                schedule: { name: 'unknown-schedule' },
                discard: true,
              },
            ],
          },
        },
      };
      const { error } = validate_server_rules(bad);
      expect(error).to.be.ok;
    });
  });

  describe('server_rules_validator', function () {
    it('is a compiled Joi schema', function () {
      expect(server_rules_validator).to.have.property('validate').that.is.a('function');
    });
  });

  describe('joi_error_summary', function () {
    it('returns an empty array when there is no error detail', function () {
      expect(joi_error_summary({})).to.eql([]);
    });

    it('returns an array of messages from a Joi error', function () {
      const { error } = rule_validator.validate({ name: 'r' });
      expect(error).to.be.ok;
      const summary = joi_error_summary(error);
      expect(summary).to.be.an('array').that.is.not.empty;
      expect(summary.every((m: any) => typeof m === 'string')).to.equal(true);
    });

    it('flattens nested context errors', function () {
      const fake = {
        details: [
          {
            message: 'outer',
            context: {
              details: [{ message: 'inner-1' }, { message: 'inner-2' }],
            },
          },
        ],
      };
      const summary = joi_error_summary(fake);
      expect(summary).to.include('outer');
      expect(summary).to.include('inner-1');
      expect(summary).to.include('inner-2');
    });
  });
});
