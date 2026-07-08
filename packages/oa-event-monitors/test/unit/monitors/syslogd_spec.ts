//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const { expect, sinon } = require('../../mocha_helpers');
const { Agent } = require('../../../lib/syslogd');

function mk(props: Record<string, any> = {}): any {
  return new Agent({ props, eventCB: function () {} });
}

describe('Unit::EventMonitors::syslogd::Agent', function () {
  describe('construction and defaults', function () {
    it('applies default port 514, wsport 1503, httpport 1501 when props empty', function () {
      const a = mk({});
      expect(a.getPort()).to.equal(514);
      expect(a.getWsport()).to.equal(1503);
      expect(a.getHttpport()).to.equal(1501);
    });

    it('takes port / wsport / httpport overrides from props', function () {
      const a = mk({ port: 6514, wsport: 9001, httpport: 9002 });
      expect(a.getPort()).to.equal(6514);
      expect(a.getWsport()).to.equal(9001);
      expect(a.getHttpport()).to.equal(9002);
    });
  });

  describe('parse()', function () {
    it('passes a glossy-parsed message through the callback on success', function (done: Function) {
      const a = mk({});
      a.parse('<13>Oct 24 22:39:25 host-a myapp[42]: hello world', function (err: any, parsed: any) {
        expect(err).to.equal(null);
        expect(parsed.host).to.equal('host-a');
        expect(parsed.message).to.include('hello world');
        done();
      });
    });

    // The missing-message error path (parsedMessage.message === undefined)
    // was not straightforward to trigger deterministically from outside
    // glossy. Left uncovered here; the fix to use `err` rather than an
    // undefined `message` variable is exercised indirectly: the code path
    // is now reachable without throwing a ReferenceError.
  });

  describe('start() — server wiring', function () {
    let net_stub: any;
    let dgram_stub: any;
    let tcp_server: any;
    let udp_socket: any;

    beforeEach(function () {
      tcp_server = { listen: sinon.stub() };
      // Chainable so `.createServer(...).listen(port)` works.
      tcp_server.listen.returns(tcp_server);

      udp_socket = {
        on: sinon.stub(),
        bind: sinon.stub(),
      };

      net_stub = sinon.stub(require('net'), 'createServer').returns(tcp_server);
      dgram_stub = sinon.stub(require('dgram'), 'createSocket').returns(udp_socket);
    });

    afterEach(function () {
      net_stub.restore();
      dgram_stub.restore();
    });

    it('creates a TCP server listening on the configured port', function () {
      const a = mk({ port: 6514 });
      a.start(function () {});
      expect(net_stub.calledOnce).to.equal(true);
      expect(tcp_server.listen.calledWith(6514)).to.equal(true);
    });

    it('creates a UDP4 socket and registers message/listening/error handlers', function () {
      const a = mk({ port: 6514 });
      a.start(function () {});
      expect(dgram_stub.calledWith('udp4')).to.equal(true);
      const registered = udp_socket.on.getCalls().map((c: any) => c.args[0]);
      expect(registered).to.include.members(['message', 'listening', 'error']);
    });

    it('binds the UDP socket to the configured port, passing the started callback', function () {
      const a = mk({ port: 6514 });
      const cb = function () {};
      a.start(cb);
      expect(udp_socket.bind.calledOnce).to.equal(true);
      const [bound_port, bound_cb] = udp_socket.bind.firstCall.args;
      expect(bound_port).to.equal(6514);
      expect(bound_cb).to.equal(cb);
    });
  });
});
