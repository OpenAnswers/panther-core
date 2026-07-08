//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeEach } from 'vitest';

describe('Action', function () {
  const logger = debug('oa:test:event:rules:action');
  const render_test_id = '#action-render-test';
  const simple_yaml = { name: 'test' };
  const default_opts = { rule: {}, $container: $('<div/>') };

  describe('base implementation', function () {
    it('can create an ActionBase instance', function () {
      const action = new ActionBase({ rule: {} });
      expect(action).to.be.an.instanceof(ActionBase);
    });
  });

  describe('discard', function () {
    let action: any = null;

    beforeEach(function () {
      action = new ActionDiscard(default_opts);
    });

    it('can create an ActionDiscard instance', function () {
      expect(action).to.be.an.instanceof(ActionDiscard);
    });

    it('should have the discard verb', function () {
      expect(action).to.have.property('verb');
      expect(action.verb).to.eql('discard');
    });

    it('should have a view template attached', function () {
      expect(action).to.have.property('template_view');
      logger('discard template_view', action.template_view);
      expect(action.template_view).to.be.a('string');
      expect(action.template_view.length).to.be.gt(10);
    });

    it('should have an edit template attached', function () {
      expect(action).to.have.property('template_edit');
      logger('discard template_edit', action.template_edit);
      expect(action.template_edit).to.be.an('string');
      expect(action.template_edit.length).to.be.gt(10);
    });

    it('should have the operator in the view template', function () {
      action.render();
      logger('find', action.$container);
      const action_el_val = action.$container.find('.action-operator > input').val();
      expect(action_el_val).to.eql('discard');
    });

    it('should reproduce the yaml action', function () {
      action = ActionDiscard.generate({ discard: 'fieldname' }, default_opts);
      const el = action.render();
      logger('render', el);
      $(render_test_id).append(el);
      const back_to_yaml = action.dom_to_yaml_obj();
      expect(back_to_yaml).to.eql({ discard: true });
    });
  });

  describe('set', function () {
    let action: any = null;

    beforeEach(function () {
      action = new ActionSet({ rule: {} });
    });

    it('creates an ActionSet instance', function () {
      expect(action).to.be.an.instanceof(ActionSet);
    });

    it('should have the discard verb', function () {
      expect(action).to.have.property('verb');
      expect(action.verb).to.eql('set');
    });

    it('should have a view template attached', function () {
      expect(action).to.have.property('template_view');
      logger('discard template_view', action.template_view);
      expect(action.template_view).to.be.a('string');
      expect(action.template_view.length).to.be.gt(50);
    });

    it('should have an edit template attached', function () {
      expect(action).to.have.property('template_edit');
      logger('discard template_edit', action.template_edit);
      expect(action.template_edit).to.be.a('string');
      expect(action.template_edit.length).to.be.gt(50);
    });

    it('should have the operator in view template', function () {
      const el = action.render();
      expect(el.find('.action-view-operator').text()).to.match(/^set\s?$/);
    });

    it('should have the operator in edit template', function () {
      const el = action.render();
      expect(el.find('.action-operator > input').val()).to.eql('set');
    });

    it('should reproduce the yaml action', function () {
      action = ActionSet.generate({ set: { bfield: 'new' } }, default_opts);
      const back_to_yaml = action[0].to_yaml_obj();
      expect(back_to_yaml).to.eql({ set: { bfield: 'new' } });
    });

    it('should reproduce the yaml action from dom', function () {
      action = ActionSet.generate({ set: { bfield: 'new' } }, default_opts);
      const el = action[0].render();
      logger('render', el);
      $(render_test_id).append(el);
      const back_to_yaml = action[0].dom_to_yaml_obj();
      expect(back_to_yaml).to.eql({ set: { bfield: 'new' } });
    });

    it('should pick up a dom change in yaml', function () {
      action = ActionSet.generate({ set: { bfield: 'new' } }, default_opts);
      const el = action[0].render();
      el.find('.action-field > input').val('wakka');
      el.find('.action-value > input').val('old');
      expect(action[0].dom_to_yaml_obj()).to.eql({ set: { wakka: 'old' } });
    });
  });

  describe('stop', function () {
    let action: any = null;

    beforeEach(function () {
      action = new ActionStop({ rule: {} });
    });

    it('creates an ActionStop instance', function () {
      expect(action).to.be.an.instanceof(ActionStop);
    });

    it('should have the discard verb', function () {
      expect(action).to.have.property('verb');
      expect(action.verb).to.eql('stop');
    });

    it('should reproduce the yaml action', function () {
      const rule = { stop: true };
      action = ActionStop.generate(rule, default_opts);
      const el = action.render();
      logger('render', el);
      $(render_test_id).append(el);
      expect(action.to_yaml_obj()).to.eql(rule);
    });
  });

  describe('stop_rule_set', function () {
    let action: any = null;

    beforeEach(function () {
      action = new ActionStopRuleSet({ rule: {} });
    });

    it('creates an ActionStopRuleSet instance', function () {
      expect(action).to.be.an.instanceof(ActionStopRuleSet);
    });

    it('should have the discard verb', function () {
      expect(action).to.have.property('verb');
      expect(action.verb).to.eql('stop_rule_set');
    });

    it('should reproduce the yaml action', function () {
      const rule = { stop_rule_set: true };
      action = ActionStopRuleSet.generate(rule, default_opts);
      const el = action.render();
      logger('render', el);
      $(render_test_id).append(el);
      expect(action.to_yaml_obj()).to.eql(rule);
    });
  });

  describe('replace', function () {
    let action: any = null;
    const test_rule_yaml = {
      replace: {
        field: 'nfield',
        this: '/search/',
        with: 'replace',
      },
    };

    beforeEach(function () {
      action = new ActionReplace({ rule: {} });
    });

    it('creates an ActionReplace instance', function () {
      expect(action).to.be.an.instanceof(ActionReplace);
    });

    it('should have the discard verb', function () {
      expect(action).to.have.property('verb');
      expect(action.verb).to.eql('replace');
    });

    it('should reproduce the yaml action', function () {
      action = ActionReplace.generate(test_rule_yaml, default_opts);
      const el = action[0].render();
      logger('render', el);
      $(render_test_id).append(el);
      expect(action[0].to_yaml_obj()).to.eql(test_rule_yaml);
    });

    it('should create a new yaml object with thef field dom modified', function () {
      action = ActionReplace.generate(test_rule_yaml, default_opts);
      const el = action[0].render();
      el.find('.action-field > input').val('fieldt');
      el.find('.action-this > input').val('thist');
      el.find('.action-with > input').val('oldt');
      $(render_test_id).append(el);
      expect(action[0].to_yaml_obj()).to.eql({
        replace: {
          field: 'nfield',
          this: '/search/',
          with: 'replace',
        },
      });
    });
  });
});
