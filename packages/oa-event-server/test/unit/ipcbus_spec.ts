//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const EventEmitter = require('events').EventEmitter;

const { IpcBus, internal_bus } = require('../../lib/ipcbus');

describe('ipcbus', function () {
  describe('IpcBus', function () {
    it('instances inherit from EventEmitter', function () {
      const bus = new IpcBus();
      expect(bus).to.be.an.instanceof(EventEmitter);
    });

    it('defaults name to "default"', function () {
      const bus = new IpcBus();
      expect(bus.getName()).to.equal('default');
    });

    it('accepts a name override', function () {
      const bus = new IpcBus({ name: 'custom' });
      expect(bus.getName()).to.equal('custom');
    });

    it('emits to listeners', function () {
      const bus = new IpcBus({ name: 'emitter-test' });
      let received: any = null;
      bus.on('tick', (value: any) => {
        received = value;
      });
      bus.emit('tick', 42);
      expect(received).to.equal(42);
    });
  });

  describe('internal_bus singleton', function () {
    it('exists with name "internal"', function () {
      expect(internal_bus).to.be.an.instanceof(IpcBus);
      expect(internal_bus.getName()).to.equal('internal');
    });
  });
});
