//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const { expect } = require('../mocha_helpers');

// state.js exports a singleton. Re-requiring doesn't give a fresh instance,
// so tests re-init on each run and assert against the post-init state.
const state = require('../../common/state');

describe('Unit::EventMonitors::state', function () {
  beforeEach(function () {
    state.init({ agent_type: 'syslogd', node: 'host-a' });
  });

  describe('init', function () {
    it('stores agent_type and node, and composes a base_id', function () {
      expect(state.agent_type).to.equal('syslogd');
      expect(state.node).to.equal('host-a');
      expect(state.base_id).to.equal('State:syslogd:host-a:');
    });

    it('falls back to defaults when params are missing keys', function () {
      state.init({});
      expect(state.agent_type).to.equal('unknown_agent');
      expect(state.node).to.equal('unknown_host');
      expect(state.base_id).to.equal('State:unknown_agent:unknown_host:');
    });

    it('returns false and does not mutate when params is not an object', function () {
      const before = { agent_type: state.agent_type, node: state.node, base_id: state.base_id };
      const ret = state.init('not-an-object');
      expect(ret).to.equal(false);
      expect(state.agent_type).to.equal(before.agent_type);
      expect(state.node).to.equal(before.node);
      expect(state.base_id).to.equal(before.base_id);
    });
  });

  describe('build_alert', function () {
    it('produces the common PantherState alert shape', function () {
      const a = state.build_alert();
      expect(a.identifier).to.equal('State:syslogd:host-a:');
      expect(a.alert_group).to.equal('PantherState');
      expect(a.agent).to.equal('syslogd');
      expect(a.node).to.equal('host-a');
      expect(a.severity).to.equal(1);
      expect(a.last_occurrence).to.be.a('date');
    });

    it('returns a new object on each call (no shared state)', function () {
      const a = state.build_alert();
      const b = state.build_alert();
      expect(a).to.not.equal(b);
      a.identifier = 'mutated';
      expect(b.identifier).to.equal('State:syslogd:host-a:');
    });
  });

  describe('lifecycle transitions', function () {
    it('established() produces an up alert with Established suffix', function () {
      const a = state.established();
      expect(a.identifier).to.equal('State:syslogd:host-a:Established');
      expect(a.type).to.equal('up');
      expect(a.summary).to.equal('Agent syslogd established connection');
      expect(a.severity).to.equal(1);
    });

    it('start() produces an up alert with Start suffix', function () {
      const a = state.start();
      expect(a.identifier).to.equal('State:syslogd:host-a:Start');
      expect(a.type).to.equal('up');
      expect(a.summary).to.equal('Agent syslogd has been started');
    });

    it('amalive() produces an up alert with Alive suffix at severity 1', function () {
      const a = state.amalive();
      expect(a.identifier).to.equal('State:syslogd:host-a:Alive');
      expect(a.type).to.equal('up');
      expect(a.severity).to.equal(1);
    });

    it('stop() produces a down alert with Stopping suffix at severity 3', function () {
      const a = state.stop();
      expect(a.identifier).to.equal('State:syslogd:host-a:Stopping');
      expect(a.type).to.equal('down');
      expect(a.severity).to.equal(3);
      expect(a.summary).to.equal('Agent syslogd is stopping');
    });

    it('stop(msg) overrides the default summary', function () {
      const a = state.stop('graceful shutdown');
      expect(a.summary).to.equal('graceful shutdown');
    });

    it('rules_reloaded() produces an alert with rules_loaded suffix at severity 1', function () {
      const a = state.rules_reloaded();
      expect(a.identifier).to.equal('State:syslogd:host-a:rules_loaded');
      expect(a.severity).to.equal(1);
      expect(a.summary).to.equal('Agent syslogd received a SIGHUP');
    });

    it('rules_reloaded(msg) overrides the default summary', function () {
      const a = state.rules_reloaded('reloaded from disk');
      expect(a.summary).to.equal('reloaded from disk');
    });
  });
});
