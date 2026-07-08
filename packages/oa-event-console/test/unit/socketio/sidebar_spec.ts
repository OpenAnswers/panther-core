//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { SocketIO } = require('../../../lib/socketio');
const { Activity } = require('../../../app/model/activity');
require('../../../app/socketio/sidebar');

describe('Unit::EventConsole::socketio::sidebar', function () {
  useMongo(this);

  const join_room = getHandler('activities::join_room');
  const users_active = getHandler('info::users_active');

  describe('activities::join_room', function () {
    it('joins the "activities" room and emits the last 15 activities oldest-first', async function () {
      // Seed 20 activities spread across 20 minutes so ordering is unambiguous.
      const now = Date.now();
      const docs = [];
      for (let i = 0; i < 20; i++) {
        docs.push({
          time: new Date(now - (19 - i) * 60000),
          username: 'alice',
          category: 'test',
          type: 'seed',
          metadata: { i },
        });
      }
      await Activity.insertMany(docs);

      const socket = makeSocket({ allow: ['activities::populate'] });

      await new Promise<void>((resolve, reject) => {
        join_room(socket, {}, () => {});
        // Activity.find(...).exec(cb) is async — poll until the emit fires.
        const start = Date.now();
        const check = () => {
          if (socket.emit.called) return resolve();
          if (Date.now() - start > 5000) return reject(new Error('timed out waiting for emit'));
          setTimeout(check, 10);
        };
        check();
      });

      expect(socket.join.calledWith('activities')).to.be.true;
      expect(socket.emit.calledWith('activities::populate')).to.be.true;

      const [activities] = socket.lastEmit('activities::populate');
      expect(activities).to.have.lengthOf(15);

      // Oldest first after the in-handler reverse().
      const indices = activities.map((a: any) => a.metadata.i);
      expect(indices).to.deep.equal(indices.slice().sort((a: number, b: number) => a - b));

      // Must include the most recent events (i=19 down to i=5).
      expect(indices[indices.length - 1]).to.equal(19);
      expect(indices[0]).to.equal(5);
    });

    it('emits an empty list when there are no activities', async function () {
      const socket = makeSocket({ allow: ['activities::populate'] });

      await new Promise<void>((resolve, reject) => {
        join_room(socket, {}, () => {});
        const start = Date.now();
        const check = () => {
          if (socket.emit.called) return resolve();
          if (Date.now() - start > 5000) return reject(new Error('timed out waiting for emit'));
          setTimeout(check, 10);
        };
        check();
      });

      expect(socket.join.calledWith('activities')).to.be.true;
      const [activities] = socket.lastEmit('activities::populate');
      expect(activities).to.deep.equal([]);
    });
  });

  describe('info::users_active', function () {
    let connectedUsersStub: any;

    afterEach(function () {
      connectedUsersStub?.restore();
    });

    it('emits the list returned by SocketIO.connected_users', function () {
      const sample = [
        { id: 'a', username: 'alice' },
        { id: 'b', username: 'bob' },
      ];
      connectedUsersStub = sinon.stub(SocketIO, 'connected_users').returns(sample);

      const socket = makeSocket({ allow: ['info::users'] });
      users_active(socket, {}, () => {});

      expect(socket.emit.calledWith('info::users', sample)).to.be.true;
    });
  });
});
