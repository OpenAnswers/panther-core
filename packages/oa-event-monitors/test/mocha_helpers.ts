//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const mocha = require('mocha');
const expect = require('chai').expect;
const sinon = require('sinon');
const _ = require('lodash');
const supertest = require('supertest');
const nock = require('nock');

const debug = require('debug')('oa:mocha:helpers');

const event_samples = {
  simple: {
    identifier: 'qweiru42:3:simple alert summary of sev 3',
    node: 'qweiru42',
    severity: 3,
    summary: 'simple alert summary of sev 3',
  },

  middle: {
    identifier: 'azeiru34:4:middle summary sev 4',
    node: 'azeiru34',
    severity: 4,
    summary: 'middle summary sev 4',
    agent: 'sample',
  },

  complex: {
    identifier: 'rbeiru93:5:complex summary sev 5',
    node: 'rbeiru93',
    severity: 5,
    summary: 'complex summary sev 5',
    agent: 'syslog',
  },
};

// I guess this is essentially a mock for a RuleSet
const rules_runner = function (ev: any, rules: any[]) {
  let ev_processed = ev;
  for (const rule of rules) {
    ev_processed = rule.run(ev_processed);
  }
  return ev_processed;
};

module.exports = {
  mocha,
  expect,
  sinon,
  debug,
  supertest,
  event_samples,
  rules_runner,
  nock,
  _,
};
