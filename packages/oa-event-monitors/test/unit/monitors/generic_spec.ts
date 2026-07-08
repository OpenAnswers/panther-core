//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const EventEmitter = require('events').EventEmitter;
const { expect, sinon } = require('../../mocha_helpers');

const { Agent } = require('../../../lib/generic');

describe('Unit::EventMonitors::generic::Agent', function () {
  let stdin_stub: any;
  let resume_stub: any;
  let setenc_stub: any;

  beforeEach(function () {
    // Stub process.stdin with a fresh EventEmitter so start() can subscribe
    // to 'data' and 'end' without touching the real stdin.
    const fake_stdin: any = new EventEmitter();
    fake_stdin.resume = sinon.stub();
    fake_stdin.setEncoding = sinon.stub();

    stdin_stub = sinon.stub(process, 'stdin').value(fake_stdin);
    resume_stub = fake_stdin.resume;
    setenc_stub = fake_stdin.setEncoding;
  });

  afterEach(function () {
    stdin_stub.restore();
  });

  it('exposes a Joose class with AgentRole composition', function () {
    expect(Agent).to.be.a('function');
    const a = new Agent({ props: {}, eventCB: function () {} });
    expect(a.getProps()).to.deep.equal({});
    expect(a.getEventCB()).to.be.a('function');
  });

  it('returns from start() via cb(null) without waiting for stdin data', function (done: Function) {
    const a = new Agent({ props: {}, eventCB: function () {} });
    a.start(function (err: any) {
      expect(err).to.equal(null);
      done();
    });
  });

  it('wires stdin: resumes it and sets utf8 encoding', function () {
    const a = new Agent({ props: {}, eventCB: function () {} });
    a.start(function () {});
    expect(resume_stub.calledOnce).to.equal(true);
    expect(setenc_stub.calledWith('utf8')).to.equal(true);
  });

  it('parses k=v lines from stdin and fires eventCB on end', function () {
    const cb = sinon.spy();
    const a = new Agent({ props: {}, eventCB: cb });
    a.start(function () {});

    (process.stdin as any).emit('data', 'node=server-a\n');
    (process.stdin as any).emit('data', 'severity=3\n');
    (process.stdin as any).emit('data', 'summary=things are bad');
    (process.stdin as any).emit('end');

    expect(cb.calledOnce).to.equal(true);
    expect(cb.firstCall.args[0]).to.deep.equal({
      node: 'server-a',
      severity: '3',
      summary: 'things are bad',
    });
  });

  it('handles chunked data across multiple emits by accumulating then parsing on end', function () {
    const cb = sinon.spy();
    const a = new Agent({ props: {}, eventCB: cb });
    a.start(function () {});

    (process.stdin as any).emit('data', 'node=se');
    (process.stdin as any).emit('data', 'rver-b\nseverity=4');
    (process.stdin as any).emit('end');

    expect(cb.firstCall.args[0]).to.deep.equal({
      node: 'server-b',
      severity: '4',
    });
  });
});
