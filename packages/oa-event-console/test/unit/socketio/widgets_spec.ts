//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { Mongoose } = require('../../../lib/mongoose');
require('../../../app/socketio/widgets');

describe('Unit::EventConsole::socketio::widgets', function () {
  useMongo(this);

  const join_room = getHandler('inventory::join_room');

  it('joins the "inventory" room and emits inventory sorted by last_seen descending', async function () {
    const col = Mongoose.mongoose.connection.collection('inventories');
    await col.insertMany([
      { node: 'old', last_seen: new Date('2026-01-01T00:00:00Z') },
      { node: 'new', last_seen: new Date('2026-04-01T00:00:00Z') },
      { node: 'mid', last_seen: new Date('2026-02-15T00:00:00Z') },
    ]);

    const socket = makeSocket({ allow: ['inventory::populate'] });

    await new Promise<void>((resolve, reject) => {
      const p = join_room(socket, {}, () => {});
      Promise.resolve(p).then(() => resolve(), reject);
    });

    expect(socket.join.calledWith('inventory')).to.be.true;
    expect(socket.emit.calledWith('inventory::populate')).to.be.true;

    const [inventory] = socket.lastEmit('inventory::populate');
    const nodes = inventory.map((d: any) => d.node);
    expect(nodes).to.deep.equal(['new', 'mid', 'old']);
  });

  it('emits an empty array when the inventory collection is empty', async function () {
    const socket = makeSocket({ allow: ['inventory::populate'] });

    await new Promise<void>((resolve, reject) => {
      const p = join_room(socket, {}, () => {});
      Promise.resolve(p).then(() => resolve(), reject);
    });

    expect(socket.lastEmit('inventory::populate')).to.deep.equal([[]]);
  });
});
