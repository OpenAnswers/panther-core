//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:unit:agent:http');

const Errors = require('oa-errors');

const { expect } = require('../mocha_helpers');

const { AgentHttp } = require('../../lib/agent_http');
const { AgentGeneric } = require('../../lib/agent_generic');
const { Agent } = require('../../lib/agent');
const { Agents } = require('../../lib/agents');

describe('AgentHttp', function () {
  describe('class', function () {
    it('is registered on Agents.types.http', function () {
      expect(Agents.types.http).to.equal(AgentHttp);
    });

    it('extends AgentGeneric (and Agent)', function () {
      const a = new AgentHttp();
      expect(a).to.be.an.instanceof(AgentHttp);
      expect(a).to.be.an.instanceof(AgentGeneric);
      expect(a).to.be.an.instanceof(Agent);
    });

    it('has the default identifier set on the class', function () {
      expect(AgentHttp.identifier).to.equal('{node}:{severity}:{summary}');
    });
  });

  describe('constructor', function () {
    it('sets _type to "http" and _name to "HTTP"', function () {
      const a = new AgentHttp();
      expect(a._type).to.equal('http');
      expect(a._name).to.equal('HTTP');
    });

    it('accepts an options object', function () {
      const a = new AgentHttp({});
      expect(a).to.be.an.instanceof(AgentHttp);
    });

    it('defaults options to an empty object when none provided', function () {
      const a = new AgentHttp();
      expect(a._type).to.equal('http');
    });
  });

  describe('generate', function () {
    it('returns an AgentHttp instance from a yaml definition', function () {
      const a = AgentHttp.generate({});
      expect(a).to.be.an.instanceof(AgentHttp);
      expect(a._type).to.equal('http');
    });

    it('applies the default identifier on the generated instance', function () {
      const a = AgentHttp.generate({});
      expect(a.identifier()).to.equal('{node}:{severity}:{summary}');
    });

    it('throws ValidationError when yaml_def is null', function () {
      expect(() => AgentHttp.generate(null)).to.throw(Errors.ValidationError, /No definition/);
    });

    it('throws ValidationError when yaml_def is undefined', function () {
      expect(() => AgentHttp.generate(undefined)).to.throw(Errors.ValidationError, /No definition/);
    });
  });

  describe('via Agents.generate factory', function () {
    it('builds an AgentHttp from { type: "http", ... }', function () {
      const a = Agents.generate({ type: 'http' });
      expect(a).to.be.an.instanceof(AgentHttp);
    });
  });
});
