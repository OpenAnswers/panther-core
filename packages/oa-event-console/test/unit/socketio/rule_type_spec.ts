//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const config = require('../../../lib/config').get_instance();
require('../../../app/socketio/rule-type');

describe('Unit::EventConsole::socketio::rule-type', function () {
  const read = getHandler('rules::type::read');
  const save = getHandler('rules::type::save');
  const update = getHandler('rules::type::update');

  let prevRules: any;

  beforeEach(function () {
    prevRules = config.rules;
  });

  afterEach(function () {
    sinon.restore();
    config.rules = prevRules;
  });

  describe('rules::type::read', function () {
    it('invokes callback with the agent section for the configured type', function (done) {
      const agent = { kind: 'syslogd', settings: { port: 514 } };
      config.rules = { syslogd: { agent } };

      const socket = makeSocket();
      read(socket, { type: 'syslogd' }, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.equal(agent);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('passes a ValidationError-like string to the callback when data is missing', function (done) {
      config.rules = {};
      const socket = makeSocket();
      read(socket, null, function (errStr: any, payload: any) {
        try {
          expect(errStr)
            .to.be.a('string')
            .that.matches(/ValidationError|No data/);
          expect(payload).to.be.undefined;
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('passes a validation error to the callback when type is missing', function (done) {
      config.rules = {};
      const socket = makeSocket();
      read(socket, {}, function (errStr: any) {
        try {
          expect(errStr).to.match(/type/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('rules::type::save', function () {
    it('saves the in-memory ruleset for the given type and calls back with { saved: true }', function (done) {
      const saveStub = sinon.stub().resolves();
      config.rules = {
        syslogd: { save_yaml_async: saveStub },
        syslogd_path: '/tmp/syslogd.rules.yml',
      };

      const socket = makeSocket({ userId: 'alice', withEv: true });
      save(socket, { type: 'syslogd' }, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.deep.equal({ saved: true });
          expect(saveStub.calledWith('/tmp/syslogd.rules.yml')).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('rules::type::update', function () {
    it('passes a validation error to the callback when data is missing', function (done) {
      config.rules = {};
      const socket = makeSocket();
      update(socket, null, function (errStr: any) {
        try {
          expect(errStr).to.match(/ValidationError|No data/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('passes a validation error when agent is missing', function (done) {
      config.rules = {};
      const socket = makeSocket();
      update(socket, { type: 'syslogd' }, function (errStr: any) {
        try {
          expect(errStr).to.match(/agent/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
