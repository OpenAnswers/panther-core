//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:func:rules');
const { expect } = require('../mocha_helpers');

// Node modules
const path = require('path');

// OA modules
const { EventRules } = require('../../lib/event_rules');
const { RuleSet } = require('../../lib/rule_set');
const { Action } = require('../../lib/action');
const { Select, SelectMatch } = require('../../lib/select');
const { Event } = require('../../lib/event');

// Test event setup
const test_events: any = {
  simple1: {
    identifier: 'simple1_node:3:simple alert summary of sev 3 aaaaaa',
    node: 'simple1_node',
    severity: 3,
    summary: 'simple alert summary of sev 3 aaaaaa',
  },

  simple2: {
    //identifier: 'simple2_node:5:simple alert summary of sev 4 bbbbbb'
    node: 'simple2_node',
    severity: 5,
    summary: 'simple alert summary of sev 4 bbbbbb',
  },
};

// Onto the tests

describe('Sample rules file', function () {
  it('loads into EventRules', function () {
    const the_rules = new EventRules({
      path: path.join(__dirname, 'rules_sample.yml'),
    });

    expect(the_rules).to.be.an.instanceof(EventRules);
  });

  describe('loaded', function () {
    // Use the same rules instance for all the tests
    let the_rules: any = null;

    before(function () {
      // Load the rules from the yaml
      the_rules = new EventRules({
        path: path.join(__dirname, 'rules_sample.yml'),
      });
    });

    it('has global rules', function () {
      expect(the_rules.globals).to.be.an.instanceof(RuleSet);
    });

    it('has groups', function () {
      expect(the_rules.groups_array()).to.contain('goruppo_a');
      expect(the_rules.groups_array()).to.contain('group_b');
      expect(the_rules.groups_array()).to.contain('select_c');
    });

    describe('group: goruppo_a', function () {
      it('has the goruppo_a', function () {
        expect(the_rules.groups.get('goruppo_a').name).to.equal('goruppo_a');
      });

      it('loads the select for goruppo_a', function () {
        const obj = the_rules.groups.get('goruppo_a').select;
        expect(obj).to.be.an.instanceof(Select);
      });

      it('loads the rules for goruppo_a', function () {
        const obj = the_rules.groups.get('goruppo_a').rules;
        expect(obj).to.be.an.instanceof(RuleSet);
      });
    });

    describe('group: group_b', function () {
      it('has the group_b', function () {
        expect(the_rules.groups.get('group_b').name).to.equal('group_b');
      });
    });

    describe('group: select_c with a select field', function () {
      it('has the c group', function () {
        expect(the_rules.groups.get('select_c').name).to.equal('select_c');
      });

      it('loads a select from the select field', function () {
        const group = the_rules.groups.get('select_c');
        expect(group.select.selects[0].value).to.eql('thisvalue');
      });
    });

    describe('running global action', function () {
      it('miss the simple1 event', function () {
        const out_event = the_rules.run(test_events.simple1);
        expect(out_event.original).to.eql(test_events.simple1);
      });

      it('modify the simple2 event', function () {
        const compare_simple2 = JSON.parse(JSON.stringify(test_events.simple2));
        // compare_simple2.identifier = 'simple2_node:3:simple alert summary of sev 4 bbbbbb'
        compare_simple2.identifier = '15475377226825130586';
        compare_simple2.severity = 3;

        const out_event = the_rules.run(test_events.simple2);
        //expect( out_event.copy ).excludingEvery('identifier').to.eql( compare_simple2 ).excludingEvery('identifier')
        expect(out_event.copy).to.eql(compare_simple2);
      });

      it('discards', function () {
        const ev: any = {
          summary: 'some discarding text',
        };

        const out_event = the_rules.run(ev);
        expect(out_event.discard()).to.eql(true);
      });

      it('dedupes a 3 element form', function () {
        const ev: any = {
          summary: '3 element form dedupe dedupea dedupe',
        };

        const out_event = the_rules.run(ev);
        expect(out_event.get('summary')).to.equal('3 element form dedupe dd a dd dedupe');
      });

      it('dedupes a 2 element form', function () {
        const ev: any = {
          summary: '2 element form dedupe dedupeb dedupe',
        };

        const out_event = the_rules.run(ev);
        expect(out_event.get('summary')).to.equal('2 element form dd b dd');
      });

      it('simple4 to simple5', function () {
        const ev: any = {
          node: 'simple4_node',
          summary: '2 element form dedupe dedupeb dedupe',
          simple5: 'start-> replace_testing <-end',
        };

        const out_event = the_rules.run(ev);
        expect(out_event.get('simple5')).to.match(/re_replace_done/);
      });

      it('match and set with field - simple7', function () {
        const ev: any = {
          node: 'simple7_node',
          summary: 'the simple7 match summary words',
          simple7: 'simple7_field_value',
        };

        const out_event = the_rules.run(ev);
        expect(out_event.get('new_field')).to.equal('>simple7_field_value<');
      });

      it('match and set with capture group - simple8', function () {
        const ev: any = {
          node: 'simple8_node',
          summary: 'element form simple8 words',
        };

        const out_event = the_rules.run(ev);
        expect(out_event.get('new_field')).to.equal('capture match >mple<');
      });

      it('match and set with multiple capture groups - simple9', function () {
        const ev: any = {
          node: 'simple9_node',
          summary: 'this is simple9 simple9',
          simple5: 'start-> replace_testing <-end',
        };

        const out_event = the_rules.run(ev);
        expect(out_event.get('new_field')).to.equal('capture match >mp< >e9<');
      });
    });

    describe('running a group action', function () {
      const groupa: any = {
        identifier: '10.0.0.1:4:simple alert summary of sev 4 cccccc',
        node: '10.0.0.1',
        severity: 4,
        summary: 'simple alert summary of sev 4 cccccc',
      };

      const groupb: any = {
        identifier: 'bnode17:3:simple alert summary of sev 3 dddddd',
        node: 'bnode17',
        severity: 3,
        summary: 'simple alert summary of sev 3 dddddd',
      };

      it('groups the groupa event', function (done: Function) {
        const returned_ev = the_rules.run(groupa);
        expect(returned_ev).to.have.property('copy');
        expect(returned_ev.copy).to.have.property('group');
        expect(returned_ev.copy.group).to.equal('goruppo_a');
        done();
      });

      it('groups the groupb event', function () {
        const returned_ev = the_rules.run(groupb);
        expect(returned_ev.copy).to.have.property('group');
        expect(returned_ev.get('group')).to.equal('group_b');
      });
    });

    describe('global match tracking', function () {
      const match_positive: any = {
        node: 'simple2_node',
      };

      const match_negative: any = {
        node: 'negative_host',
      };

      it('enabled tracking', function () {
        const returned_ev = the_rules.run(match_positive, {
          tracking_matches: true,
        });

        expect(returned_ev).to.have.property('tracking_matches');
        expect(returned_ev.tracking_matches).to.eql(true);
      });

      it('added matches', function () {
        const returned_ev = the_rules.run(match_positive, {
          tracking_matches: true,
        });

        expect(returned_ev.matches).to.have.property('global');
        expect(returned_ev.matches).to.have.property('group');
        expect(returned_ev.matches.global).to.be.an('array').that.is.not.empty;
        expect(returned_ev.matches.group).to.be.an('array').that.is.empty;
      });

      it('added a global match', function () {
        const returned_ev = the_rules.run(match_positive, {
          tracking_matches: true,
        });

        // debug 'match %O', returned_ev.matches.global
        expect(returned_ev.matches.global).to.be.an('array').that.deep.includes({
          from: 'RuleSelector',
          uuid: '1234-simple2-discard',
          name: 'simple2 test discard',
        });
      });
    });

    describe('group match tracking', function () {
      const match_positive: any = {
        node: '192.168.0.1',
      };

      const simple22_positive: any = {
        node: 'bnode22',
      };

      it('group selector only', function () {
        const returned_ev = the_rules.run(match_positive, {
          tracking_matches: true,
        });

        // console.log "tracked [2]", inspect returned_ev.matches, false, 4
        expect(returned_ev.matches.group).to.be.an('array').that.is.not.empty;
        expect(returned_ev.matches.group).to.be.an('array');
      });

      it('group selector', function () {
        const returned_ev = the_rules.run(simple22_positive, {
          tracking_matches: true,
        });

        // console.log "tracked [2]", inspect returned_ev.matches, false, 4
        expect(returned_ev.matches.group).to.be.an('array').that.is.not.empty;
        expect(returned_ev.matches.group).to.be.an('array');
      });
    });
  });
});
