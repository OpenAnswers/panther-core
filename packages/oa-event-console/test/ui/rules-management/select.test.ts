//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeEach } from 'vitest';

describe('Select', function () {
  const logger = debug('oa:test:event:rules:select');

  const simple_yaml = { name: 'test' };
  const default_opts = { rule: {}, render: true };
  const render_test_id = '#ruleverb-render-test';

  describe('base implementation', function () {
    it('can create an SelectBase instance', function () {
      const action = new SelectBase({ rule: {} });
      expect(action).to.be.an.instanceof(SelectBase);
    });
  });

  describe('all', function () {
    let select: any = null;
    const yaml_all = { all: true };

    beforeEach(function () {
      select = new SelectAll({
        rule: {},
        field: 'severity',
        value: 5,
      });
    });

    describe('instance', function () {
      it('creates a SelectAll instance', function () {
        expect(select).to.be.an.instanceof(SelectAll);
      });

      it('should have a verb', function () {
        expect(select).to.have.property('verb');
        expect(select.verb).to.eql('all');
      });

      it('should reproduce the yaml select', function () {
        const gen = SelectAll.generate(yaml_all, default_opts);
        expect(gen.to_yaml_obj()).to.eql(yaml_all);
      });
    });

    describe('rendered container', function () {
      beforeEach(function () {
        select.render();
      });

      it('should have the operator in view', function () {
        const $el = select.$container.find('.select-operator-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('all');
      });

      it('should have the operator input in edit', function () {
        const $el = select.$container.find('.select-operator > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('all');
      });

      it('should reproduce the yaml select from dom', function () {
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_all);
      });
    });

    describe('yaml generated', function () {
      it('should reproduce the yaml select from dom', function () {
        select = SelectAll.generate(yaml_all, default_opts);
        select.render();
        expect(select.dom_to_yaml_obj()).to.eql(yaml_all);
      });

      it('should test select all events', function () {
        select = SelectAll.generate(yaml_all, default_opts);
        const ev_test_result = select.test_event({ summary: true });
        expect(ev_test_result).to.equal(true);
      });
    });
  });

  describe('none', function () {
    let select: any = null;
    const yaml_none = { none: true };

    beforeEach(function () {
      select = new SelectNone({ rule: {} });
    });

    it('can create an SelectNone instance', function () {
      expect(select).to.be.an.instanceof(SelectNone);
    });

    it('should have the `none` verb', function () {
      expect(select).to.have.property('verb');
      expect(select.verb).to.eql('none');
    });

    it('should have a view template attached', function () {
      expect(select).to.have.property('template_view');
      logger('discard template_view', select.template_view);
      expect(select.template_view).to.be.a('string');
      expect(select.template_view.length).to.be.gt(10);
    });

    it('should have an edit template attached', function () {
      expect(select).to.have.property('template_edit');
      logger('discard template_edit', select.template_edit);
      expect(select.template_edit).to.be.an('string');
      expect(select.template_edit.length).to.be.gt(10);
    });

    it('should have the operator in the edit template', function () {
      select.render();
      logger('find', select.$container, select.$container.html());
      expect(select.$container.find('.select-operator > input').val()).to.equal('none');
    });

    it('should have the operator in the view template', function () {
      select.render();
      logger('find', select.$container, select.$container.html());
      expect(select.$container.find('.select-operator-view').text()).to.match(/none/i);
    });

    it('should reproduce the yaml select', function () {
      select = SelectNone.generate(yaml_none, default_opts);
      const el = select.render();
      logger('render', el);
      $(render_test_id).append(el);
      const back_to_yaml = select.dom_to_yaml_obj();
      expect(back_to_yaml).to.eql({ none: true });
    });

    it('should select no events', function () {
      select = SelectNone.generate(yaml_none, default_opts);
      const ev_test_result = select.test_event({ summary: true });
      expect(ev_test_result).to.equal(false);
    });
  });

  describe('match', function () {
    let select: any = null;

    const yaml_match = {
      match: {
        summary: '/text/',
      },
    };

    const yaml_match_array = {
      match: {
        node: ['/test/', '/then/', '/that/'],
      },
    };

    beforeEach(function () {
      select = new SelectMatch({
        rule: {},
        field: 'summary',
        value: '/text/',
      });
    });

    describe('instance', function () {
      it('creates a SelectMatch instance', function () {
        expect(select).to.be.an.instanceof(SelectMatch);
      });

      it('should have a verb', function () {
        expect(select).to.have.property('verb');
        expect(select.verb).to.eql('match');
      });

      it('should reproduce the yaml select', function () {
        const gen = SelectMatch.generate(yaml_match, default_opts);
        expect(gen[0].to_yaml_obj()).to.eql(yaml_match);
      });
    });

    describe('rendered container', function () {
      beforeEach(function () {
        select.render();
      });

      it('should have the operator in view', function () {
        const $el = select.$container.find('.select-operator-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('matches');
      });

      it('should have a field in the view', function () {
        const $el = select.$container.find('.select-field-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('summary');
      });

      it('should have a value in the view', function () {
        logger('select.$container', select.$container.html());
        const $el = select.$container.find('.select-value-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('/text/');
      });

      it('should have the operator input in edit', function () {
        const $el = select.$container.find('.select-operator > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('match');
      });

      it('should have the field input in edit', function () {
        const $el = select.$container.find('.select-field > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('summary');
      });

      it('should have the value input in edit', function () {
        const $el = select.$container.find('.select-values > input');
        logger('input edit', select.$container, select.$container.html());
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('/text/');
      });

      it('should reproduce the yaml select from dom', function () {
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_match);
      });
    });

    describe('rendered container with many values', function () {
      const value = ['one', 'two'];

      beforeEach(function () {
        select = new SelectMatch({
          rule: {},
          field: 'summary',
          value: value,
        });
        select.render();
      });

      it('should have two values in the view', function () {
        logger('select.$container', select.$container.html());
        const $el = select.$container.find('.select-value-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('one or two');
      });

      it('should have two values in the edit', function () {
        logger('select.$container', select.$container.html());
        const $el = select.$container.find('input.input-verb-select-match-values');
        expect($el.length).to.equal(2);
        $el.each(function (i: number, e: any) {
          expect($(e).val()).to.equal(value[i]);
        });
      });
    });

    describe('generated yaml', function () {
      it('should reproduce the yaml select from dom', function () {
        select = SelectMatch.generate(yaml_match, default_opts);
        select[0].render();
        expect(select[0].dom_to_yaml_obj()).to.eql(yaml_match);
      });

      it('should reproduce the yaml select with many values from dom', function () {
        select = _.first(SelectMatch.generate(yaml_match_array, default_opts));
        select.render();
        logger('dom to yaml', select.dom_to_yaml_obj());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_match_array);
      });
    });

    describe('test select', function () {
      it('should match a single value', function () {
        const ev_test_result = select.test_event({ summary: 'text' });
        expect(ev_test_result).to.eql(true);
      });

      it('should not match a single value', function () {
        const ev_test_result = select.test_event({ summary: 'ACVASD' });
        expect(ev_test_result).to.eql(false);
      });

      it('should match from an array of values', function () {
        const selects = SelectMatch.generate(yaml_match_array, default_opts);
        const ev_test_result = selects.map(function (select: any) {
          return select.test_event({ node: 'then' });
        });
        expect(ev_test_result).to.eql([true]);
      });

      it('should not match from an array of values', function () {
        const selects = SelectMatch.generate(yaml_match_array, default_opts);
        const ev_test_result = selects.map(function (select: any) {
          return select.test_event({ node: 'about' });
        });
        expect(ev_test_result).to.eql([false]);
      });
    });
  });

  describe('equals', function () {
    let select: any = null;

    const yaml_equals_array = {
      equals: {
        tag: ['test', 'then', 'that'],
      },
    };

    const yaml_equals = {
      equals: {
        summary: 'complete summary',
      },
    };

    beforeEach(function () {
      select = new SelectEquals({
        rule: {},
        field: 'summary',
        value: 'complete summary',
      });
    });

    describe('instance', function () {
      it('creates a SelectEquals instance', function () {
        expect(select).to.be.an.instanceof(SelectEquals);
      });

      it('should have a verb', function () {
        expect(select).to.have.property('verb');
        expect(select.verb).to.eql('equals');
      });

      it('should reproduce the yaml select', function () {
        const gen = SelectEquals.generate(yaml_equals, default_opts);
        expect(gen[0].to_yaml_obj()).to.eql(yaml_equals);
      });
    });

    describe('rendered container with one value', function () {
      beforeEach(function () {
        select.render();
      });

      it('should have the operator in view', function () {
        const $el = select.$container.find('.select-operator-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('equals');
      });

      it('should have a field in the view', function () {
        const $el = select.$container.find('.select-field-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('summary');
      });

      it('should have a value in the view', function () {
        logger('select.$container', select.$container.html());
        const $el = select.$container.find('.select-value-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('complete summary');
      });

      it('should have the operator input in edit', function () {
        const $el = select.$container.find('.select-operator > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('equals');
      });

      it('should have the field input in edit', function () {
        const $el = select.$container.find('.select-field > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('summary');
      });

      it('should have the value input in edit', function () {
        const $el = select.$container.find('.select-values > input');
        logger('input edit', select.$container, select.$container.html());
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('complete summary');
      });

      it('should reproduce the yaml select from dom', function () {
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_equals);
      });
    });

    describe('rendered container with many values', function () {
      const value = ['one', 'two'];

      beforeEach(function () {
        select = new SelectEquals({
          rule: {},
          field: 'summary',
          value: value,
        });
        select.render();
      });

      it('should have two values in the view', function () {
        logger('select.$container', select.$container.html());
        const $el = select.$container.find('.select-value-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('one or two');
      });

      it('should have two values in the edit', function () {
        logger('select.$container', select.$container.html());
        const $el = select.$container.find('input.input-verb-select-equals-values');
        expect($el.length).to.equal(2);
        $el.each(function (i: number, e: any) {
          expect($(e).val()).to.equal(value[i]);
        });
      });
    });

    describe('yaml generated', function () {
      it('should reproduce the yaml select from dom', function () {
        select = SelectEquals.generate(yaml_equals, default_opts);
        select[0].render();
        expect(select[0].dom_to_yaml_obj()).to.eql(yaml_equals);
      });

      it('should reproduce the yaml array select from dom', function () {
        select = _.first(SelectEquals.generate(yaml_equals_array, default_opts));
        select.render();
        logger('dom to yaml', select.dom_to_yaml_obj());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_equals_array);
      });
    });

    describe('test select', function () {
      it('should match a single value', function () {
        const ev_test_result = select.test_event({ summary: 'complete summary' });
        expect(ev_test_result).to.eql(true);
      });

      it('should not match a single value', function () {
        const ev_test_result = select.test_event({ summary: 'ACVASD' });
        expect(ev_test_result).to.eql(false);
      });

      it('should match from an array of values', function () {
        const selects = SelectEquals.generate(yaml_equals_array, default_opts);
        const ev_test_result = selects.map(function (select: any) {
          return select.test_event({ tag: 'that' });
        });
        expect(ev_test_result).to.eql([true]);
      });

      it('should not match from an array of values', function () {
        const selects = SelectEquals.generate(yaml_equals_array, default_opts);
        const ev_test_result = selects.map(function (select: any) {
          return select.test_event({ node: 'about' });
        });
        expect(ev_test_result).to.eql([false]);
      });
    });
  });

  describe('field_exists', function () {
    let select: any = null;
    const yaml_field_exists = { field_exists: 'node' };

    beforeEach(function () {
      select = new SelectFieldExists({ rule: {} });
      select.render();
    });

    it('creates an SelectFieldExists instance', function () {
      expect(select).to.be.an.instanceof(SelectFieldExists);
    });

    it('should have an verb', function () {
      expect(select).to.have.property('verb');
      expect(select.verb).to.eql('field_exists');
    });

    it('should reproduce the yaml select', function () {
      select = SelectFieldExists.generate(yaml_field_exists, default_opts);
      expect(select.to_yaml_obj()).to.eql(yaml_field_exists);
    });

    it('should have the operator the renderedv view', function () {
      const $el = select.$container;
      logger('find', $el, $el.html());
      expect($el.find('.select-operator-view').text().trim()).to.equal('exists');
    });

    it('should have a field in the rendered view', function () {
      select.field = 'test';
      select.render();
      const $el = select.$container;
      logger('find', $el, $el.html());
      expect($el.find('.select-field-view').text().trim()).to.equal('test');
    });

    it('should have the operator in the rendered edit template', function () {
      const $el = select.$container;
      select.render();
      logger('find', $el, $el.html());
      expect($el.find('.select-operator > input').val()).to.equal('field_exists');
    });

    it('should have the field in the rendered edit template', function () {
      select = SelectFieldExists.generate(yaml_field_exists, default_opts);
      select.render();
      const $el = select.$container;
      expect($el.find('.select-field > input').length).to.equal(1);
      expect($el.find('.select-field > input').val()).to.equal('node');
    });

    it('should reproduce the yaml select from dom', function () {
      select = SelectFieldExists.generate(yaml_field_exists, default_opts);
      select.render();
      logger('render', select.render().html());
      expect(select.dom_to_yaml_obj()).to.eql(yaml_field_exists);
    });
  });

  describe('field_missing', function () {
    let select: any = null;
    const yaml_field_missing = { field_missing: 'tag' };

    beforeEach(function () {
      select = new SelectFieldMissing({ rule: {} });
    });

    describe('instance', function () {
      it('creates a SelectFieldMissing instance', function () {
        expect(select).to.be.an.instanceof(SelectFieldMissing);
      });

      it('should have an verb', function () {
        expect(select).to.have.property('verb');
        expect(select.verb).to.eql('field_missing');
      });

      it('should reproduce the yaml select', function () {
        select = SelectFieldMissing.generate(yaml_field_missing, default_opts);
        expect(select.to_yaml_obj()).to.eql(yaml_field_missing);
      });
    });

    describe('rendered container', function () {
      beforeEach(function () {
        select.field = 'tag';
        select.render();
      });

      it('should have the operator in the rendered view', function () {
        const $el = select.$container.find('.select-operator-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('is missing');
      });

      it('should have a field in the rendered view', function () {
        const $el = select.$container.find('.select-field-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('tag');
      });

      it('should have the operator in the rendered edit template', function () {
        const $el = select.$container.find('.select-operator > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('field_missing');
      });

      it('should have the field in the rendered edit template', function () {
        const $el = select.$container.find('.select-field > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('tag');
      });

      it('should reproduce the yaml select from dom', function () {
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_field_missing);
      });
    });

    describe('yaml and dom', function () {
      it('should reproduce the yaml from dom', function () {
        select = SelectFieldMissing.generate(yaml_field_missing, default_opts);
        select.render();
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_field_missing);
      });
    });
  });

  describe('starts_with', function () {
    let select: any = null;
    const yaml_starts_with = {
      starts_with: {
        superfield: 'check',
      },
    };

    beforeEach(function () {
      select = new SelectStartsWith({ rule: {} });
    });

    describe('instance', function () {
      it('creates a SelectStartsWith instance', function () {
        expect(select).to.be.an.instanceof(SelectStartsWith);
      });

      it('should have a verb', function () {
        expect(select).to.have.property('verb');
        expect(select.verb).to.eql('starts_with');
      });

      it('should reproduce the yaml select', function () {
        const gen = SelectStartsWith.generate(yaml_starts_with, default_opts);
        expect(gen[0].to_yaml_obj()).to.eql(yaml_starts_with);
      });
    });

    describe('rendered container', function () {
      beforeEach(function () {
        select.field = 'superfield';
        select.value = 'check';
        select.render();
      });

      it('should have the operator in view', function () {
        const $el = select.$container.find('.select-operator-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('starts with');
      });

      it('should have a field in the view', function () {
        const $el = select.$container.find('.select-field-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('superfield');
      });

      it('should have a value in the view', function () {
        const $el = select.$container.find('.select-value-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('check');
      });

      it('should have the operator input in edit', function () {
        const $el = select.$container.find('.select-operator > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('starts_with');
      });

      it('should have the field input in edit', function () {
        const $el = select.$container.find('.select-field > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('superfield');
      });

      it('should have the value input in edit', function () {
        const $el = select.$container.find('.select-value > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('check');
      });

      it('should reproduce the yaml select from dom', function () {
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_starts_with);
      });
    });

    describe('yaml generated', function () {
      it('should reproduce the yaml select from dom', function () {
        select = SelectStartsWith.generate(yaml_starts_with, default_opts);
        select[0].render();
        expect(select[0].dom_to_yaml_obj()).to.eql(yaml_starts_with);
      });
    });
  });

  describe('ends_with', function () {
    let select: any = null;
    const yaml_ends_with = {
      ends_with: {
        fiendeld: 'latestring',
      },
    };

    beforeEach(function () {
      select = new SelectEndsWith({
        rule: {},
        field: 'fiendeld',
        value: 'latestring',
      });
    });

    describe('instance', function () {
      it('creates a SelectEndsWith instance', function () {
        expect(select).to.be.an.instanceof(SelectEndsWith);
      });

      it('should have a verb', function () {
        expect(select).to.have.property('verb');
        expect(select.verb).to.eql('ends_with');
      });

      it('should reproduce the yaml select', function () {
        const gen = SelectEndsWith.generate(yaml_ends_with, default_opts);
        expect(gen[0].to_yaml_obj()).to.eql(yaml_ends_with);
      });
    });

    describe('rendered container', function () {
      beforeEach(function () {
        select.render();
      });

      it('should have the operator in view', function () {
        const $el = select.$container.find('.select-operator-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('ends with');
      });

      it('should have a field in the view', function () {
        const $el = select.$container.find('.select-field-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('fiendeld');
      });

      it('should have a value in the view', function () {
        const $el = select.$container.find('.select-value-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('latestring');
      });

      it('should have the operator input in edit', function () {
        const $el = select.$container.find('.select-operator > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('ends_with');
      });

      it('should have the field input in edit', function () {
        const $el = select.$container.find('.select-field > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('fiendeld');
      });

      it('should have the value input in edit', function () {
        const $el = select.$container.find('.select-value > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('latestring');
      });

      it('should reproduce the yaml select from dom', function () {
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_ends_with);
      });
    });

    describe('yaml generated', function () {
      it('should reproduce the yaml select from dom', function () {
        select = SelectEndsWith.generate(yaml_ends_with, default_opts);
        select[0].render();
        expect(select[0].dom_to_yaml_obj()).to.eql(yaml_ends_with);
      });
    });
  });

  describe('less_than', function () {
    let select: any = null;
    const yaml_less_than = {
      less_than: {
        severity: 3,
      },
    };

    beforeEach(function () {
      select = new SelectLessThan({
        rule: {},
        field: 'severity',
        value: 3,
      });
    });

    describe('instance', function () {
      it('creates a SelectLessThan instance', function () {
        expect(select).to.be.an.instanceof(SelectLessThan);
      });

      it('should have a verb', function () {
        expect(select).to.have.property('verb');
        expect(select.verb).to.eql('less_than');
      });

      it('should reproduce the yaml select', function () {
        const gen = SelectLessThan.generate(yaml_less_than, default_opts);
        expect(gen[0].to_yaml_obj()).to.eql(yaml_less_than);
      });
    });

    describe('rendered container', function () {
      beforeEach(function () {
        select.render();
      });

      it('should have the operator in view', function () {
        const $el = select.$container.find('.select-operator-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('is less than');
      });

      it('should have a field in the view', function () {
        const $el = select.$container.find('.select-field-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('severity');
      });

      it('should have a value in the view', function () {
        const $el = select.$container.find('.select-value-view');
        expect($el.length).to.equal(1);
        expect(parseInt($el.text().trim())).to.equal(3);
      });

      it('should have the operator input in edit', function () {
        const $el = select.$container.find('.select-operator > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('less_than');
      });

      it('should have the field input in edit', function () {
        const $el = select.$container.find('.select-field > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('severity');
      });

      it('should have the value input in edit', function () {
        const $el = select.$container.find('.select-value > input');
        expect($el.length).to.equal(1);
        expect(parseInt($el.val())).to.equal(3);
      });

      it('should reproduce the yaml select from dom', function () {
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_less_than);
      });
    });

    describe('yaml generated', function () {
      it('should reproduce the yaml select from dom', function () {
        select = SelectLessThan.generate(yaml_less_than, default_opts);
        select[0].render();
        expect(select[0].dom_to_yaml_obj()).to.eql(yaml_less_than);
      });
    });
  });

  describe('greater_than', function () {
    let select: any = null;
    const yaml_greater_than = {
      greater_than: {
        severity: 5,
      },
    };

    beforeEach(function () {
      select = new SelectGreaterThan({
        rule: {},
        field: 'severity',
        value: 5,
      });
    });

    describe('instance', function () {
      it('creates a SelectGreaterThan instance', function () {
        expect(select).to.be.an.instanceof(SelectGreaterThan);
      });

      it('should have a verb', function () {
        expect(select).to.have.property('verb');
        expect(select.verb).to.eql('greater_than');
      });

      it('should reproduce the yaml select', function () {
        const gen = SelectGreaterThan.generate(yaml_greater_than, default_opts);
        expect(gen[0].to_yaml_obj()).to.eql(yaml_greater_than);
      });
    });

    describe('rendered container', function () {
      beforeEach(function () {
        select.render();
      });

      it('should have the operator in view', function () {
        const $el = select.$container.find('.select-operator-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('is greater than');
      });

      it('should have a field in the view', function () {
        const $el = select.$container.find('.select-field-view');
        expect($el.length).to.equal(1);
        expect($el.text().trim()).to.equal('severity');
      });

      it('should have a value in the view', function () {
        const $el = select.$container.find('.select-value-view');
        expect($el.length).to.equal(1);
        expect(parseInt($el.text().trim())).to.equal(5);
      });

      it('should have the operator input in edit', function () {
        const $el = select.$container.find('.select-operator > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('greater_than');
      });

      it('should have the field input in edit', function () {
        const $el = select.$container.find('.select-field > input');
        expect($el.length).to.equal(1);
        expect($el.val()).to.equal('severity');
      });

      it('should have the value input in edit', function () {
        const $el = select.$container.find('.select-value > input');
        expect($el.length).to.equal(1);
        expect(parseInt($el.val())).to.equal(5);
      });

      it('should reproduce the yaml select from dom', function () {
        logger('render', select.render().html());
        expect(select.dom_to_yaml_obj()).to.eql(yaml_greater_than);
      });
    });

    describe('yaml generated', function () {
      it('should reproduce the yaml select from dom', function () {
        select = SelectGreaterThan.generate(yaml_greater_than, default_opts);
        select[0].render();
        expect(select[0].dom_to_yaml_obj()).to.eql(yaml_greater_than);
      });
    });
  });
});
