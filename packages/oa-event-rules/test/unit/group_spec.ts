//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:groups');
const helpers = require('../mocha_helpers');
const expect = helpers.expect;

// Test setup
const { Group } = require('../../lib/group');
const { Select } = require('../../lib/select');
const { RuleSet } = require('../../lib/rule_set');

describe('Group', function () {
  describe('Class', function () {
    it('creates an instance of Groups', function () {
      expect(new Select()).to.be.an.instanceof(Select);
      const group = new Group('test', new Select(), new RuleSet());
      expect(group).to.be.an.instanceof(Group);
    });
  });

  describe('generated instance', function () {
    let group: any = null;

    const group_yaml = {
      select: {
        all: true,
      },
      rules: [
        {
          name: 'test',
          all: 'true',
          discard: 'true',
          uuid: 'xxxx-yyyy',
        },
      ],
    };

    beforeEach(function () {
      group = Group.generate('testname', group_yaml);
    });

    it('gets the test group name', function () {
      expect(group.name).to.equal('testname');
    });

    xit('can run an event', function () {
      expect(group.run({})).to.eql({});
    });

    it('goes back to yaml', function () {
      expect(group.to_yaml_obj()).to.eql(group_yaml);
    });

    it('updates a select', function () {
      const rule = {
        name: 'nope',
        all: true,
        discard: true,
      };
      const index = 0;
      expect(group.update_select(rule, index)).to.be.ok;
      expect(group.select).to.be.an.instanceof(Select);
      expect(group.select.selects.length).to.equal(1);
      expect(group.select.selects[0].label).to.equal('all');
    });
  });
});
