//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:agent');
const { expect } = require('../mocha_helpers');

// npm
const path = require('path');

// oa

// Test setup
const { AgentGeneric } = require('../../lib/agent_generic');
const { Event } = require('../../lib/event');
const { RuleSet } = require('../../lib/rule_set');

// Test event setup
const test_messages = {
  simple1: {
    severity: 3,
    node: 'thahost',
    summary: 'themessage\n',
    tag: 'thedaemon',
  },

  real1: {
    severity: 2,
    node: 'host1.example.com',
    summary: 'no system signature for unsigned /usr/bin/example[96271]\n',
    daemon: 'exampled',
    daemon_pid: '94',
  },
};

// Onto the tests

describe('AgentGeneric', function () {
  it('loads rules into AgentGeneric', function () {
    const the_agent = new AgentGeneric({
      path: path.join(__dirname, 'agent_generic_sample.yml'),
    });

    expect(the_agent).to.be.an.instanceof(AgentGeneric);
  });

  describe('Loaded YAML', function () {
    // Use the same rules instance for all the tests
    let the_agent: any = null;

    const generic_event = new Event();
    generic_event.input = {
      severity: 1,
      fieldname_that_goes_lower: 'TESTSHOULDBELOWER',
      fieldname_that_goes_upper: 'testshouldbeupper',
      facility: 'wakka',
      message: 'message!!!!!!',
    };

    before(function () {
      // Load the rules from the yaml
      the_agent = new AgentGeneric({
        path: path.join(__dirname, 'agent_generic_sample.yml'),
      });
    });

    it('has a field map', function () {
      expect(the_agent.field_map()).to.be.an('object');
    });

    it('has a identifier map', function () {
      expect(the_agent.identifier()).to.be.a('string');
    });

    it('has a field_transform map', function () {
      expect(the_agent.field_transform()).to.be.a('object');
    });

    it('doesnt map a severity, passes it through', function () {
      const ev = the_agent.run(generic_event);
      expect(generic_event.get('severity')).to.equal(1);
    });

    it('maps a field', function () {
      const ev = the_agent.run(generic_event);
      expect(generic_event.get('summary')).to.equal(generic_event.message);
    });

    it('attached an identifier', function () {
      const ev = the_agent.run(generic_event);
      expect(generic_event.get('identifier')).to.equal('{node}:{severity}:{summary}');
    });

    it('transforms fields', function () {
      const ev = the_agent.run(generic_event);
      expect(generic_event.get('fieldname_that_goes_lower')).to.equal('testshouldbelower');
      expect(generic_event.get('fieldname_that_goes_upper')).to.equal('TESTSHOULDBEUPPER');
    });
  });

  describe('Generates', function () {
    // Use the same rules instance for all the tests
    let the_agent: any = null;

    before(function () {
      // Load the rules from the yaml
      the_agent = AgentGeneric.generate({
        field_map: {
          whatever: 'whatever',
        },
        field_transform: {
          a_field_name: 'to_upper_case',
        },
        identifier: '{node}:{severity}:{summary}',
        rules: [
          {
            name: 1,
            match: {
              a_field: 'testing',
            },
            discard: true,
          },
          {
            name: 2,
            equals: {
              b_field: 'exact',
            },
            set: {
              c_field: 'someothervalue',
            },
          },
        ],
      });
    });

    it('has a field map', function () {
      expect(the_agent.field_map()).to.be.a('object');
    });

    it('has a identifier map', function () {
      expect(the_agent.identifier()).to.be.a('string');
    });

    it('has a field_transform map', function () {
      expect(the_agent.field_transform()).to.be.a('object');
    });

    it('can run', function () {
      const ev = new Event();
      ev.input = test_messages.simple1;
      const new_ev = the_agent.run(ev);

      expect(new_ev.get('severity')).to.equal(3);
    });

    it('can use a input rule 1', function () {
      const ev = Event.generate({
        a_field: 'testing',
      });
      ev.input.severity = 1;
      const new_ev = the_agent.run(ev);

      expect(new_ev.discarded()).to.equal(true);
    });

    it('can use a input rule 2', function () {
      const ev = Event.generate({
        b_field: 'exact',
      });
      ev.input.severity = 1;

      const new_ev = the_agent.run(ev);

      expect(new_ev.get('c_field')).to.equal('someothervalue');
    });
  });

  describe('AgentGeneric.generate validation', function () {
    const Errors = require('oa-errors');

    it('throws ValidationError when yaml_def is null', function () {
      expect(() => AgentGeneric.generate(null)).to.throw(Errors.ValidationError, /No definition/);
    });
  });
});
