//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const mongopollers = require('../../../lib/mongopollers');
require('../../../app/socketio/summary');

describe('Unit::EventConsole::socketio::summary', function () {
  const summary_join = getHandler('summary::join_room');

  afterEach(function () {
    sinon.restore();
  });

  it('joins the "summary" room, emits an empty populate, and kicks off the summary poller', function () {
    const startStub = sinon.stub(mongopollers.MongoSummaryPollers, 'fetch_id_and_start');

    const socket = makeSocket({ allow: ['summary:populate'] });
    summary_join(socket, {}, () => {});

    expect(socket.join.calledWith('summary')).to.be.true;
    expect(socket.emit.calledWith('summary:populate')).to.be.true;
    expect(socket.lastEmit('summary:populate')).to.deep.equal([{}]);

    expect(startStub.calledOnce).to.be.true;
    const [filterHash, options] = startStub.firstCall.args;
    expect(filterHash).to.be.a('string').and.have.length.greaterThan(0);
    expect(options).to.deep.equal({ filter: 'summary' });
  });
});
