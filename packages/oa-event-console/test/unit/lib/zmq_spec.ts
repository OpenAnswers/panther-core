//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// The zmq native module is not installed in this workspace (lib/zmq.ts is
// legacy, only referenced in a commented-out app/index.ts entry). To exercise
// the thin wrapper without the native dependency, stub `zmq` in require.cache
// before loading lib/zmq.
//
// NB: side-effects of requiring lib/zmq persist for the remainder of the
// suite; no other spec imports it, so this is safe.

const { expect, sinon } = require('../../mocha_helpers');
const Module = require('module');

describe('Unit::EventConsole::lib::zmq', function() {

  let sendStub: any;
  let bindStub: any;
  let Zmq: any;

  before(function() {
    sendStub = sinon.stub();
    bindStub = sinon.stub();

    const fakeSocket = { send: sendStub, bindSync: bindStub };
    const fakeZmq    = { socket: sinon.stub().returns(fakeSocket) };

    // lib/zmq references Config.zmq.uri as a static — the Config class has no
    // zmq member in normal configuration. Patch it in so initClass succeeds.
    const { Config } = require('../../../lib/config');
    (Config as any).zmq = { uri: 'tcp://127.0.0.1:5555' };

    const origResolve = Module._resolveFilename;
    Module._resolveFilename = function(request: string, ...rest: any[]) {
      if (request === 'zmq') return 'zmq-stub';
      return origResolve.call(this, request, ...rest);
    };
    require.cache['zmq-stub'] = {
      id: 'zmq-stub', filename: 'zmq-stub', loaded: true,
      exports: fakeZmq
    } as any;

    try {
      Zmq = require('../../../lib/zmq').Zmq;
    } finally {
      Module._resolveFilename = origResolve;
    }
  });

  it('binds to the configured ZMQ URI on module load', function() {
    expect(bindStub.called, 'bindSync should be called during initClass').to.be.true;
  });

  it('poll_mongo() sends a "db" frame on the push socket', function() {
    Zmq.poll_mongo();
    expect(sendStub.calledWith('db')).to.be.true;
  });
});
