//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const net = require('net');
const { expect, sinon } = require('../../mocha_helpers');

const Class = require('joose').Class;
const { XmlListener } = require('../../../lib/utils/xml_listener');
const { Role } = require('../../../lib/utils/agent_role');

// Minimal subclass that composes AgentRole (for getProps) and implements
// parseRecord so start()'s data path has somewhere to deliver tokens.
const TestXmlListener = Class({
  isa: XmlListener,
  does: [Role],

  methods: {
    parseRecord: function (record: any) {
      this.getEventCB()(record);
    },
  },
});

describe('Unit::EventMonitors::utils::XmlListener', function () {
  describe('base parseRecord()', function () {
    it('invokes eventCB with a MISSING PARSE message when not overridden', function () {
      const cb = sinon.spy();
      const x = new XmlListener({ eventCB: cb });
      x.parseRecord({ anything: true });
      expect(cb.calledOnce).to.equal(true);
      expect(cb.firstCall.args[0].msg).to.match(/MISSING PARSE/);
    });
  });

  describe('start() — TCP server end-to-end', function () {
    let captured_server: any;
    let create_stub: any;

    beforeEach(function () {
      // Wrap net.createServer so we can grab the real server instance and
      // close it in afterEach while still using real sockets.
      const real_create = net.createServer;
      create_stub = sinon.stub(net, 'createServer').callsFake(function (handler: any) {
        captured_server = real_create.call(net, handler);
        return captured_server;
      });
    });

    afterEach(function (done: Function) {
      create_stub.restore();
      if (captured_server && captured_server.listening)
        captured_server.close(function () {
          done();
        });
      else done();
    });

    it('parses incoming XML and delivers element tokens via parseRecord()', function (done: Function) {
      const listener = new TestXmlListener({
        eventCB: function (tokens: any) {
          try {
            expect(tokens).to.deep.equal({ host: 'h1', severity: '4', summary: 'hello' });
            done();
          } catch (e) {
            done(e);
          }
        },
        props: { port_number: 0 },
      });

      listener.start(function (err: any) {
        expect(err).to.equal(null);
        const { port } = captured_server.address();

        const client = net.createConnection({ port }, function () {
          client.write('<event><host>h1</host><severity>4</severity><summary>hello</summary></event>');
        });
      });
    });

    it('swallows malformed XML without crashing the server', function (done: Function) {
      const cb = sinon.spy();
      const listener = new TestXmlListener({
        eventCB: cb,
        props: { port_number: 0 },
      });

      listener.start(function (err: any) {
        expect(err).to.equal(null);
        const { port } = captured_server.address();
        const client = net.createConnection({ port }, function () {
          client.write('this is not xml');
        });
        client.on('close', function () {
          // If we got here without a throw, the server is still up and cb was not called.
          expect(cb.called).to.equal(false);
          done();
        });
      });
    });
  });
});
