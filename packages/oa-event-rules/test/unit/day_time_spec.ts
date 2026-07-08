//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const { DayTime } = require('../../lib/day_time');

describe('DayTime', function () {
  describe('constructor', function () {
    it('builds a valid DayTime', function () {
      const dt = new DayTime('Monday', '09:30');
      expect(dt).to.be.an.instanceof(DayTime);
      expect(dt.day).to.equal('Monday');
      expect(dt.time).to.equal('09:30');
    });

    it('stores iso weekday (Monday = 1)', function () {
      expect(new DayTime('Monday', '00:00').dow).to.equal(1);
      expect(new DayTime('Sunday', '00:00').dow).to.equal(7);
      expect(new DayTime('Wednesday', '12:00').dow).to.equal(3);
    });

    it('stores hour and minute as integers', function () {
      const dt = new DayTime('Tuesday', '23:45');
      expect(dt.hour).to.equal(23);
      expect(dt.minute).to.equal(45);
    });

    it('throws on an invalid day', function () {
      expect(() => new DayTime('NotADay', '09:00')).to.throw(/DayTime is invalid/);
    });

    it('throws on an invalid time', function () {
      expect(() => new DayTime('Monday', '99:99')).to.throw(/DayTime is invalid/);
    });
  });

  describe('generate', function () {
    it('returns a DayTime from a yaml definition', function () {
      const dt = DayTime.generate({ day: 'Friday', time: '17:00' });
      expect(dt).to.be.an.instanceof(DayTime);
      expect(dt.day).to.equal('Friday');
      expect(dt.time).to.equal('17:00');
      expect(dt.dow).to.equal(5);
      expect(dt.hour).to.equal(17);
      expect(dt.minute).to.equal(0);
    });

    it('throws when the definition is missing', function () {
      expect(() => DayTime.generate(undefined)).to.throw(/No definition/);
      expect(() => DayTime.generate(null)).to.throw(/No definition/);
    });

    it('throws when "day" is missing', function () {
      expect(() => DayTime.generate({ time: '09:00' })).to.throw(/No day/);
    });

    it('throws when "time" is missing', function () {
      expect(() => DayTime.generate({ day: 'Monday' })).to.throw(/No time/);
    });
  });

  describe('to_yaml_obj', function () {
    it('returns the original day/time pair', function () {
      const dt = new DayTime('Thursday', '08:15');
      expect(dt.to_yaml_obj()).to.eql({ day: 'Thursday', time: '08:15' });
    });

    it('accepts an options argument (ignored)', function () {
      const dt = new DayTime('Thursday', '08:15');
      expect(dt.to_yaml_obj({ verbose: true })).to.eql({ day: 'Thursday', time: '08:15' });
    });
  });

  describe('now', function () {
    it('returns a DayTime representing the current moment', function () {
      const dt = DayTime.now();
      expect(dt).to.be.an.instanceof(DayTime);
      expect(dt.dow).to.be.within(1, 7);
      expect(dt.hour).to.be.within(0, 23);
      expect(dt.minute).to.be.within(0, 59);
    });
  });
});
