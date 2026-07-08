//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeAll } from 'vitest';

describe('A RuleSet', function () {
  let $container: any = null;
  const simple_yaml = [{ name: 'testname', all: true, discard: true }];

  beforeAll(function () {
    $container = $('<div/>');
    $('#rule-set-render-test').append($container);
  });

  it('creates a RuleSet instance', function () {
    const rule_set = new RuleSet({
      yaml: simple_yaml,
      event_rules: {},
      $container: $container,
    });

    expect(rule_set).to.be.an.instanceof(RuleSet);
  });

  describe('when instantiated', function () {
    it('should store the yaml data', function () {
      const rule_set = new RuleSet({ yaml: simple_yaml });
      expect(rule_set.yaml).to.eql(simple_yaml);
    });

    it('should store the index', function () {
      const rule_set = new RuleSet({ yaml: simple_yaml });
      expect(rule_set.rules.length).to.eql(1);
    });
  });

  describe('when generated', function () {
    it('attaches the correct yaml', function () {
      const rule_set = RuleSet.generate(simple_yaml);
      expect(rule_set.yaml).to.eql(simple_yaml);
    });
  });

  describe('when rendered', function () {
    let rule_set: any = null;

    beforeAll(function () {
      $container = $('<li/>');
      $('#rule-render-test').append($container);
      rule_set = new RuleSet({
        yaml: simple_yaml,
        event_rules: {},
        $container: $container,
      });
      rule_set.render();
    });

    it('has some content html', function () {
      expect(rule_set.$container).to.have.property('length');
      expect(rule_set.$container.length).to.be.greaterThan(0);
      expect(rule_set.$container.html()).to.match(/\<.+\>/);
    });

    it('should have the name "test"', function () {
      const $name = rule_set.$container.find('.rule-name');
      expect($name.text()).to.equal('testname');
    });

    it('has the rule data attached to $container', function () {
      expect(rule_set.$container.data('rule_set')).to.equal(rule_set);
    });

    it('can find the rule closest', function () {
      const $rules = rule_set.$container.find('.card-global-rule');
      expect($rules.length).to.equal(1);
    });

    it('can find the rule set data via closest', function () {
      const $md = rule_set.container_find('.card-global-rule');
      const rule_ref = RuleSet.closest($md);
      expect(rule_ref).to.equal(rule_set);
    });

    // Rule stuff, just to check it is rendered too
    it('has the `all` select', function () {
      const $selects = rule_set.$container.find('.selects');
      expect($selects.length).to.equal(1);
      expect($selects.text()).to.match(/all\s?/);
    });

    it('has the `discard` action', function () {
      const $selects = rule_set.$container.find('.actions');
      expect($selects.length).to.equal(1);
      expect($selects.text()).to.equal('discard');
    });

    it('has tags', function () {
      const $selects = rule_set.$container.find('.metadata-tags');
      expect($selects.length).to.equal(1);
      expect($selects.text()).to.match(/Discard/);
    });
  });
});
