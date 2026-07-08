//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeAll } from 'vitest';

describe('Global Rules UI', function () {
  const rules_yaml = [
    { name: 'first rule', all: true, discard: true },
    { name: 'second rule', all: true, discard: true },
    { name: 'third rule', all: true, discard: true },
  ];

  let rule_set: any = null;
  let $ul: any = null;

  beforeAll(function () {
    $ul = $('<ul/>');
    $('#rule-set-render-test').append($ul);
    rule_set = new RuleSet({ yaml: rules_yaml, event_rules: {}, $container: $ul });
    rule_set.render();
  });

  it('renders at least one global rule card', function () {
    expect($ul.find('.card-global-rule').length).to.be.above(0);
  });

  it('renders all three rule cards', function () {
    expect($ul.find('.card-global-rule').length).to.equal(3);
  });

  describe('the third rule', function () {
    let $card: any;

    beforeAll(function () {
      $card = $ul.find('.card-global-rule').eq(2);
    });

    it('has the correct title', function () {
      expect($card.find('.rule-name').text()).to.equal('third rule');
    });

    describe('expand/collapse', function () {
      it('starts with the bottom arrow (collapsed state)', function () {
        expect($card.find('.collapse-toggle').hasClass('glyphicon-triangle-bottom')).to.equal(true);
      });

      it('expands on collapse toggle click', function () {
        $card.find('.collapse-toggle').trigger('click');
        expect($card.find('.collapse-toggle').hasClass('glyphicon-triangle-top')).to.equal(true);
      });
    });

    describe('edit mode', function () {
      it('starts with the edit button in normal state', function () {
        expect($card.find('.button-edit').hasClass('button-edit-normal')).to.equal(true);
      });

      it('enters edit mode on edit button click', function () {
        $card.find('.button-edit').trigger('click');
        expect($card.find('.button-edit').hasClass('button-edit-active')).to.equal(true);
        expect($card.find('.button-edit').hasClass('button-edit-normal')).to.equal(false);
      });

      it('shows the edit warning in edit mode', function () {
        expect($card.find('.edit-warning').hasClass('collapse')).to.equal(false);
      });

      it('exits edit mode on second edit button click', function () {
        $card.find('.button-edit').trigger('click');
        // disable_editing re-renders the rule; re-query the card from the DOM
        $card = $ul.find('.card-global-rule').eq(2);
        expect($card.find('.button-edit').hasClass('button-edit-normal')).to.equal(true);
        expect($card.find('.button-edit').hasClass('button-edit-active')).to.equal(false);
      });

      it('hides the edit warning after exiting edit mode', function () {
        expect($card.find('.edit-warning').hasClass('collapse')).to.equal(true);
      });
    });
  });
});
