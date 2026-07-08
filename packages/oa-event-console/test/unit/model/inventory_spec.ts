//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { Inventory } = require('../../../app/model/inventory');
const { SocketIO } = require('../../../lib/socketio');

describe('Unit::EventConsole::model::Inventory', function () {
  useMongo(this);

  afterEach(function () {
    sinon.restore();
  });

  it('pre-save sets last_seen when missing', async function () {
    const before = Date.now();
    const doc = await Inventory.create({ node: 'host-1' });
    expect(doc.last_seen).to.be.instanceof(Date);
    expect(doc.last_seen.getTime()).to.be.at.least(before);
  });

  it('rejects saves without a node', async function () {
    let err: any = null;
    try {
      await Inventory.create({});
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.have.property('node');
  });

  it('post-deleteMany emits a count on the inventory room', async function () {
    await Inventory.create({ node: 'host-1' });
    await Inventory.create({ node: 'host-2' });

    const emit = sinon.stub();
    const to = sinon.stub().returns({ emit });
    sinon.stub(SocketIO, 'io').value({ to });

    await Inventory.deleteMany({});

    expect(to.calledWith('inventory')).to.be.true;
    expect(emit.calledWith('inventory::deleted')).to.be.true;
  });
});
