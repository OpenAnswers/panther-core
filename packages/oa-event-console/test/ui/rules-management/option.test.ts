//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeEach } from 'vitest';

const debug = require('debug');
describe('Options', function () {
  const logger = debug('oa:test:event:rules:options');
  const render_test_id = '#option-render-test';
  const simple_yaml = { name: 'test' };
  const default_opts = { rule: {}, render: true };

  describe('debug', function () {
    let option: any = null;

    beforeEach(function () {
      option = new OptionDebug({ rule: {} });
    });

    it('creates an OptionDebug instance', function () {
      expect(option).to.be.an.instanceof(OptionDebug);
    });

    it('should have the correct verb', function () {
      expect(option).to.have.property('verb');
      expect(option.verb).to.eql('debug');
    });

    it('should reproduce the yaml option', function () {
      const rule = { debug: true };
      option = OptionDebug.generate(rule, default_opts);
      const el = option.render();
      logger('render', el);
      $(render_test_id).append(el);
      expect(option.dom_to_yaml_obj()).to.eql(rule);
    });

    it('should not represent a falsey yaml option', function () {
      const rule = { debug: false };
      option = OptionDebug.generate(rule, default_opts);
      expect(option).to.not.be.ok;
    });
  });

  describe('skip', function () {
    let option: any = null;

    beforeEach(function () {
      option = new OptionSkip({ rule: {} });
    });

    it('creates an OptionSkip instance', function () {
      expect(option).to.be.an.instanceof(OptionSkip);
    });

    it('should have the correct verb', function () {
      expect(option).to.have.property('verb');
      expect(option.verb).to.eql('skip');
    });

    it('should reproduce the yaml option', function () {
      const rule = { skip: true };
      option = OptionSkip.generate(rule, default_opts);
      const el = option.render();
      logger('render', el);
      $(render_test_id).append(el);
      expect(option.dom_to_yaml_obj()).to.eql(rule);
    });

    it('should not represent a falsey yaml option', function () {
      const rule = { skip: false };
      option = OptionSkip.generate(rule, default_opts);
      expect(option).to.not.be.ok;
    });
  });

  describe('generated from yaml', function () {
    const yaml_rule = {
      equals: {
        aname: 'avalue',
      },
      set: {
        fieldb: 'testb',
      },
      discard: true,
      skip: true,
      stop: true,
      debug: true,
      delete: 'name',
    };

    const yaml_falsey_rule = {
      skip: false,
      debug: false,
    };

    it('should have an option', function () {
      const options = Options.generate(yaml_rule, { rule: {} });
      expect(options).to.be.an.instanceof(Options);
      expect(options.get_instances().length).to.eql(2);
    });

    it('should reproduce the yaml actions', function () {
      const options = Options.generate(yaml_rule, { rule: {}, render: true });
      logger('render', options.render());
      //$('#action-render-test').append options.render()
      expect(options.to_yaml_obj()).to.eql({ skip: true, debug: true });
    });

    it('should remove the falsey values', function () {
      const options = Options.generate(yaml_falsey_rule, { rule: {}, render: true });
      logger('render', options.render());
      //$('#action-render-test').append options.render()
      expect(options.to_yaml_obj()).to.eql({});
    });
  });
});
