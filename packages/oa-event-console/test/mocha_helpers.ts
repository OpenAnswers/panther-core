//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Mocha Helpers

// Includes all the helpers uses across many tests

const debug = require('debug')('oa:test:helpers');

const fs = require('fs');

const Promise = require('bluebird');

(global as any).Promise = Promise;
(global as any).mocha = require('mocha');
(global as any).chai = require('chai');
(global as any).expect = (global as any).chai.expect;
(global as any).sinon = require('sinon');
(global as any)._ = require('lodash');

const supertest = require('supertest');

const expect = (global as any).chai.expect;
const _ = require('lodash');

// Force test env — the repo's .env sets NODE_ENV=production for runtime,
// which bleeds into test runs via yarn's dotenv loader and breaks modules
// that cache on production (e.g. lib/assets manifest cache).
process.env.NODE_ENV = 'test';

Promise.config({
  longStackTraces: true,
  warnings: true,
});

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

// Promise to copy a file (with streams)
const copy_file_Async = function (filePath: string, new_path: string) {
  return new Promise(function (resolve: Function, reject: Function) {
    const r = fs.createReadStream(filePath);
    const w = fs.createWriteStream(new_path);
    r.pipe(w);

    w.on('finish', function () {
      resolve(true);
    });

    w.on('error', function (error: any) {
      reject(error);
    });
  });
};

// Copy the static fixture rules files into place for tests
const copy_rules_Async = function () {
  const copies = {
    server: copy_file_Async('test/fixture/rules/server.rules.yml.fixture', 'test/fixture/rules/server.rules.yml'),
    syslogd: copy_file_Async('test/fixture/rules/syslogd.rules.yml.fixture', 'test/fixture/rules/syslogd.rules.yml'),
    graylog: copy_file_Async('test/fixture/rules/graylog.rules.yml.fixture', 'test/fixture/rules/graylog.rules.yml'),
    http: copy_file_Async('test/fixture/rules/http.rules.yml.fixture', 'test/fixture/rules/http.rules.yml'),
  };
  return Promise.props(copies);
};

module.exports = {
  _,
  mocha: (global as any).mocha,
  expect,
  sinon: (global as any).sinon,
  debug,
  event_samples,
  rules_runner,
  supertest,
  copy_rules_Async,
};
