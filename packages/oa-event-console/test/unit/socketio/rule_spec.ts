//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { SocketIO } = require('../../../lib/socketio');
const config = require('../../../lib/config').get_instance();
require('../../../app/socketio/rule');

describe('Unit::EventConsole::socketio::rule', function () {
  const edited = getHandler('rules::edited');
  const save = getHandler('rules::save', 'route_return');
  const read = getHandler('rules::read');
  const groups = getHandler('rules::groups');
  const get_all_group = getHandler('rules::get_all_group_rules');
  const rule_read = getHandler('rule::read');
  const rule_delete = getHandler('rule::delete');

  let prevRules: any;
  let prevIo: any;

  beforeEach(function () {
    prevRules = config.rules;
    prevIo = SocketIO.io;
    SocketIO.io = { emit: sinon.stub() };
  });

  afterEach(function () {
    config.rules = prevRules;
    SocketIO.io = prevIo;
    sinon.restore();
  });

  describe('rules::edited', function () {
    it('echoes back the current edited flag', function (done) {
      config.rules = { set: { edited: true } };
      const socket = makeSocket();
      edited(socket, {}, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.deep.equal({ edited: true });
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('rules::save', function () {
    it('throws ValidationError when no data is supplied', function () {
      const socket = makeSocket();
      expect(() => save(socket, null)).to.throw(/No data on save/);
    });

    it('throws ValidationError when the requested type does not exist', function () {
      config.rules = { something_else: {} };
      const socket = makeSocket();
      expect(() => save(socket, { type: 'nonesuch' })).to.throw(/No type on save/);
    });

    it('saves via save_yaml_async when git is disabled', async function () {
      const saveStub = sinon.stub().resolves();
      config.rules = {
        git: false,
        server: { save_yaml_async: saveStub },
        rules_path: undefined,
      };
      config.rules_path = (t: string) => `/tmp/${t}.yml`;

      const socket = makeSocket();
      const result = await save(socket, { type: 'server' });
      expect(result).to.deep.equal({ saved: true, type: 'server' });
      expect(saveStub.calledWith('/tmp/server.yml')).to.be.true;
    });

    it('saves via save_yaml_git_async when git is enabled, passing user + push opts', async function () {
      const saveYaml = sinon.stub().resolves();
      const saveYamlGit = sinon.stub().resolves();
      config.rules = {
        git: true,
        git_push: true,
        server: {
          save_yaml_async: saveYaml,
          save_yaml_git_async: saveYamlGit,
        },
        rules_path: undefined,
      };
      config.rules_path = (t: string) => `/tmp/${t}.yml`;

      const socket = makeSocket({ userId: 'alice' });
      // Source reads socket.user() directly — provide that shape.
      socket.user = () => ({ username: 'alice', email: 'alice@example.com' });

      const result = await save(socket, { type: 'server' });

      expect(result).to.deep.equal({ saved: true, type: 'server' });
      expect(saveYaml.called, 'save_yaml_async should not be called when git=true').to.be.false;
      expect(saveYamlGit.calledOnce).to.be.true;
      const [path, opts] = saveYamlGit.firstCall.args;
      expect(path).to.equal('/tmp/server.yml');
      expect(opts).to.deep.equal({
        user_name: 'alice',
        user_email: 'alice@example.com',
        git_push: true,
      });
    });
  });

  describe('rules::read', function () {
    it('returns the global ruleset when no group is supplied', function (done) {
      const globals = { rules: [{ id: 1 }] };
      config.rules = { set: { globals } };
      const socket = makeSocket();
      read(socket, {}, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.equal(globals);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('passes a ValidationError-like string back when the group is unknown', function (done) {
      config.rules = { set: { globals: {}, has_group: () => null } };
      const socket = makeSocket();
      read(socket, { group: 'nope' }, function (errStr: any) {
        try {
          expect(errStr).to.match(/ValidationError|No group/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('rules::groups', function () {
    it('returns the keys of config.rules.set.groups.store', function (done) {
      config.rules = { set: { groups: { store: { web: {}, db: {} } } } };
      const socket = makeSocket();
      groups(socket, {}, function (err: any, names: any) {
        try {
          expect(err).to.equal(null);
          expect(names).to.have.members(['web', 'db']);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('rules::get_all_group_rules', function () {
    it('returns config.rules.set.groups as-is', function (done) {
      const groupsObj = { web: { rules: [] } };
      config.rules = { set: { groups: groupsObj } };
      const socket = makeSocket();
      get_all_group(socket, {}, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.equal(groupsObj);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  // rule_set_lookup() accesses globals.rules.length for debug logging, so
  // every globals object we stub here carries a `rules` array.
  function makeGlobals(extra: any = {}) {
    const g: any = { rules: [], length: () => 0, ...extra };
    return g;
  }

  describe('rule::read', function () {
    it('returns the rule at the supplied index of the global ruleset', function (done) {
      const globals: any = {
        rules: [{ id: 'a' }, { id: 'b' }],
        0: { id: 'a' },
        1: { id: 'b' },
        length: () => 2,
      };
      config.rules = { set: { globals } };

      const socket = makeSocket();
      rule_read(socket, { index: 0 }, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload.data).to.deep.equal({ id: 'a' });
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('passes a ValidationError-like string when index is missing', function (done) {
      config.rules = { set: { globals: makeGlobals({ length: () => 1 }) } };
      const socket = makeSocket();
      rule_read(socket, {}, function (errStr: any) {
        try {
          expect(errStr).to.match(/ValidationError|index/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('passes a ValidationError-like string when index is non-numeric', function (done) {
      config.rules = { set: { globals: makeGlobals({ length: () => 1 }) } };
      const socket = makeSocket();
      rule_read(socket, { index: 'not-a-number' }, function (errStr: any) {
        try {
          expect(errStr).to.match(/ValidationError|number/);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('rule::delete', function () {
    it('deletes the rule at the given index and emits rules::edited', function (done) {
      const delete_index = sinon.stub();
      const set_edited = sinon.stub();
      config.rules = {
        set: {
          globals: makeGlobals({ length: () => 2, delete_index }),
          set_edited_flag: set_edited,
        },
      };

      const socket = makeSocket();
      rule_delete(socket, { index: 1 }, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload.status).to.equal('success');
          expect(delete_index.calledWith(1)).to.be.true;
          expect(set_edited.called).to.be.true;
          expect(SocketIO.io.emit.calledWith('rules::edited')).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
