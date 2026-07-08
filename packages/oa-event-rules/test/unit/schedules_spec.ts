//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:func:schedules');
const { expect } = require('../mocha_helpers');

// Node modules
const path = require('path');

// OA modules
const { Schedules } = require('../../lib/schedules');
const { Schedule } = require('../../lib/schedule');
const { EventRules } = require('../../lib/event_rules');
const Errors = require('oa-errors');

describe('Schedules', function () {
  const yaml_def = [
    {
      name: 'weekday',
      start: '11:11',
      end: '12:12',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
  ];

  describe('Class', function () {
    let schedules: any = null;
    beforeEach(function () {
      schedules = Schedules.generate(yaml_def);
    });

    it('loads schedules', function () {
      expect(schedules).to.be.an.instanceof(Schedules);
    });

    it('has an array of Schedule', function () {
      expect(schedules.names()).to.be.an.instanceof(Array);
      expect(schedules.count()).to.equal(1);
    });

    it('has a weekday schedule', function () {
      expect(schedules.has_schedule('weekday')).to.equal(true);
    });

    it('can check for a non-existant schedule', function () {
      expect(schedules.has_schedule('never heard of it')).to.equal(false);
    });
  });

  describe('Schedule', function () {
    let schedules: any = null;
    beforeEach(function () {
      schedules = Schedules.generate(yaml_def);
    });

    it('has a Schedule', function () {
      expect(schedules.get('weekday')).to.be.an.instanceof(Schedule);
    });
  });
});

describe('Schedule Selectors', function () {
  let event_rules: any = null;
  const yaml_event_rules: any = {
    globals: {
      rules: [
        {
          name: 'with_schedule',
          discard: true,
          schedule: {
            name: 'sched1',
          },
        },
      ],
    },
    groups: {
      _order: [],
    },
    schedules: [],
  };

  it('throws an error for an unexpected schedule name', function () {
    const fn = function () {
      new EventRules({ server: true, doc: yaml_event_rules });
    };

    expect(fn).to.throw(Errors.ValidationError, /Schedule generate: schedule name does not exist/);
  });
});
