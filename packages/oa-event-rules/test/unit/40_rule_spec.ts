//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:rules');
const helpers = require('../mocha_helpers');
const expect = helpers.expect;

// Test setup
const { Rule } = require('../../lib/rule');
const { Select } = require('../../lib/select');
const { Action } = require('../../lib/action');

describe('Rule', function () {
  describe('Class', function () {
    it('creates an instance of Rule', function () {
      const rule = new Rule('mine', {
        select: new Select(),
        action: new Action(),
        yaml: {},
        uuid: 'xxxx-yyyy',
      });
      expect(rule).to.be.an.instanceof(Rule);
    });
  });

  describe('InstanceOf', function () {
    let rules: any = null;

    before(function () {
      rules = Rule.generate({
        name: 'Test rule 1',
        match: {
          node: 'host01',
        },
        set: {
          summary: 'Hello',
        },
        uuid: 'xxxx-yyyy',
      });
    });

    it('returns the yaml object', function () {
      expect(rules.to_yaml_obj()).to.eql({
        name: 'Test rule 1',
        match: { node: 'host01' },
        set: { summary: 'Hello' },
        uuid: 'xxxx-yyyy',
      });
    });

    it('returns the yaml with hash', function () {
      const rule = Rule.generate({
        name: 'test',
        all: true,
        stop: true,
        uuid: 'xxxx-yyyy',
      });
      expect(rule.to_yaml_obj({ hash: true })).to.eql({
        hash: '55b23b5c406091a6180692099e490dc8c9fcb422',
        name: 'test',
        all: true,
        stop: true,
        uuid: 'xxxx-yyyy',
      });
    });
  });
});
