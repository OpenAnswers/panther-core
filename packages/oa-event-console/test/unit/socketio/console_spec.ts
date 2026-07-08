//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const mongoose = require('mongoose');
const { Filters } = require('../../../app/model/filters');
const { Severity } = require('../../../app/model/severity');
const config = require('../../../lib/config').get_instance();
require('../../../app/socketio/console');

describe('Unit::EventConsole::socketio::console', function () {
  useMongo(this);

  const set_view = getHandler('console::set_view');
  const set_group = getHandler('console::set_group');
  const set_severity = getHandler('console::set_severity');

  let prevRules: any;

  beforeEach(function () {
    prevRules = config.rules;
  });

  afterEach(function () {
    config.rules = prevRules;
    sinon.restore();
  });

  describe('console::set_view', function () {
    it('returns false when id does not parse to a valid ObjectId', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const result = set_view(socket, { id: 'not-an-objectid' }, () => {});
      expect(result).to.equal(false);
    });

    it('sets empty filter and calls back when no filter is found for the user', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'event_filter');

      const id = new mongoose.Types.ObjectId().toString();
      const cb = sinon.spy();
      await set_view(socket, { id }, cb);

      expect(spy.calledWith({})).to.be.true;
      expect(cb.calledOnce).to.be.true;
    });

    it('sets the filter from the stored doc for the authed user', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const doc = await Filters.create({ user: 'alice', name: 'stored', f: { severity: 4 } });

      const spy = sinon.spy(socket.ev, 'event_filter');
      const cb = sinon.spy();
      await set_view(socket, { id: doc._id.toString() }, cb);

      expect(spy.calledWith({ severity: 4 })).to.be.true;
      expect(cb.calledOnce).to.be.true;
    });

    it('falls back to empty filter when the stored doc has an array filter', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const doc = await Filters.create({ user: 'alice', name: 'stored', f: [{ bad: true }] as any });

      const spy = sinon.spy(socket.ev, 'event_filter');
      const cb = sinon.spy();
      await set_view(socket, { id: doc._id.toString() }, cb);

      expect(spy.calledWith({})).to.be.true;
      expect(cb.calledOnce).to.be.true;
    });
  });

  describe('console::set_group', function () {
    it('sets the group on the socket when the group is known to the ruleset', function (done) {
      config.rules = { set: { groups: { has_group: (g: string) => g === 'web' } } };

      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'event_group');

      set_group(socket, { group: 'web' }, function (err: any, data: any) {
        try {
          expect(err).to.equal(null);
          expect(data).to.deep.equal({ group: 'web' });
          expect(spy.calledWith('web')).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('defaults to "All" when the group is unknown', function (done) {
      config.rules = { set: { groups: { has_group: () => false } } };

      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'event_group');

      set_group(socket, { group: 'unknown' }, function () {
        try {
          expect(spy.calledWith('All')).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('passes through "No Group" as the group name', function (done) {
      config.rules = { set: { groups: { has_group: () => false } } };

      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'event_group');

      set_group(socket, { group: 'No Group' }, function () {
        try {
          expect(spy.calledWith('No Group')).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('console::set_severity', function () {
    it('shortcuts to "All" without a mongo query', function (done) {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'event_severity');

      set_severity(socket, { severity: 'All' }, function () {
        try {
          expect(spy.calledWith('All')).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('looks up severity by numeric value and sets it on the socket', async function () {
      await Severity.create({ value: 4, label: 'Minor' });

      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'event_severity');

      await new Promise<void>((resolve, reject) => {
        set_severity(socket, { severity: '4' }, function () {
          try {
            expect(spy.calledWith(4)).to.be.true;
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it('looks up severity by label and sets the stored numeric value', async function () {
      await Severity.create({ value: 3, label: 'Major' });

      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'event_severity');

      await new Promise<void>((resolve, reject) => {
        set_severity(socket, { severity: 'Major' }, function () {
          try {
            expect(spy.calledWith(3)).to.be.true;
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it('falls back to "All" when no matching severity is found', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'event_severity');

      await new Promise<void>((resolve, reject) => {
        set_severity(socket, { severity: 'Nope' }, function () {
          try {
            expect(spy.calledWith('All')).to.be.true;
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });
});
