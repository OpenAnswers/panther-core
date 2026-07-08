//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeEach } from 'vitest';

describe('Actions', function () {
  const logger = debug('oa:test:event:actions');
  const simple_yaml = { name: 'test' };
  const rule_stub = {};
  let $container: any = $('<div/>');
  $('#actions-render-test').append($container);
  const default_opts = { rule: rule_stub, typeaheads: false };

  beforeEach(function () {
    // create a separate test container for each
    $container = $('<div/>');
    $('#actions-render-test').append($container);
  });

  describe('Types', function () {
    it('should have action types', function () {
      logger('ActionTypes.types', ActionTypes.all_types());
      expect(ActionTypes.types).to.have.all.keys([
        '_initial',
        'discard',
        'set',
        // 'skip',
        'stop',
        'stop_rule_set',
        'replace',
      ]);
    });
  });

  describe('ActionSet', function () {
    it('should have the verb lookup class attached', function () {
      expect(Actions).to.have.property('verb_lookup_class').and.to.equal(ActionTypes);
    });

    it('should have the verb class attached', function () {
      expect(Actions).to.have.property('verb_class').and.to.equal(ActionBase);
    });
  });

  describe('in a group', function () {
    let action_set: any = null;
    let opts: any = null;

    beforeEach(function () {
      $container = $('<div/>');
      $('#actions-render-test').append($container);
      opts = _.defaults({ $container: $container }, default_opts);

      const yaml_rule = {
        discard: true,
        set: {
          node: 'bluesky',
        },
      };
      action_set = Actions.generate(yaml_rule, opts);
      action_set.render();
      logger('action_set contianer', action_set.$container);
    });

    it('should render all actions', function () {
      action_set.render();
      expect(action_set.$container.find('.action-entry').length).to.eql(2);
    });

    it('should attach this Action VerbSet object to the dom container', function () {
      expect(action_set.$container.data('verb_set')).to.equal(action_set);
      expect($.data(action_set.$container[0], 'verb_set')).to.equal(action_set);
    });

    it('should re render a single action in place', function () {
      const verb = action_set.get_instance(1);
      verb.value = 'redsky';
      verb.render();
      action_set.render();
      logger('test verb values', verb, action_set.$container.find('.action-value > input'));
      //action_set.render_instance(1)
      expect(action_set.$container.find('.action-value > input').val()).to.eql('redsky');
    });

    it('should re render all actions in place', function () {
      action_set.$container.html('');
      action_set.render();
      expect(action_set.$container.find('.action-entry-edit').length).to.eql(2);
    });

    it('should remove an action', function () {
      expect(action_set.$container.find('.action-entry-edit').length).to.eql(2);
      expect(action_set.$container.find('.action-entry-view').length).to.eql(2);
      const verb = action_set.get_instance(0);
      expect(action_set.remove_instance(verb)).to.not.be.true;
      expect(action_set.$container.find('.action-entry-edit').length).to.eql(1);
    });

    it('should append an action', function () {
      action_set.add_instance(new ActionStop(opts));
      expect(action_set.$container.find('.action-entry-edit').length).to.eql(3);
    });

    it('should create a new _initial action', function () {
      const verb = action_set.create_verb();
      expect(verb).to.have.property('euid');
      expect(verb).to.have.property('verb').and.to.equal('_initial');
    });

    it('should generate a new _initial action on the set', function () {
      const verb = action_set.generate_verb('_initial', { typeaheads: false });
      expect(action_set.$container.find('.action-entry-edit').length).to.eql(3);
    });

    it('should attach the new InitialVerb object to the verb container', function () {
      const verb = action_set.generate_verb('_initial', { typeaheads: false });
      expect(verb.$container.data('verb')).to.equal(verb);
      //logger $.data(verb.$container)
      //expect( $.data verb.$container, 'verb' ).to.equal verb
    });

    it('should replace an action', function () {
      const oldv = action_set.get_instance(1);
      const newv = action_set.generate_verb('_initial', { typeaheads: false });
      action_set.replace_verb(oldv, newv);
      expect(action_set.$container.find('.action-entry-edit').length).to.eql(2);
      expect(action_set.find_input_el(newv.euid, 'operator').val()).to.equal('');
    });
  });

  describe('generated from yaml', function () {
    const yaml_rule = {
      set: {
        fieldb: 'testb',
      },
      discard: true,
      skip: false,
      stop: true,
      debug: true,
    };

    const yaml_actions = {
      set: {
        fieldb: 'testb',
      },
      discard: true,
      stop: true,
    };

    const yaml_replace_rule = {
      replace: [
        {
          field: 'nfield',
          this: '/nsearch/',
          with: 'nreplace',
        },
        {
          field: 'vfield',
          this: '/vsearch/',
          with: 'vreplace',
        },
      ],
    };

    it('should have an action', function () {
      const actions = Actions.generate(yaml_rule, { rule: {} });
      expect(actions).to.be.an.instanceof(Actions);
      expect(actions.get_instances()).to.be.an.instanceof(Array);
      expect(actions.get_instances().length).to.eql(3);
    });

    it('should reproduce the yaml action', function () {
      const actions = Actions.generate(yaml_rule, { rule: {}, render: true });
      logger('render', actions.render());
      //$('#action-render-test').append actions.render()
      const back_to_yaml = actions.to_yaml_obj();
      logger('back_to_yaml', back_to_yaml);
      expect(back_to_yaml).to.eql(yaml_actions);
    });

    it('should reproduce the complex replace yaml action', function () {
      const actions = Actions.generate(yaml_replace_rule, default_opts);
      actions.render();
      expect(actions.to_yaml_obj()).to.eql(yaml_replace_rule);
    });

    it('should remove an action from yaml', function () {
      const action_set = Actions.generate(yaml_rule, default_opts);
      action_set.render();
      const verb = action_set.get_instance(0);
      expect(action_set.remove_instance(verb)).to.not.be.true;
      expect(action_set.$container.find('.action-entry-edit').length).to.eql(2);
      const yaml = action_set.dom_to_yaml_obj();
      expect(yaml).to.not.have.key('set');
      expect(yaml).to.have.keys('discard', 'stop');
    });
  });
});
