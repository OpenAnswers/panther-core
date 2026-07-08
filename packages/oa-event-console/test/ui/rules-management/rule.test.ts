//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeAll } from 'vitest';

describe('A Rule', function () {
  let $container: any = null;
  const simple_yaml = { name: 'testname', all: true, discard: true };

  beforeAll(function () {
    $container = $('<li/>');
    $('#rule-render-test').append($container);
  });

  it('creates a Rule instance', function () {
    const rule = new Rule(1, {
      rule_set: {},
      yaml: simple_yaml,
      event_rules: {},
      $container: $container,
    });

    expect(rule).to.be.an.instanceof(Rule);
  });

  describe('when instantiated', function () {
    it('should store the yaml data', function () {
      const rule = new Rule(2, { yaml: simple_yaml });
      expect(rule.yaml).to.eql(simple_yaml);
    });

    it('should store the index', function () {
      const rule = new Rule(3, { yaml: simple_yaml });
      expect(rule.index).to.eql(3);
    });
  });

  describe('when generated', function () {
    it('attaches the correct yaml', function () {
      const rule = Rule.generate(simple_yaml, { index: 1, rule_set: {} });
      expect(rule.yaml).to.eql(simple_yaml);
    });
  });

  describe('when rendered', function () {
    let rule: any = null;

    beforeAll(function () {
      $container = $('<li/>');
      $('#rule-render-test').append($container);
      rule = new Rule(1, {
        rule_set: {},
        yaml: simple_yaml,
        event_rules: {},
        $container: $container,
      });
      rule.render();
    });

    it('has some content html', function () {
      expect(rule.$container).to.have.property('length');
      expect(rule.$container.length).to.be.greaterThan(0);
      expect(rule.$container.html()).to.match(/\<.+\>/);
    });

    it('should have the name "test"', function () {
      const $name = rule.$container.find('.rule-name');
      expect($name.text()).to.equal('testname');
    });

    it('has the `all` select', function () {
      const $selects = rule.$container.find('.selects');
      expect($selects.length).to.equal(1);
      expect($selects.text()).to.match(/all\s?/);
    });

    it('has the `discard` action', function () {
      const $selects = rule.$container.find('.actions');
      expect($selects.length).to.equal(1);
      expect($selects.text()).to.equal('discard');
    });

    it('has tags', function () {
      const $selects = rule.$container.find('.metadata-tags');
      expect($selects.length).to.equal(1);
      expect($selects.text()).to.match(/Discard/);
    });

    it('has tags via container_find', function () {
      const $selects = rule.container_find('.metadata-tags');
      expect($selects.length).to.equal(1);
      expect($selects.text()).to.match(/Discard/);
    });

    it.skip('has the rule data attached to $container', function () {
      expect($.data(rule.$container, 'rule')).to.equal(rule);
    });

    it('has the rule data attached to $container', function () {
      expect(rule.$container.data('rule')).to.equal(rule);
    });

    it('can find the rule data via closest', function () {
      const $md = rule.container_find('.metadata-tags');
      const rule_ref = Rule.closest($md);
      expect(rule_ref).to.equal(rule);
    });
  });
});
