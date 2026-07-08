//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:groups');

const Errors = require('oa-errors');
const helpers = require('../mocha_helpers');
const expect = helpers.expect;
const _ = helpers._;

// Test setup
const { Groups } = require('../../lib/groups');

describe('Groups', function () {
  describe('Class', function () {
    it('creates an instance of Groups', function () {
      const group = new Groups();
      expect(group).to.be.an.instanceof(Groups);
    });
  });

  describe('generated instance', function () {
    let groups: any = null;

    const test_group_yaml: any = {
      _order: ['More gro#$!-_up', 'Test group 1'],
      'Test group 1': {
        uuid: '22889210-b974-11e7-9889-c70bd1bece51',
        select: {
          all: true,
        },
        rules: [
          {
            name: 'test',
            all: 'true',
            discard: 'true',
            uuid: '22889210-b974-11e7-9889-c70bd1bece51',
          },
        ],
      },
      'More gro#$!-_up': {
        uuid: '22889210-b974-11e7-9889-c70bd1bece51',
        select: {
          none: true,
        },
        rules: [
          {
            name: 'test',
            none: true,
            stop_rule_set: true,
            uuid: '22889210-b974-11e7-9889-c70bd1bece51',
          },
        ],
      },
    };
    const group_yaml = _.cloneDeep(test_group_yaml);

    beforeEach(function () {
      groups = Groups.generate(test_group_yaml);
    });

    it('returns the length of the groups', function () {
      expect(groups.count()).to.equal(2);
    });

    it('gets the test group', function () {
      expect(groups.get('Test group 1')).to.be.ok.and.to.be.an.instanceof(Object);
    });

    it('fails to get a non existant group', function () {
      expect(groups.get('wakka')).to.equal(undefined);
    });

    it('has the group', function () {
      expect(groups.has_group('Test group 1')).to.be.ok;
    });

    it('hasnt the group', function () {
      expect(groups.has_group('wakka')).to.equal(false);
    });

    it('returns the group names', function () {
      expect(groups.names()).to.contain('More gro#$!-_up', 'Test group 1');
    });

    it('updates a group name', function () {
      groups.update_group_name('Test group 1', 'Other Group');
      expect(groups.get('Test group 1')).not.be.ok;
      expect(groups.get('Other Group')).to.be.ok;
      expect(groups.store_order).to.not.include('Test group 1');
      expect(groups.store_order).to.include('Other Group');
      expect(groups.store_order).to.have.length(2);
    });

    it('should delete a group', function () {
      debug('group_yaml', group_yaml);
      expect(groups.del('Test group 1')).to.be.ok;
      expect(groups.store).to.have.keys('More gro#$!-_up');
      expect(groups.store_order).to.have.length(1);
      expect(groups.store_order[0]).to.equal('More gro#$!-_up');
    });

    it('goes back to yaml', function () {
      expect(groups.to_yaml_obj()).to.eql(test_group_yaml);
    });

    it('should rename and match the original yaml', function () {
      groups.update_group_name('More gro#$!-_up', 'Other');
      expect(groups.to_yaml_obj()).to.have.nested.property('_order[0]').and.to.equal('Other');
      expect(groups.to_yaml_obj()).to.have.nested.property('_order[1]').and.to.equal('Test group 1');
      expect(groups.to_yaml_obj()).to.have.deep.nested.property('Other.select', {
        none: true,
      });
    });
  });

  describe('the groups order array', function () {
    it('should ensure store order has a stored group', function () {
      const def = {
        _order: ['one'],
        one: {
          select: { none: true },
          rules: [],
        },
      };
      const fn = function () {
        Groups.generate(def);
      };
      expect(fn).to.not.throw();
    });

    it('throws a validation when stored group is not present in store order', function () {
      const def = {
        _order: ['one'],
        one: {
          select: { none: true },
          rules: [],
        },
        two: {
          select: { none: true },
          rules: [],
        },
      };

      const fn = function () {
        Groups.generate(def);
      };
      expect(fn).to.throw(Errors.ValidationError, /Groups/);
    });

    it('throws a validation when store order is not present in stored group', function () {
      const def = {
        _order: ['unknown'],
        one: {
          select: { none: true },
          rules: [],
        },
      };
      const fn = function () {
        Groups.generate(def);
      };
      expect(fn).to.throw(Errors.ValidationError, /Groups/);
    });

    it('throws a validation when store order starts with whitespace', function () {
      const def = {
        _order: ['  unknown'],
        one: {
          select: { none: true },
          rules: [],
        },
      };
      const fn = function () {
        Groups.generate(def);
      };
      expect(fn).to.throw(Errors.ValidationError, /Groups/);
    });

    it('throws a validation when store order ends with whitespace', function () {
      const def = {
        _order: ['unknown  '],
        one: {
          select: { none: true },
          rules: [],
        },
      };
      const fn = function () {
        Groups.generate(def);
      };
      expect(fn).to.throw(Errors.ValidationError, /Groups/);
    });

    xit('throws a validation when group name starts with whitespace', function () {
      const def = {
        _order: [],
        '  one': {
          select: { none: true },
          rules: [],
        },
      };
      const fn = function () {
        Groups.generate(def);
      };
      expect(fn).to.throw(Errors.ValidationError, /Groups/);
    });

    it('should fill in the store order when it is missing a stored groups', function () {
      const def = {
        _order: [],
        one: {
          select: { none: true },
          rules: [],
        },
        two: {
          select: { all: true },
          rules: [],
        },
      };
      const g = Groups.generate(def);

      expect(g.store).to.have.keys('one', 'two');
      expect(g.store_order).to.have.length(2);
      expect(g.store_order[0]).to.equal('one');
      expect(g.store_order[1]).to.equal('two');
    });
  });
});
