//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// # RuleVerbBase and RuleVerbType Tests

describe('RuleVerbBase', function () {
  const logger = debug('oa:test:event:rules:rule_verb_base');
  const render_test_id = '#ruleverb-render-test';
  const simple_yaml = { name: 'test' };
  const default_opts = { rule: {} };

  describe('class', function () {
    it('should have verb and template properties', function () {
      expect(RuleVerbBase).to.have.property('verb').and.to.be.a('string');
      expect(RuleVerbBase).to.have.property('verb_type').and.to.be.a('string');
      expect(RuleVerbBase).to.have.property('template_id').and.to.be.a('string');
      //expect(RuleVerbBase).have.property('template_tag').and.to.be.a('string');
    });

    it('should have a generate function', function () {
      expect(RuleVerbBase).to.have.property('generate').and.to.be.a('function');
    });

    it('should have a generate_tempate function', function () {
      expect(RuleVerbBase).to.have.property('generate_template').and.to.be.a('function');
    });

    it('should have a generate_tempates function', function () {
      expect(RuleVerbBase).to.have.property('generate_templates').and.to.be.a('function');
    });
  });

  describe('instance', function () {
    let rvb: any = null;

    beforeEach(function () {
      rvb = new RuleVerbBase({ rule: {} });
    });

    it('should be a RuleVerbBase', function () {
      expect(rvb).to.be.an.instanceof(RuleVerbBase);
    });

    it('should have a verb', function () {
      expect(rvb).to.have.property('verb').and.to.eql('_basse_');
    });

    it('should have a verb_type', function () {
      expect(rvb).to.have.property('verb_type').and.to.eql('_basetype_');
    });

    it.skip('should have a view template id', function () {
      expect(rvb).to.have.property('template_view').and.to.be.a('string');
    });

    it.skip('should have a edit template id', function () {
      expect(rvb).to.have.property('template_edit').and.to.be.a('string');
    });

    it('should have a logger', function () {
      expect(rvb).to.have.property('logger').and.to.be.a('function');
    });
  });

  describe('extended to TestVerb', function () {
    let TestVerb: any = null;

    beforeAll(function () {
      // Inject stub templates for the test verb class (verb_type=wakka)
      document.body.insertAdjacentHTML(
        'beforeend',
        `
        <script id="template-rvb-atest-view" type="text/x-mustache-template">
          <div class="wakka-entry-view">test verb view template content here</div>
        </script>
        <script id="template-rvb-atest-edit" type="text/x-mustache-template">
          <div class="wakka-entry-edit"><input class="wakka-operator" value="test"/></div>
        </script>
      `
      );

      class TestVerbClass extends RuleVerbBase {
        static logger = function () {
          return 'custom';
        };
        static verb = 'test';
        static verb_type = 'wakka';
        static template_id = '#template-rvb-atest';
      }
      TestVerb = TestVerbClass;
    });

    it('should attach templates via generate_tempates', function () {
      expect(function () {
        TestVerb.generate_templates();
      }).to.not.throw(Error);
      // can't chain length with .and!?
      expect(TestVerb.template_view).to.be.a('string');
      expect(TestVerb.template_view).to.have.length.above(20);
      expect(TestVerb.template_edit).to.be.a('string');
      expect(TestVerb.template_edit).to.have.length.above(20);
    });

    it('enables editing', function () {
      const rvb = new TestVerb({ rule: {}, typeaheads: false });
      expect(rvb.enable_editing()).to.be.ok;
    });
  });
});

describe('RuleVerbTypes', function () {
  const logger = debug('oa:test:event:rules:rule_verb_types');
  const simple_yaml = { name: 'test' };
  const default_opts = { rule: {} };

  describe('class', function () {
    it('should have a types object', function () {
      expect(RuleVerbTypes).to.have.property('types').and.to.be.an('object');
    });

    it('should have a verb_type', function () {
      expect(RuleVerbTypes).to.have.property('verb_type').and.to.be.a('string');
    });

    it("should have a class type for it's children", function () {
      expect(RuleVerbTypes).to.have.property('contains_class').and.to.equal(RuleVerbBase);
    });

    it('should have functions', function () {
      const props = [
        'lookup_type',
        'all_types',
        'active_types',
        'find_types_in',
        'expect_class_type',
        'check_class_type',
      ];
      for (const p of props) {
        expect(RuleVerbTypes).to.have.property(p).and.be.a('function');
      }
    });
  });

  describe('extended to TestType', function () {
    let TestTypes: any = null;
    class TT {}
    class EE {
      static disabled = true;
    }
    class HH {
      static hidden = true;
    }

    beforeAll(function () {
      class TestTypesClass extends RuleVerbTypes {
        static types: any = {
          test: TT,
          next: EE,
          hide: HH,
        };

        static logger = function (...args: any[]) {
          console.log('custom test logger', ...args);
          return 'custom';
        };
        static verb_type = 'wakka';
        static template_id = '#template-rvb-atest';
      }
      TestTypes = TestTypesClass;
    });

    describe('class', function () {
      it('has the types property', function () {
        expect(TestTypes).to.have.property('types').and.to.be.an('object');
      });

      it('should lookup the "test" verb name', function () {
        expect(TestTypes.lookup_type('test')).to.equal(TT);
      });

      it('should return false for an unknown type name', function () {
        expect(TestTypes.lookup_type('testno')).to.equal(false);
      });

      it('should get the "next" verb name', function () {
        expect(TestTypes.get_type('next')).to.equal(EE);
      });

      it('should throw getting an unknown name', function () {
        expect(function () {
          TestTypes.get_type('nextno');
        }).to.throw(Error);
      });

      it('should return all types array', function () {
        expect(TestTypes.all_types()).to.be.an.instanceof(Array);
        expect(TestTypes.all_types()).to.eql(['test', 'next', 'hide']);
      });

      it('should return active types array', function () {
        expect(TestTypes.active_types()).to.be.an.instanceof(Array);
        expect(TestTypes.active_types()).to.eql(['test']);
      });
    });
  });
});

describe('RuleVerbSet', function () {
  const logger = debug('oa:test:event:rules:rule_verb_types');
  const simple_yaml = { name: 'test' };
  const default_opts = { rule: {} };

  describe('class', function () {
    it('should have a verb_type', function () {
      expect(RuleVerbSet).to.have.property('verb_type').and.to.be.a('string');
    });

    it("should have a class type for it's children", function () {
      expect(RuleVerbSet).to.have.property('verb_class').and.to.equal(RuleVerbBase);
    });

    it("should have a lookup class type for it's childrens class", function () {
      expect(RuleVerbSet).to.have.property('verb_lookup_class').and.to.equal(RuleVerbTypes);
    });

    it('should have functions', function () {
      const props = ['expect_class_type', 'check_class_type', 'generate'];
      for (const p of props) {
        expect(RuleVerbSet).to.have.property(p).and.be.a('function');
      }
    });
  });

  describe('instance', function () {
    let tt: any = null;

    beforeEach(function () {
      tt = new RuleVerbSet({ rule: {} });
    });

    it('should have functions', function () {
      const props = [
        'get_instance',
        'get_instances',
        'add_instances',
        'add_instance',
        'remove_instance',
        'generate_verb',
        'create_verb',
        'replace_verb',
        'render',
        'render_tag_html',
        'dom_to_yaml_obj',
        'to_yaml_obj',
      ];
      for (const p of props) {
        expect(tt).to.have.property(p).and.be.a('function');
      }
    });
  });

  describe('extended to TestSet', function () {
    let TestSet: any = null;
    let TestVerb: any = null;

    // Setup some extended class instances
    beforeAll(function () {
      class TestSetClass extends RuleVerbSet {
        static logger = function (...args: any[]) {
          console.log('custom test logger', ...args);
          return 'custom';
        };
        static verb_type = 'wakka';
        static template_id = '#template-rvb-atest';
      }
      TestSet = TestSetClass;

      class TestVerbClass extends RuleVerbBase {
        static template_id = '#template-rvb-atest';
        static verb_type = 'wakka';
      }
      TestVerbClass.generate_templates();
      TestVerb = TestVerbClass;
    });

    describe('generate', function () {
      it('should attach templates via generate_tempates', function () {
        TestSet.generate({}, default_opts);
        expect(function () {
          TestSet.generate({}, default_opts);
        }).to.not.throw(Error);
      });
    });

    describe('the generated instance', function () {
      let group: any = null;
      let verb: any = null;
      beforeEach(function () {
        group = TestSet.generate({}, default_opts);
        verb = new TestVerb(default_opts);
      });

      it('has a custom test logger', function () {
        expect(group).to.have.property('logger').and.to.be.a('function');
        expect(group.logger()).to.equal('custom');
      });

      it('has a custom verb_type', function () {
        expect(group).to.have.property('verb_type').and.equal('wakka');
      });

      it('has no verb instances', function () {
        expect(group.get_instances()).to.be.an('array');
        expect(group.get_instances()).to.have.length(0);
      });

      it('adds one verb instance', function () {
        expect(group.add_instance(verb)).to.be.ok;
        expect(group.get_instances()).to.have.length(1);
      });

      it('gets an instance by object', function () {
        group.add_instance(verb);
        expect(group.get_instance(verb)).to.equal(verb);
      });

      it('gets an instance by index', function () {
        group.add_instance(verb);
        expect(group.get_instance(0)).to.equal(verb);
      });

      it('gets an instance by verb element uid', function () {
        group.add_instance(verb);
        expect(group.get_instance(verb.euid)).to.equal(verb);
      });
    });
  });
});
