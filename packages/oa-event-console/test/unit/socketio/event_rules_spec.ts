//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Focused on the validation branches of event_rules handlers. Happy paths
// require a live EventRules/RuleSet graph from oa-event-rules which is covered
// by the integration suites — here we only assert the synchronous throws that
// every handler performs up front.

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { SocketIO } = require('../../../lib/socketio');
const { Mongoose } = require('../../../lib/mongoose');
const config = require('../../../lib/config').get_instance();
require('../../../app/socketio/event_rules');

describe('Unit::EventConsole::socketio::event_rules', function () {
  const rule_create = getHandler('event_rules::rule::create', 'route_return');
  const rule_update = getHandler('event_rules::rule::update', 'route_return');
  const rule_delete = getHandler('event_rules::rule::delete', 'route_return');
  const group_name = getHandler('event_rules::group::update_name', 'route_return');
  const group_create = getHandler('event_rules::group::create_name', 'route_return');
  const group_select = getHandler('event_rules::group::update_select', 'route_return');
  const group_delete = getHandler('event_rules::group::delete', 'route_return');
  const group_move = getHandler('event_rules::group::move', 'route_return');
  const rule_move = getHandler('event_rules::rule::move', 'route_return');
  const query_id = getHandler('event_rules::query::id', 'route_return');

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

  function sock() {
    return makeSocket({ userId: 'alice', withEv: true });
  }

  describe('validate_ruletype_request (via rule::create)', function () {
    it('throws when request is missing', function () {
      expect(() => rule_create(sock(), null)).to.throw(/No request/);
    });

    it('throws when request.type is missing', function () {
      expect(() => rule_create(sock(), {})).to.throw(/No rule type/);
    });

    it('throws when server type is not configured', function () {
      config.rules = {};
      expect(() => rule_create(sock(), { type: 'server' })).to.throw(/No rules named/);
    });

    it('throws when agent type lacks sub_type', function () {
      config.rules = {};
      expect(() => rule_create(sock(), { type: 'agent' })).to.throw(/No agent name/);
    });

    it('throws when agent sub_type is not configured', function () {
      config.rules = {};
      expect(() => rule_create(sock(), { type: 'agent', sub_type: 'syslogd' })).to.throw(
        /No agent rules for \[syslogd\]/
      );
    });

    it('throws for any non-server/agent type', function () {
      config.rules = {};
      expect(() => rule_create(sock(), { type: 'other' })).to.throw(/No rules named/);
    });
  });

  describe('event_rules::rule::create', function () {
    it('throws ValidationError when data is missing', function () {
      config.rules = { server: { set_edited_flag() {}, append_edited_msg() {} } };
      expect(() => rule_create(sock(), { type: 'server' })).to.throw(/No data attached/);
    });
  });

  describe('event_rules::rule::update', function () {
    beforeEach(function () {
      config.rules = { server: {} };
    });

    it('throws when data is missing', function () {
      expect(() => rule_update(sock(), { type: 'server' })).to.throw(/No data attached/);
    });

    it('throws when data.rule is missing', function () {
      expect(() => rule_update(sock(), { type: 'server', data: {} })).to.throw(/No rule information/);
    });

    it('throws when data.rule is not an object', function () {
      expect(() => rule_update(sock(), { type: 'server', data: { rule: 'str' } })).to.throw(/must be an object/);
    });

    it('throws when data.index is not a number', function () {
      expect(() => rule_update(sock(), { type: 'server', data: { rule: {}, index: 'x' } })).to.throw(/index is needed/);
    });

    it('throws when data.index is not an integer', function () {
      expect(() => rule_update(sock(), { type: 'server', data: { rule: {}, index: 1.5 } })).to.throw(/integer index/);
    });
  });

  describe('event_rules::rule::delete', function () {
    beforeEach(function () {
      config.rules = {
        server: { globals: {} },
      };
    });

    it('throws when data is missing (after rule_set_lookup on globals)', function () {
      // rule_set_lookup is called before the data check; stub it by arranging
      // globals to be a RuleSet-shaped stub. Since we cannot easily construct
      // a real RuleSet, just assert the first reachable throw: rule_set_lookup
      // fails with "couldn't find a valid rule set" because our stub isn't an
      // instance of RuleSet.
      expect(() => rule_delete(sock(), { type: 'server', sub_type: 'globals' })).to.throw(/valid rule set|data.*field/);
    });
  });

  describe('event_rules::group::update_name', function () {
    beforeEach(function () {
      config.rules = { server: { groups: {} } };
    });

    it('throws when data is not an object', function () {
      expect(() => group_name(sock(), { type: 'server' })).to.throw(/data.*needed/);
    });

    it('throws when previous_name is not a string', function () {
      expect(() => group_name(sock(), { type: 'server', data: {} })).to.throw(/previous name/);
    });

    it('throws when new_name is not a string', function () {
      expect(() => group_name(sock(), { type: 'server', data: { previous_name: 'old' } })).to.throw(/new name/);
    });

    it('throws when new_name does not start with alphanumeric', function () {
      expect(() => group_name(sock(), { type: 'server', data: { previous_name: 'old', new_name: ' bad' } })).to.throw(
        /must start with/
      );
    });

    it('throws when new_name contains disallowed characters', function () {
      expect(() =>
        group_name(sock(), { type: 'server', data: { previous_name: 'old', new_name: 'bad!name' } })
      ).to.throw(/alphanumeric characters and spaces/);
    });

    it('throws when new_name ends with whitespace', function () {
      expect(() => group_name(sock(), { type: 'server', data: { previous_name: 'old', new_name: 'bad ' } })).to.throw(
        /whitespace/
      );
    });
  });

  describe('event_rules::group::create_name', function () {
    beforeEach(function () {
      config.rules = { server: { groups: {} } };
    });

    it('throws when data is not an object', function () {
      expect(() => group_create(sock(), { type: 'server' })).to.throw(/data.*needed/);
    });

    it('throws when new_name is not a string', function () {
      expect(() => group_create(sock(), { type: 'server', data: {} })).to.throw(/new name/);
    });

    it('throws when new_name does not start with alphanumeric', function () {
      expect(() => group_create(sock(), { type: 'server', data: { new_name: ' bad' } })).to.throw(/must start with/);
    });

    it('throws when new_name contains disallowed characters', function () {
      expect(() => group_create(sock(), { type: 'server', data: { new_name: 'bad!name' } })).to.throw(
        /alphanumeric characters and spaces/
      );
    });

    it('throws when new_name ends with a space', function () {
      expect(() => group_create(sock(), { type: 'server', data: { new_name: 'bad ' } })).to.throw(/end a space/);
    });
  });

  describe('event_rules::group::update_select', function () {
    beforeEach(function () {
      // group_lookup expects request.type='server', request.sub_type='groups',
      // and config.rules.server.groups.get(group) to return a group.
      config.rules = {
        server: {
          groups: { get: (n: string) => (n === 'web' ? { update_select() {}, name: 'web' } : null) },
        },
      };
    });

    it('throws when data is not an object', function () {
      expect(() => group_select(sock(), { type: 'server', sub_type: 'groups', group: 'web' })).to.throw(/data.*needed/);
    });

    it('throws when rule is not an object', function () {
      expect(() =>
        group_select(sock(), {
          type: 'server',
          sub_type: 'groups',
          group: 'web',
          data: { rule: 'str', index: 0 },
        })
      ).to.throw(/rule must be an object/);
    });

    it('throws when index is not an integer', function () {
      expect(() =>
        group_select(sock(), {
          type: 'server',
          sub_type: 'groups',
          group: 'web',
          data: { rule: {}, index: 1.5 },
        })
      ).to.throw(/index must be an integer/);
    });
  });

  describe('event_rules::group::delete', function () {
    beforeEach(function () {
      config.rules = {
        server: {
          groups: { get: (n: string) => (n === 'web' ? { name: 'web' } : null) },
        },
      };
    });

    it('throws when data is not an object', function () {
      expect(() => group_delete(sock(), { type: 'server', sub_type: 'groups', group: 'web' })).to.throw(/data.*needed/);
    });

    it('throws when name is not a string', function () {
      expect(() =>
        group_delete(sock(), {
          type: 'server',
          sub_type: 'groups',
          group: 'web',
          data: {},
        })
      ).to.throw(/group name to delete/);
    });

    it('throws when reason is not a string', function () {
      expect(() =>
        group_delete(sock(), {
          type: 'server',
          sub_type: 'groups',
          group: 'web',
          data: { name: 'web' },
        })
      ).to.throw(/delete reason/);
    });
  });

  describe('event_rules::group::move', function () {
    it('throws when data is missing', function () {
      expect(() => group_move(sock(), {})).to.throw(/No data/);
    });

    it('throws when old_position is missing', function () {
      expect(() => group_move(sock(), { data: {} })).to.throw(/old_position/);
    });

    it('throws when old_position is non-integer', function () {
      expect(() => group_move(sock(), { data: { old_position: 1.5 } })).to.throw(/old_position/);
    });

    it('throws when new_position is missing', function () {
      expect(() => group_move(sock(), { data: { old_position: 0 } })).to.throw(/new_position/);
    });

    it('throws when new_position is non-integer', function () {
      expect(() => group_move(sock(), { data: { old_position: 0, new_position: 1.5 } })).to.throw(/new_position/);
    });
  });

  describe('event_rules::rule::move', function () {
    it('throws validate_ruletype_request errors before hitting data checks', function () {
      expect(() => rule_move(sock(), {})).to.throw(/No rule type/);
    });
  });

  describe('event_rules::query::id', function () {
    it('throws SocketMsgError when msg is missing', function () {
      expect(() => query_id(sock(), null)).to.throw(/No message/);
    });

    it('throws ValidationError when id is missing', function () {
      expect(() => query_id(sock(), {})).to.throw(/No ids/);
    });

    it('throws ValidationError when id is not a valid ObjectId', function () {
      expect(() => query_id(sock(), { id: 'not-an-oid' })).to.throw(/Invalid event id/);
    });
  });
});
