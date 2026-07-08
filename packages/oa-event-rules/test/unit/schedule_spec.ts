const debug = require('debug')('oa:test:unit:rules:schedule');

const { expect } = require('../mocha_helpers');

const Errors = require('oa-errors');
const momentZone = require('moment-timezone');

const { Schedule } = require('../../lib/schedule');

const weekday_def = () => ({
  name: 'weekday',
  start: '09:00',
  end: '17:00',
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
});

describe('Schedule', function () {
  describe('generate validation', function () {
    it('throws when called with no definition', function () {
      const fn = () => Schedule.generate();
      expect(fn).to.throw(Errors.ValidationError, /No schedule definition/);
    });

    it('throws when the name is missing', function () {
      const def: any = weekday_def();
      delete def.name;
      const fn = () => Schedule.generate(def);
      expect(fn).to.throw(Errors.ValidationError, /No Schedule name/);
    });

    it('throws when start is not HH:mm', function () {
      const def: any = weekday_def();
      def.start = 'nine';
      const fn = () => Schedule.generate(def);
      expect(fn).to.throw(Errors.ValidationError, /Incorrect schedule start time/);
    });

    it('throws when end is not HH:mm', function () {
      const def: any = weekday_def();
      def.end = 'five';
      const fn = () => Schedule.generate(def);
      expect(fn).to.throw(Errors.ValidationError, /Incorrect schedule end time/);
    });

    it('throws when start equals end', function () {
      const def: any = weekday_def();
      def.start = '09:00';
      def.end = '09:00';
      const fn = () => Schedule.generate(def);
      expect(fn).to.throw(Errors.ValidationError, /must be different/);
    });

    it('throws when days is missing', function () {
      const def: any = weekday_def();
      delete def.days;
      const fn = () => Schedule.generate(def);
      expect(fn).to.throw(Errors.ValidationError, /No Schedule days of week/);
    });

    it('throws when days is not an array', function () {
      const def: any = weekday_def();
      def.days = 'Monday';
      const fn = () => Schedule.generate(def);
      expect(fn).to.throw(Errors.ValidationError, /Invalid days of week/);
    });

    it('throws when days array is empty', function () {
      const def: any = weekday_def();
      def.days = [];
      const fn = () => Schedule.generate(def);
      expect(fn).to.throw(Errors.ValidationError, /No Day\(s\) were selected/);
    });

    it('throws when a day name is invalid', function () {
      const def: any = weekday_def();
      def.days = ['Monday', 'Funday'];
      const fn = () => Schedule.generate(def);
      expect(fn).to.throw(Errors.ValidationError, /Invalid Day of Week/);
    });

    it('assigns a uuid if missing', function () {
      const def: any = weekday_def();
      const sched = Schedule.generate(def);
      expect(sched.uuid).to.be.a('string');
      expect(sched.uuid.length).to.be.greaterThan(0);
    });

    it('uses the provided uuid when given', function () {
      const def: any = weekday_def();
      def.uuid = 'fixed-uuid-1234';
      const sched = Schedule.generate(def);
      expect(sched.uuid).to.equal('fixed-uuid-1234');
    });
  });

  describe('constructor', function () {
    it('throws if no name is given', function () {
      const fn = () => new Schedule();
      expect(fn).to.throw(/requires a name first/);
    });

    it('builds a single timespan when end > start', function () {
      const sched = new Schedule('weekday', 'uuid-1', '09:00', '17:00', [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
      ]);
      expect(sched.timespans).to.have.lengthOf(1);
      expect(sched.timespans[0]).to.eql({ start: 9 * 3600, end: 17 * 3600 });
    });

    it('builds two timespans for midnight-wrap (end < start)', function () {
      const sched = new Schedule('overnight', 'uuid-2', '22:00', '06:00', ['Friday', 'Saturday']);
      expect(sched.timespans).to.have.lengthOf(2);
      expect(sched.timespans[0]).to.eql({ start: 0, end: 6 * 3600 });
      expect(sched.timespans[1]).to.eql({ start: 22 * 3600, end: 24 * 3600 });
    });

    it('maps day names to ISO weekday numbers', function () {
      const sched = new Schedule('mwf', 'uuid-3', '09:00', '17:00', ['Monday', 'Wednesday', 'Friday']);
      expect(sched.isoDays).to.eql([1, 3, 5]);
    });

    it('starts with ref_count at 0', function () {
      const sched = new Schedule('weekday', 'uuid-4', '09:00', '17:00', ['Monday']);
      expect(sched.ref_count).to.equal(0);
      expect(sched.is_referenced()).to.equal(false);
    });
  });

  describe('convertTime', function () {
    it('converts midnight to 0 seconds', function () {
      const sched = new Schedule('n', 'u', '09:00', '17:00', ['Monday']);
      expect(sched.convertTime('00:00')).to.equal(0);
    });

    it('converts HH:mm to seconds since midnight', function () {
      const sched = new Schedule('n', 'u', '09:00', '17:00', ['Monday']);
      expect(sched.convertTime('01:30')).to.equal(5400);
      expect(sched.convertTime('09:00')).to.equal(32400);
      expect(sched.convertTime('23:59')).to.equal(23 * 3600 + 59 * 60);
    });
  });

  describe('ref_count', function () {
    let sched: any = null;
    beforeEach(function () {
      sched = new Schedule('n', 'u', '09:00', '17:00', ['Monday']);
    });

    it('increments', function () {
      sched.ref_count_increment();
      expect(sched.ref_count).to.equal(1);
      expect(sched.is_referenced()).to.equal(true);
    });

    it('decrements', function () {
      sched.ref_count_increment();
      sched.ref_count_increment();
      sched.ref_count_decrement();
      expect(sched.ref_count).to.equal(1);
    });

    it('is_referenced is false at zero and below', function () {
      expect(sched.is_referenced()).to.equal(false);
      sched.ref_count_decrement();
      expect(sched.is_referenced()).to.equal(false);
    });
  });

  describe('to_yaml_obj', function () {
    it('returns the round-trippable definition', function () {
      const days = ['Monday', 'Wednesday'];
      const sched = new Schedule('weekday', 'uuid-5', '09:00', '17:00', days);
      expect(sched.to_yaml_obj()).to.eql({
        name: 'weekday',
        uuid: 'uuid-5',
        start: '09:00',
        end: '17:00',
        days,
      });
    });
  });

  describe('is_in', function () {
    it('returns false on a day not in the schedule', function () {
      const sched = new Schedule('weekday', 'u', '09:00', '17:00', [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
      ]);
      // Saturday 2026-04-25 12:00 Europe/London
      const m = momentZone.tz('2026-04-25 12:00', sched.zone);
      expect(sched.is_in(m)).to.equal(false);
    });

    it('returns true when the moment is within the timespan', function () {
      const sched = new Schedule('weekday', 'u', '09:00', '17:00', [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
      ]);
      // Monday 2026-04-27 12:00
      const m = momentZone.tz('2026-04-27 12:00', sched.zone);
      expect(sched.is_in(m)).to.equal(true);
    });

    it('returns false when on the right day but outside the timespan', function () {
      const sched = new Schedule('weekday', 'u', '09:00', '17:00', [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
      ]);
      // Monday 2026-04-27 08:00 (before start)
      const before = momentZone.tz('2026-04-27 08:00', sched.zone);
      expect(sched.is_in(before)).to.equal(false);
      // Monday 2026-04-27 18:00 (after end)
      const after = momentZone.tz('2026-04-27 18:00', sched.zone);
      expect(sched.is_in(after)).to.equal(false);
    });

    it('handles a midnight-wrap schedule (late evening)', function () {
      const sched = new Schedule('overnight', 'u', '22:00', '06:00', ['Friday', 'Saturday']);
      // Friday 2026-04-24 23:00
      const m = momentZone.tz('2026-04-24 23:00', sched.zone);
      expect(sched.is_in(m)).to.equal(true);
    });

    it('handles a midnight-wrap schedule (early morning)', function () {
      const sched = new Schedule('overnight', 'u', '22:00', '06:00', ['Friday', 'Saturday']);
      // Saturday 2026-04-25 03:00
      const m = momentZone.tz('2026-04-25 03:00', sched.zone);
      expect(sched.is_in(m)).to.equal(true);
    });

    it('returns false for midnight-wrap outside both ranges', function () {
      const sched = new Schedule('overnight', 'u', '22:00', '06:00', ['Friday', 'Saturday']);
      // Friday 2026-04-24 12:00
      const m = momentZone.tz('2026-04-24 12:00', sched.zone);
      expect(sched.is_in(m)).to.equal(false);
    });

    it('defaults to now when no moment is supplied', function () {
      const sched = new Schedule('allday', 'u', '00:01', '23:59', [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ]);
      expect(sched.is_in()).to.be.a('boolean');
    });
  });
});
