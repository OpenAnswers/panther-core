//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const mocha = require('mocha');
const expect = require('chai').expect;
const sinon = require('sinon');
const { _ } = require('oa-helpers');
const Promise = require('bluebird');
const fs = require('node:fs');
const { stat, mkdir } = require('node:fs/promises');

const debug = require('debug')('oa:test:helpers');

// Set 'test' so logging goes away
process.env.NODE_ENV = 'test';

// I guess this is essentially a mock for a RuleSet
const rules_runner = function (ev: any, rules: any[]) {
  let ev_processed = ev;
  for (const rule of rules) {
    ev_processed = rule.run(ev_processed);
  }
  return ev_processed;
};

const mkdir_if_missing_Async = function (dir: string) {
  return stat(dir)
    .then(function (res: any) {
      debug('stat dir res', dir, res);
      return 'exists';
    })
    .catch(function (error: any) {
      if (error.code === 'ENOENT') {
        debug('MKDIRing');
        return mkdir(dir);
      }
    });
};

const git_remote_add_Async = function (repo: any, name: string, url: string) {
  return repo.remote_addAsync(name, url).then(repo.remote_fetch(name));
};

const copyFileAsync = function (path: string, new_path: string) {
  return new Promise(function (resolve: Function, reject: Function) {
    const r = fs.createReadStream(path);
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

const escape_shell = function (cmd: string) {
  return `${cmd.replace(/(["\s'$`\\])/g, '\\$1')}`;
};

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

module.exports = {
  mocha,
  expect,
  sinon,
  debug,
  _,
  event_samples,
  rules_runner,
  fs,
  Promise,
  git_remote_add_Async,
  mkdir_if_missing_Async,
  copyFileAsync,
  escape_shell,
};
