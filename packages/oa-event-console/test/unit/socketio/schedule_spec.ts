//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { SocketIO } = require('../../../lib/socketio');
const Errors = require('../../../lib/errors');
const config = require('../../../lib/config').get_instance();
require('../../../app/socketio/schedule');

describe('Unit::EventConsole::socketio::schedule', function () {
  const save = getHandler('schedules::save', 'route_return');
  const index = getHandler('schedules::index');
  const read = getHandler('schedules::read');
  const sread = getHandler('schedule::read');
  const update = getHandler('schedule::update::days', 'route_return');
  const del = getHandler('schedule::delete', 'route_return');

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

  describe('schedules::save', function () {
    it('throws ValidationError when no data is supplied', async function () {
      const socket = makeSocket();
      let threw: any;
      try {
        await save(socket, null);
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
    });

    it('calls back with empty body when data is present', function (done) {
      const socket = makeSocket();
      save(socket, {}, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.deep.equal({});
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('schedules::index', function () {
    it('returns configured schedule names', function (done) {
      config.rules = { set: { schedules: { names: () => ['a', 'b'] } } };
      const socket = makeSocket();
      index(socket, {}, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.deep.equal({ status: 'success', data: ['a', 'b'] });
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('schedules::read', function () {
    it('returns each schedule as its yaml-ready object', function (done) {
      const schedules = [{ to_yaml_obj: () => ({ name: 'a' }) }, { to_yaml_obj: () => ({ name: 'b' }) }];
      config.rules = { server: { schedules: { get_all: () => schedules } } };

      const socket = makeSocket();
      read(socket, {}, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload.data).to.deep.equal([{ name: 'a' }, { name: 'b' }]);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('schedule::read', function () {
    it('throws ValidationError when the request is missing', function () {
      const socket = makeSocket();
      expect(() => sread(socket, null, () => {})).to.throw(Errors.ValidationError);
    });

    it('throws ValidationError when the schedule name is missing', function () {
      const socket = makeSocket();
      expect(() => sread(socket, {}, () => {})).to.throw(Errors.ValidationError);
    });

    it('throws ValidationError when the schedule is not found', function () {
      config.rules = { set: { schedules: { get: () => undefined } } };
      const socket = makeSocket();
      expect(() => sread(socket, { name: 'missing' }, () => {})).to.throw(Errors.ValidationError);
    });

    it('calls back with the looked-up schedule as a yaml object', function (done) {
      const schedule = { to_yaml_obj: () => ({ name: 'biz-hours' }) };
      config.rules = { set: { schedules: { get: (n: string) => (n === 'biz-hours' ? schedule : undefined) } } };

      const socket = makeSocket();
      sread(socket, { name: 'biz-hours' }, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.deep.equal({ status: 'success', data: { name: 'biz-hours' } });
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('schedule::update::days', function () {
    it('throws ValidationError when the request fails schema validation', async function () {
      const socket = makeSocket();
      let threw: any;
      try {
        await update(socket, {});
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
    });

    it('updates dow_a and persists via save_yaml_async on the happy path', async function () {
      const schedule: any = { uuid: '11111111-1111-1111-8111-111111111111', dow_a: [] };
      const saveStub = sinon.stub().resolves({ ok: true });
      config.rules = {
        set: { schedules: { store_map: new Map([[schedule.uuid, schedule]]) } },
        server: { schedules: { add: sinon.stub() }, save_yaml_async: saveStub, path: '/tmp/rules.yml' },
      };
      // store_map needs forEach(sch) semantics — real Map gives (value, key).
      // Handler iterates values so Map forEach works directly.

      const socket = makeSocket();
      const result = await update(socket, {
        uuid: schedule.uuid,
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      });

      expect(schedule.dow_a).to.deep.equal(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      expect(saveStub.calledOnce).to.be.true;
      expect(saveStub.firstCall.args[0]).to.equal('/tmp/rules.yml');
      expect(result).to.deep.include({ status: 'success' });
    });
  });

  describe('schedule::delete', function () {
    it('throws ValidationError when the request fails schema validation', async function () {
      const socket = makeSocket();
      let threw: any;
      try {
        await del(socket, {});
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
    });

    it('throws BadRequestError when the schedule is not found', async function () {
      const uuid = '11111111-1111-1111-8111-111111111111';
      config.rules = {
        set: { schedules: { store_map: new Map() } },
        server: { schedules: {}, save_yaml_async: sinon.stub(), path: '/tmp/rules.yml' },
      };
      const socket = makeSocket();
      let threw: any;
      try {
        await del(socket, { uuid });
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.BadRequestError);
    });

    it('refuses to delete a schedule still referenced by rules', async function () {
      const uuid = '11111111-1111-1111-8111-111111111111';
      const schedule: any = {
        uuid,
        name: 'biz',
        is_referenced: () => true,
        ref_count: 3,
      };
      const storeMap = new Map();
      storeMap.set('biz', schedule);
      config.rules = {
        set: { schedules: { store_map: storeMap } },
        server: { schedules: {}, save_yaml_async: sinon.stub(), path: '/tmp/rules.yml' },
      };
      const socket = makeSocket();
      let threw: any;
      try {
        await del(socket, { uuid });
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
      expect(threw.message).to.match(/still used by 3/);
    });

    it('deletes, saves and emits schedules::updated on the happy path', async function () {
      const uuid = '11111111-1111-1111-8111-111111111111';
      const schedule: any = {
        uuid,
        name: 'biz',
        is_referenced: () => false,
      };
      const storeMap = new Map();
      storeMap.set('biz', schedule);
      const saveStub = sinon.stub().resolves({});
      config.rules = {
        set: { schedules: { store_map: storeMap } },
        server: { schedules: {}, save_yaml_async: saveStub, path: '/tmp/rules.yml' },
      };

      const socket = makeSocket();
      const result = await del(socket, { uuid });

      expect(storeMap.has('biz'), 'schedule removed from store').to.be.false;
      expect(saveStub.calledOnce).to.be.true;
      expect(saveStub.firstCall.args[0]).to.equal('/tmp/rules.yml');
      expect(SocketIO.io.emit.calledWith('schedules::updated')).to.be.true;
      expect(result).to.deep.equal({ status: 'success', deleted: uuid });
    });
  });
});
