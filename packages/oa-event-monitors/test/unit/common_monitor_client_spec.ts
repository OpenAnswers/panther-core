//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Unit-tests monitor_client.js without standing up socket.io.
// We construct a MonitorClient, inject a fake socket and profile via the
// Joose setters, and exercise sendAlert / sendOneAlert / cleanup / validate.

process.env.NODE_ENV = 'test';

const { expect, sinon } = require('../mocha_helpers');
const { MonitorClient } = require('../../common/monitor_client');

describe('Unit::EventMonitors::MonitorClient', function () {
  let client: any;
  let socket_stub: any;
  let exit_stub: any;

  beforeEach(function () {
    client = new MonitorClient({ endpoint: 'http://nowhere:1/' });

    // Profile drives validateAlertFields — mandatory columns list.
    client.setProfile({ columns: { mandatory: ['identifier', 'node', 'severity', 'summary'] } });

    // Fake socket exposing only what the code uses: emit() + sendBuffer.length.
    socket_stub = {
      emit: sinon.stub(),
      sendBuffer: { length: 0 },
    };
    client.setSocket(socket_stub);
    client.emptyBufferQueue();
  });

  afterEach(function () {
    if (exit_stub) {
      exit_stub.restore();
      exit_stub = null;
    }
  });

  function validEvent(over: Record<string, any> = {}) {
    return Object.assign(
      {
        identifier: 'n:3:s',
        node: 'n',
        severity: 3,
        summary: 's',
      },
      over
    );
  }

  describe('validateAlertFields', function () {
    it('returns true when every mandatory column is present', function () {
      expect(client.validateAlertFields(validEvent())).to.equal(true);
    });

    it('returns false when a mandatory column is missing', function () {
      const ev = validEvent();
      delete ev.summary;
      expect(client.validateAlertFields(ev)).to.equal(false);
    });
  });

  describe('cleanupAlertFields', function () {
    it('leaves an event without date fields alone and returns true', function () {
      const ev = validEvent();
      expect(client.cleanupAlertFields(ev)).to.equal(true);
    });

    it('converts ISO date strings to Date instances', function () {
      const ev = validEvent({ first_occurrence: '2026-04-22T08:00:00Z' });
      expect(client.cleanupAlertFields(ev)).to.equal(true);
      expect(ev.first_occurrence).to.be.a('date');
    });

    it('returns false when a date field cannot be parsed', function () {
      const ev = validEvent({ last_occurrence: 'not-a-date' });
      expect(client.cleanupAlertFields(ev)).to.equal(false);
    });

    it('leaves already-Date fields untouched', function () {
      const d = new Date('2026-04-22T08:00:00Z');
      const ev = validEvent({ state_change: d });
      client.cleanupAlertFields(ev);
      expect(ev.state_change).to.equal(d);
    });
  });

  describe('sendAlert — non-buffering path', function () {
    it('emits insert_event with the cleaned event and forwards cb as ack', function () {
      const cb = sinon.stub();
      client.sendAlert(validEvent(), cb);

      expect(socket_stub.emit.calledOnce).to.equal(true);
      const [channel, ev, passed_cb] = socket_stub.emit.firstCall.args;
      expect(channel).to.equal('insert_event');
      expect(ev.identifier).to.equal('n:3:s');
      expect(passed_cb).to.equal(cb);
    });

    it('fires qcb synchronously with a queued status and null err', function () {
      const qcb = sinon.spy();
      client.sendAlert(validEvent(), undefined, qcb);

      expect(qcb.calledOnce).to.equal(true);
      const [err, result] = qcb.firstCall.args;
      expect(err).to.equal(null);
      expect(result).to.deep.equal({ message: 'Event sent to server', status: 'queued' });
    });

    it('invokes cb+qcb with a ValidationError when mandatory fields are missing', function () {
      const cb = sinon.spy();
      const qcb = sinon.spy();
      const ev = validEvent();
      delete ev.node;

      client.sendAlert(ev, cb, qcb);

      expect(socket_stub.emit.called).to.equal(false);
      expect(cb.calledOnce).to.equal(true);
      expect(qcb.calledOnce).to.equal(true);
      expect(cb.firstCall.args[0].name).to.equal('ValidationError');
      expect(qcb.firstCall.args[0].name).to.equal('ValidationError');
    });

    it('invokes cb+qcb with a ValidationError when cleanup fails', function () {
      const cb = sinon.spy();
      const qcb = sinon.spy();

      client.sendAlert(validEvent({ first_occurrence: 'not-a-date' }), cb, qcb);

      expect(socket_stub.emit.called).to.equal(false);
      expect(cb.calledOnce).to.equal(true);
      expect(qcb.calledOnce).to.equal(true);
      expect(cb.firstCall.args[0].name).to.equal('ValidationError');
    });
  });

  describe('sendAlert — buffering path', function () {
    beforeEach(function () {
      client.setBuffering(1000); // > 0 enables buffering
    });

    it('adds the event to the queue rather than emitting', function () {
      const cb = sinon.stub();
      client.sendAlert(validEvent(), cb);

      expect(socket_stub.emit.called).to.equal(false);
      expect(client.queue).to.deep.equal(['n:3:s']);
      expect(client.q_data['n:3:s']).to.include({ identifier: 'n:3:s', tally: 1 });
    });

    it('still fires qcb with queued status on the same tick', function () {
      const qcb = sinon.spy();
      client.sendAlert(validEvent(), undefined, qcb);
      expect(qcb.calledOnce).to.equal(true);
      expect(qcb.firstCall.args[1].status).to.equal('queued');
    });

    it('increments tally when the same identifier arrives again', function () {
      client.sendAlert(validEvent());
      client.sendAlert(validEvent());
      expect(client.q_data['n:3:s'].tally).to.equal(2);
      expect(client.q_data['n:3:s']._occurrences.length).to.equal(2);
      // Queue dedupes by identifier; repeat sends fold into the existing q_data entry.
      expect(client.queue).to.deep.equal(['n:3:s']);
    });
  });

  describe('flushBufferQueue', function () {
    beforeEach(function () {
      client.setBuffering(1000);
    });

    it('does nothing when the queue is empty', function () {
      client.flushBufferQueue();
      expect(socket_stub.emit.called).to.equal(false);
    });

    it('emits insert_events with the batched events and clears the queue', function () {
      client.sendAlert(validEvent({ identifier: 'a:1:x', node: 'a' }));
      client.sendAlert(validEvent({ identifier: 'b:2:y', node: 'b' }));

      client.flushBufferQueue();

      expect(socket_stub.emit.calledOnce).to.equal(true);
      const [channel, events] = socket_stub.emit.firstCall.args;
      expect(channel).to.equal('insert_events');
      expect(events.map((e: any) => e.identifier)).to.deep.equal(['a:1:x', 'b:2:y']);
      expect(client.queue).to.deep.equal([]);
      expect(client.q_data).to.deep.equal({});
    });
  });

  describe('sendOneAlert', function () {
    beforeEach(function () {
      exit_stub = sinon.stub(process, 'exit');
    });

    it('emits insert_event and fires qcb with a oneshot-queued status', function () {
      const qcb = sinon.spy();
      client.sendOneAlert(validEvent(), undefined, qcb);

      expect(socket_stub.emit.calledOnce).to.equal(true);
      expect(socket_stub.emit.firstCall.args[0]).to.equal('insert_event');
      expect(qcb.calledOnce).to.equal(true);
      expect(qcb.firstCall.args[1]).to.deep.equal({ message: 'One event sent to server', status: 'queued' });
    });

    it('calls cb and exits 0 on a successful upstream ack', function () {
      const cb = sinon.spy();
      client.sendOneAlert(validEvent(), cb);

      const ack_cb = socket_stub.emit.firstCall.args[2];
      ack_cb(null, 'ok');

      expect(cb.calledOnce).to.equal(true);
      expect(cb.firstCall.args.length).to.equal(0);
      expect(exit_stub.calledWith(0)).to.equal(true);
    });

    it('calls cb with err and exits 1 when the upstream acks with an error', function () {
      const cb = sinon.spy();
      client.sendOneAlert(validEvent(), cb);

      const ack_cb = socket_stub.emit.firstCall.args[2];
      ack_cb(new Error('upstream down'));

      expect(cb.calledOnce).to.equal(true);
      expect(cb.firstCall.args[0]).to.be.an('error');
      expect(exit_stub.calledWith(1)).to.equal(true);
    });

    it('short-circuits with ValidationError when validation fails', function () {
      const cb = sinon.spy();
      const qcb = sinon.spy();
      const ev = validEvent();
      delete ev.severity;

      client.sendOneAlert(ev, cb, qcb);

      expect(socket_stub.emit.called).to.equal(false);
      expect(cb.firstCall.args[0].name).to.equal('ValidationError');
      expect(qcb.firstCall.args[0].name).to.equal('ValidationError');
      expect(exit_stub.called).to.equal(false);
    });
  });

  describe('queue housekeeping', function () {
    it('emptyBufferQueue resets queue and q_data', function () {
      client.setBuffering(1000);
      client.sendAlert(validEvent());
      client.emptyBufferQueue();
      expect(client.queue).to.deep.equal([]);
      expect(client.q_data).to.deep.equal({});
    });

    it('isBuffering reflects the buffering interval', function () {
      expect(client.isBuffering()).to.equal(false);
      client.setBuffering(500);
      expect(client.isBuffering()).to.equal(true);
    });
  });
});
