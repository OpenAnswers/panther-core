//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:rules');
const { expect, fs, Promise } = require('../mocha_helpers');

// npm modules
const path = require('path');

// Test setup
const { EventRules } = require('../../lib/event_rules');
const Errors = require('oa-errors');

// And the tests
describe('EventRules', function () {
  // vars for all tests
  const yaml_file = 'event_rules_spec.yml';
  const yaml_path = path.join(__dirname, yaml_file);

  describe('Class', function () {
    it('loads event_rules_spec.yml', function (done: Function) {
      const rules = new EventRules({
        path: yaml_path,
      });

      expect(rules).to.be.an.instanceof(EventRules);
      done();
    });
  });

  describe('Invalid YAML', function () {
    let event_rules: any = null;
    const yaml_event_rules: any = {
      cant_be_here: true,
      globals: {
        rules: [],
      },
      groups: {
        _order: [],
      },
      schedules: [],
    };

    it('throws an error for an unexpected toplevel property', function () {
      const fn = function () {
        new EventRules({ server: true, doc: yaml_event_rules });
      };

      expect(fn).to.throw(Errors.ValidationError, /Property.*cant_be_here/);
    });
  });

  describe('YAML', function () {
    let event_rules: any = null;
    const yaml_event_rules: any = {
      globals: {
        rules: [],
      },
      groups: {
        _order: ['One'],
        One: {
          select: { all: true },
          rules: [],
          uuid: '22889210-b974-11e7-9889-c70bd1bece51',
        },
      },
      schedules: [],
    };

    before(function () {
      event_rules = new EventRules({ server: true, doc: yaml_event_rules });
    });

    it('contains a metadata timestamp', function () {
      const now = Date.now();
      const yaml = event_rules.to_yaml_obj();
      expect(yaml).to.contain.key('metadata');
      expect(yaml.metadata).to.contain.key('save_date');
      expect(yaml.metadata.save_date).to.gte(now);
    });

    it('goes back to yaml', function () {
      const yaml = event_rules.to_yaml_obj();
      delete yaml.metadata;
      expect(yaml).to.eql(yaml_event_rules);
    });

    it('goes back to yaml, with hash', function () {
      yaml_event_rules.hash = '607b2429c206296d7a4ea204108b474d5baf4e76';
      const yaml = event_rules.to_yaml_obj({ hash: true });
      delete yaml.metadata;
      expect(yaml).to.eql(yaml_event_rules);
    });
  });
});
