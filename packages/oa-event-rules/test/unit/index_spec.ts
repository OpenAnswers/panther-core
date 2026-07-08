//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:rules:select');

const { expect } = require('../mocha_helpers');

const {
  Select,
  SelectAll,
  SelectMatch,
  SelectEquals,
  SelectFieldExists,
  SelectFieldMissing,
  SelectLessThan,
  SelectGreaterThan,

  Action,

  Agents,
  Agent,
  AgentGeneric,
  AgentHttp,
  AgentGraylog,
  AgentSyslogd,
} = require('../../lib/index');

describe('index.js to rules', function () {
  it('should have a Select', function () {
    expect(Select).to.be.an.instanceof(Object);
  });

  it('should have an Action', function () {
    expect(Action).to.be.an.instanceof(Object);
  });

  it('should have an Agent', function () {
    expect(Agents).to.be.an.instanceof(Object);
  });

  it('should have an Agents', function () {
    expect(Agent).to.be.an.instanceof(Object);
  });

  it('should have an AgentGeneric', function () {
    expect(AgentGeneric).to.be.an.instanceof(Object);
  });

  it('should have a AgentGraylog', function () {
    expect(AgentGraylog).to.be.an.instanceof(Object);
  });

  it('should have a AgentSyslogd', function () {
    expect(AgentSyslogd).to.be.an.instanceof(Object);
  });

  it('should have a AgentHttp', function () {
    expect(AgentHttp).to.be.an.instanceof(Object);
  });
});
