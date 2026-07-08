//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const mongoose = require('mongoose');
const { Inventory } = require('../../../app/model/inventory');
const Errors = require('../../../lib/errors');
require('../../../app/socketio/inventory');

describe('Unit::EventConsole::socketio::inventory', function () {
  useMongo(this);

  const handler = getHandler('inventory::delete', 'route_return');

  it('rejects with ValidationError when the request body fails schema validation', async function () {
    const socket = makeSocket();
    let threw: any;
    try {
      await handler(socket, {});
    } catch (e) {
      threw = e;
    }
    expect(threw).to.be.instanceof(Errors.ValidationError);
  });

  it('deletes documents matching the given ids and returns a count', async function () {
    const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    await Inventory.insertMany([
      { _id: ids[0], node: 'a' },
      { _id: ids[1], node: 'b' },
      { _id: ids[2], node: 'c' },
    ]);

    const toDelete = [ids[0].toString(), ids[1].toString()];
    const socket = makeSocket();
    const result = await handler(socket, { data: toDelete });

    expect(result.ids).to.deep.equal(toDelete);
    // Mongoose's deleteMany returns { deletedCount }, not { n }; the handler
    // reads `.n` which is undefined. Document that behaviour rather than
    // assert a specific number.
    expect(result).to.have.property('rows');

    const remaining = await Inventory.find({}).lean();
    expect(remaining).to.have.lengthOf(1);
    expect(remaining[0].node).to.equal('c');
  });

  it('resolves cleanly when deleting ids that do not exist', async function () {
    const ids = [new mongoose.Types.ObjectId().toString()];
    const socket = makeSocket();
    const result = await handler(socket, { data: ids });
    expect(result.ids).to.deep.equal(ids);
  });
});
