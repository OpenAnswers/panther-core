//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');

const { SocketIO } = require('../../../lib/socketio');
const { server_event } = require('../../../lib/eventemitter');
const { MongoPollers } = require('../../../lib/mongopollers');
require('../../../app/events/events');

describe('Unit::EventConsole::events::events', function () {
  let prevIo: any;

  beforeEach(function () {
    prevIo = SocketIO.io;
    SocketIO.io = { emit: sinon.stub() };
  });

  afterEach(function () {
    SocketIO.io = prevIo;
    sinon.restore();
  });

  it('on oa::events::deleted, emits a deletes payload carrying the ids', function () {
    server_event.emit('oa::events::deleted', { ids: ['a', 'b'] });
    expect(
      SocketIO.io.emit.calledWith('deletes', {
        data: ['a', 'b'],
        source: 'oa::events::deleted',
      })
    ).to.be.true;
  });

  it('on oa::events::deleted::all, emits a deletes-all payload with an empty data array', function () {
    server_event.emit('oa::events::deleted::all', {});
    expect(
      SocketIO.io.emit.calledWith('deletes-all', {
        data: [],
        source: 'oa::events::deleted::all',
      })
    ).to.be.true;
  });

  it('on oa::events::updated, triggers MongoPollers.emit_current_ids', function () {
    const stub = sinon.stub(MongoPollers, 'emit_current_ids').resolves([]);
    server_event.emit('oa::events::updated', {});
    expect(stub.called).to.be.true;
  });
});
