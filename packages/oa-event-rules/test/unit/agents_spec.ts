//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:agents');
const { expect } = require('../mocha_helpers');

// npm
const path = require('path');

// oa

// Test setup
const { Agents } = require('../../src');
const { Event } = require('../../src');

// Onto the tests

// Test event setup
const test_messages: any = {
  simple1: {
    severity: 3,
    node: 'thahost',
    summary: 'themessage\n',
    tag: 'thedaemon',
  },
};

describe('Agents', function () {
  it('has a types object', function () {
    expect(Agents.types).to.be.an('object');
  });

  it('has all the types', function () {
    expect(Agents.types.graylog).to.be.an('function');
    expect(Agents.types.syslogd).to.be.an('function');
    expect(Agents.types.generic).to.be.an('function');
    expect(Agents.types.http).to.be.an('function');
  });

  describe('Generates', function () {
    // Use the same rules instance for all the tests
    let the_agent: any = null;

    before(function () {
      // Load the rules from the yaml
      the_agent = Agents.generate({
        type: 'generic',
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
  });

  describe('generate validation', function () {
    it('throws when called with no yaml_def', function () {
      expect(() => Agents.generate(undefined)).to.throw(/No agent definition/);
    });

    it('falls back to the generic agent when type is missing', function () {
      const a = Agents.generate({});
      expect(a).to.be.ok;
      expect(a._type).to.equal('generic');
    });

    it('throws on an unknown agent type', function () {
      expect(() => Agents.generate({ type: 'no-such-agent' })).to.throw(/No agent type/);
    });
  });
});
