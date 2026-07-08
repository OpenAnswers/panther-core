//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Happy-path round-trips for the event_rules socket handlers — read, edited,
// discard_changes plus rule/group CRUD. The unit socket spec covers the
// validation throws only; these exercise the real rule engine against the
// server.rules.yml.fixture content. Ported from test/func/event_rules_spec.ts.

/* eslint-disable @typescript-eslint/no-var-requires */
const { expect, _ } = require('../mocha_helpers');
const { getConsoleApp } = require('./_helpers/console_app');
const { ConsoleClient } = require('./_helpers/console_client');

// Socket ack errors arrive as serialized ValidationError objects; wrapping them
// in `new Error(err)` stringifies to "[object Object]" which tells us nothing.
// Surface whatever structure they have instead.
function toErr(err: any): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error(err?.message || JSON.stringify(err));
}

describe('Integration::Socket::event_rules', function () {
  this.timeout(30_000);

  let app: any;
  let client: any;
  let sessionId: string;
  let socket: any;
  let config: any;

  before(async function () {
    app = await getConsoleApp();
    client = new ConsoleClient({ baseUrl: app.baseUrl, secret: app.secret });
    const login = await client.login('test', 'test');
    expect(login.status).to.equal(302);
    sessionId = await client.sessionId();
    config = require('../../lib/config').get_instance();
  });

  beforeEach(function (done) {
    socket = client.openSocket({ sessionId });
    socket.once('connect', () => done());
    socket.once('connect_error', (err: any) => done(err));
  });

  afterEach(function () {
    if (socket && socket.connected) socket.disconnect();
    socket = null;
  });

  describe('globals', function () {
    const default_msg = { type: 'server', sub_type: 'globals' };

    it('event_rules::read returns globals, groups, hash, metadata, schedules', function (done) {
      socket.emit('event_rules::read', default_msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.have.keys('globals', 'groups', 'hash', 'metadata', 'schedules');
        expect(res.globals).to.have.keys('rules');
        expect(res.globals.rules).to.be.an('array');
        done();
      });
    });

    it('event_rules::edited reports unedited on a fresh fixture', function (done) {
      socket.emit('event_rules::edited', default_msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.have.keys('edited');
        expect(res.edited).to.equal(false);
        done();
      });
    });

    it('event_rules::rule::update replaces the rule at index 0 in-memory', function (done) {
      const data = {
        index: 0,
        rule: { name: 'update', field_exists: 'update', set: { update: 'update' } },
      };
      const msg = _.defaults({ data }, default_msg);
      socket.emit('event_rules::rule::update', msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys('message', 'status', 'sub_type', 'type');
        expect(res.status).to.equal('success');
        // The stored yaml has a generated `uuid` field the caller didn't send;
        // assert our fields landed, don't require exact equality. `deep.include`
        // compares nested values structurally — plain `.include` is reference
        // equality for object values like `set`.
        const stored = config.rules.server.globals.rules[0].yaml;
        expect(stored).to.deep.include(data.rule);
        done();
      });
    });

    it('event_rules::discard_changes restores the globals rule set to file defaults', function (done) {
      socket.emit('event_rules::discard_changes', default_msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys('message', 'status', 'sub_type', 'type');
        expect(res.status).to.equal('success');
        expect(config.rules.server.globals.rules[0].yaml.name).to.eql('1 Testing Rule');
        done();
      });
    });

    it('event_rules::rule::create appends a new global rule', function (done) {
      const data = {
        rule: { name: 'test', less_than: { severity: 4 }, discard: true },
      };
      const msg = _.defaults({ data }, default_msg);
      socket.emit('event_rules::rule::create', msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys('status', 'message', 'type', 'sub_type');
        expect(res.status).to.equal('success');
        done();
      });
    });

    it('event_rules::rule::delete removes the rule at index 0', function (done) {
      // rule::delete now requires `reason: string` in data (schema change
      // post-func; validated by the handler).
      const msg = _.defaults({ data: { index: 0, reason: 'int test delete' } }, default_msg);
      socket.emit('event_rules::rule::delete', msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys('index', 'status');
        expect(res.status).to.equal('success');
        expect(res.index).to.equal(0);
        done();
      });
    });

    it('event_rules::rule::update at index 4 succeeds after the earlier mutations', function (done) {
      const data = {
        index: 4,
        rule: { name: 'test4', less_than: { severity: 44 }, discard: true },
      };
      const msg = _.defaults({ data }, default_msg);
      socket.emit('event_rules::rule::update', msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys('status');
        expect(res.status).to.equal('success');
        done();
      });
    });
  });

  describe('groups', function () {
    const default_msg = { type: 'server', sub_type: 'groups' };

    it('event_rules::read returns the expected group names from the fixture', function (done) {
      socket.emit('event_rules::read', default_msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.have.keys('globals', 'groups', 'hash', 'metadata', 'schedules');
        expect(res.groups).to.have.keys('Local', 'Security', 'TestGroup', 'TestUpdateSelect', '_order');
        done();
      });
    });

    it('event_rules::group::update_name renames TestGroup → what', function (done) {
      const data = { previous_name: 'TestGroup', new_name: 'what' };
      const msg = _.defaults({ data }, default_msg);
      socket.emit('event_rules::group::update_name', msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys(['message', 'status', 'data']);
        expect(res.status).to.equal('success');
        expect(res.data).to.have.keys('Local', 'Security', 'what', 'TestUpdateSelect', '_order');
        done();
      });
    });

    it('event_rules::group::update_select updates the select clause of a group', function (done) {
      const rule = {
        name: 'Dont pick me up',
        match: { yesyes: 'yepyep' },
        set: { nono: 'nopenope' },
      };
      const update_msg = {
        group: 'TestUpdateSelect',
        data: { index: 0, rule },
      };
      const msg = _.defaults(update_msg, default_msg);
      socket.emit('event_rules::group::update_select', msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys(['message', 'status', 'data']);
        expect(res.status).to.equal('success');
        // Response data has a generated `uuid` field alongside rules/select —
        // assert the fields we care about, allow extras.
        expect(res.data).to.contain.keys('rules', 'select');
        expect(res.data.select).to.eql({ match: { yesyes: 'yepyep' } });
        done();
      });
    });

    it('event_rules::group::delete removes the renamed group', function (done) {
      // group::delete now requires `reason: string` in data (schema change
      // post-func; validated by the handler).
      const data = { name: 'what', reason: 'int test delete' };
      const msg = _.defaults({ group: 'what', data }, default_msg);
      socket.emit('event_rules::group::delete', msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys(['message', 'status', 'data']);
        expect(res.status).to.equal('success');
        expect(res.data).to.have.keys('Local', 'Security', 'TestUpdateSelect', '_order');
        done();
      });
    });

    it('event_rules::discard_changes restores group rules to file defaults', function (done) {
      socket.emit('event_rules::discard_changes', default_msg, function (err: any, res: any) {
        if (err) return done(toErr(err));
        expect(res).to.contain.keys('message', 'status', 'sub_type', 'type');
        expect(res.status).to.equal('success');

        const groups_obj = config.rules.server.groups;
        expect(groups_obj.get('TestGroup')).to.be.ok;
        expect(groups_obj.get('what')).to.not.be.ok;
        done();
      });
    });
  });

  describe('per-agent reload_cb (app/index lines 116-117)', function () {
    // Coverage for the agent-rules reload_cb body wired up at app/index
    // start time. Triggered manually here because no integration path
    // currently invokes a rules file reload.
    const sinon = (global as any).sinon;

    it('broadcasts event_rules::reloaded with the agent name', function () {
      const { SocketIO } = require('../../lib/socketio');
      const emitStub = sinon.stub(SocketIO.io, 'emit');
      try {
        config.rules.http.reload_cb();
        expect(
          emitStub.calledWith('event_rules::reloaded', { type: 'agent', sub_type: 'http' }),
          'expected emit called with agent payload'
        ).to.equal(true);
      } finally {
        emitStub.restore();
      }
    });
  });
});
