//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeEach } from 'vitest';

describe('Group', function () {
  const simple_yaml = {
    groups_array: ['First', 'Second'],
    groups: {
      First: {},
      Second: {},
    },
  };

  describe('instance', function () {
    let group: any;

    beforeEach(function () {
      group = new Group();
    });

    it('creates a Group instance', function () {
      expect(group).to.be.an.instanceof(Group);
    });

    it('should have a select rule', function () {
      expect(group).to.have.property('rule_set').and.to.be.an.instanceof(RuleSet);
    });

    it('should have a rule_set', function () {
      expect(group).to.have.property('rule_set').and.to.be.an.instanceof(RuleSet);
    });
  });

  describe('generate', function () {
    it('generate a group from yaml', function () {
      const group = Group.generate({
        select: { match: { summary: '/testing/' } },
        rules: [{ name: 'f1', all: true, discard: true }],
      });

      expect(group).and.to.be.an.instanceof(Group);
    });
  });

  describe('renders', function () {
    let group: any;
    const group_yaml = {
      select: { match: { summary: '/testing/' } },
      rules: [
        { name: 'f1', all: true, discard: true },
        { name: 'f2', all: true, discard: true },
        { name: 'f3', all: true, discard: true },
      ],
    };

    beforeEach(function () {
      group = Group.generate(group_yaml);
      group.render();
    });

    it('creates a group', function () {
      expect(group.$container).to.exist;
      expect(group.$container.length).to.be.greaterThan(0);
    });
  });
});

describe('Groups', function () {
  const rule_base = { all: true, discard: true };

  const simple_yaml = {
    _order: ['first', 'second'],
    first: {
      select: { match: { summary: '/testing/' } },
      rules: [_.defaults({ name: 'f1' }, rule_base)],
    },
    second: {
      select: { name: 's2' },
      rules: [
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
        _.defaults({ name: 'f2' }, rule_base),
      ],
    },
  };

  describe('instance', function () {
    let groups: any;

    beforeEach(function () {
      groups = new Groups();
    });

    it('creates a Groups instance', function () {
      expect(groups).to.be.an.instanceof(Groups);
    });

    it('should add and get group', function () {
      groups.add('First', {});
      expect(groups.get_group('First')).to.be.eql({});
    });
  });

  describe('generates', function () {
    it('from simple yaml (with lots of rules)', function () {
      const groups = Groups.generate(simple_yaml, { index: 1, rule_set: {} });
      expect(groups.get_group('first').name).to.eql('first');
    });
  });

  describe('renders', function () {
    it('creates the groups', function () {
      const groups = Groups.generate(simple_yaml, { index: 1, rule_set: {} });
      const rendered = groups.render();
      expect(rendered).to.exist;
    });
  });
});
