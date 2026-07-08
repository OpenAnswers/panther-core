//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:unit:rules:select_schedule');

const Errors = require('oa-errors');

const { expect, sinon } = require('../mocha_helpers');

const { SelectSchedule } = require('../../lib/select_schedule');
const { SelectBaseFieldValue } = require('../../lib/select_base');
const { Schedules } = require('../../lib/schedules');
const { Event } = require('../../lib/event');

describe('SelectSchedule', function () {
  const yaml_def = [
    {
      name: 'weekday',
      start: '00:00',
      end: '23:59',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
  ];

  beforeEach(function () {
    Schedules.generate(yaml_def);
  });

  it('has a label of "schedule"', function () {
    expect(SelectSchedule.label).to.equal('schedule');
  });

  it('extends SelectBaseFieldValue', function () {
    expect(new SelectSchedule('name', 'weekday')).to.be.an.instanceof(SelectBaseFieldValue);
  });

  it('description() exposes a schedule name input', function () {
    const d = SelectSchedule.description();
    expect(d.name).to.equal('schedule');
    expect(d.input).to.be.an('array');
    const names = d.input.map((i: any) => i.name);
    expect(names).to.include('name');
    expect(names).to.include('uuid');
  });

  describe('constructor', function () {
    it('stores field, value, and value_ori', function () {
      const ins = new SelectSchedule('name', 'weekday');
      expect(ins.field).to.equal('name');
      expect(ins.value).to.equal('weekday');
      expect(ins.value_ori).to.equal('weekday');
      expect(ins.label).to.equal('schedule');
    });

    it('throws via SelectBaseFieldValue when field is missing', function () {
      expect(() => new SelectSchedule(null, 'weekday')).to.throw(Errors.ValidationError);
    });
  });

  describe('generate', function () {
    it('returns an array containing a SelectSchedule', function () {
      const arr = SelectSchedule.generate({ schedule: { name: 'weekday' } });
      expect(arr).to.be.an('array').with.lengthOf(1);
      expect(arr[0]).to.be.an.instanceof(SelectSchedule);
      expect(arr[0].field).to.equal('name');
      expect(arr[0].value).to.equal('weekday');
    });

    it('increments the schedule ref count', function () {
      const sched = Schedules.find_by_name('weekday');
      const before = sched.ref_count ?? 0;
      SelectSchedule.generate({ schedule: { name: 'weekday' } });
      expect(sched.ref_count).to.equal(before + 1);
    });

    it('throws ValidationError when :schedule key is missing', function () {
      expect(() => SelectSchedule.generate({})).to.throw(Errors.ValidationError, /Definition needs :schedule key/);
    });

    it('throws ValidationError when fieldname is not "name"', function () {
      expect(() => SelectSchedule.generate({ schedule: { other: 'weekday' } })).to.throw(
        Errors.ValidationError,
        /must have a name/
      );
    });

    it('throws ValidationError when schedule name does not exist', function () {
      expect(() => SelectSchedule.generate({ schedule: { name: 'nope' } })).to.throw(
        Errors.ValidationError,
        /schedule name does not exist/
      );
    });

    it('throws ValidationError when value is empty/null', function () {
      expect(() => SelectSchedule.generate({ schedule: { name: null } })).to.throw(
        Errors.ValidationError,
        /value null/
      );
      expect(() => SelectSchedule.generate({ schedule: { name: '' } })).to.throw(Errors.ValidationError, /empty value/);
    });

    it('throws ValidationError when fieldname is the empty string', function () {
      expect(() => SelectSchedule.generate({ schedule: { '': 'weekday' } })).to.throw(
        Errors.ValidationError,
        /empty field/
      );
    });

    it('throws ValidationError when no selects could be built (empty schedule object)', function () {
      expect(() => SelectSchedule.generate({ schedule: {} })).to.throw(
        Errors.ValidationError,
        /No selects could be built/
      );
    });

    it('wraps an unexpected error thrown during construction as a ValidationError', function () {
      const sched = Schedules.find_by_name('weekday');
      const stub = sinon.stub(sched, 'ref_count_increment').throws(new TypeError('boom'));
      try {
        expect(() => SelectSchedule.generate({ schedule: { name: 'weekday' } })).to.throw(
          Errors.ValidationError,
          /Failed to create select from definition/
        );
      } finally {
        stub.restore();
      }
    });

    it('rethrows a ValidationError thrown during construction', function () {
      const sched = Schedules.find_by_name('weekday');
      const original = new Errors.ValidationError('inner-validation');
      const stub = sinon.stub(sched, 'ref_count_increment').throws(original);
      try {
        expect(() => SelectSchedule.generate({ schedule: { name: 'weekday' } })).to.throw(
          Errors.ValidationError,
          /inner-validation/
        );
      } finally {
        stub.restore();
      }
    });
  });

  describe('run', function () {
    it('returns true when the looked-up schedule reports is_in=true', function () {
      const ins = new SelectSchedule('name', 'weekday');
      const sched = Schedules.find_by_name('weekday');
      const stub = sinon.stub(sched, 'is_in').returns(true);
      try {
        expect(ins.run(Event.generate({}))).to.equal(true);
      } finally {
        stub.restore();
      }
    });

    it('returns false when the looked-up schedule reports is_in=false', function () {
      const ins = new SelectSchedule('name', 'weekday');
      const sched = Schedules.find_by_name('weekday');
      const stub = sinon.stub(sched, 'is_in').returns(false);
      try {
        expect(ins.run(Event.generate({}))).to.equal(false);
      } finally {
        stub.restore();
      }
    });

    it('returns false and does not throw when the schedule is missing', function () {
      const ins = new SelectSchedule('name', 'weekday');
      // Reset to an empty Schedules so find_by_name returns undefined
      Schedules.generate([]);
      expect(ins.run(Event.generate({}))).to.equal(false);
    });
  });

  describe('serialisation', function () {
    it('toString() describes field and value', function () {
      expect(new SelectSchedule('name', 'weekday').toString()).to.equal("name matches 'weekday'");
    });

    it('to_yaml_obj() nests name→value_ori under "schedule"', function () {
      const ins = new SelectSchedule('name', 'weekday');
      expect(ins.to_yaml_obj()).to.eql({ schedule: { name: 'weekday' } });
    });
  });
});
