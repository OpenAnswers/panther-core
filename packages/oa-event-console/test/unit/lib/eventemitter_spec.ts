//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { server_event, EventEmitter2 } = require('../../../lib/eventemitter');

describe('Unit::EventConsole::lib::eventemitter', function() {

  it('exports an EventEmitter2 singleton', function() {
    expect(server_event).to.be.instanceof(EventEmitter2);
  });

  it('is configured with "::" delimiter and wildcard support', function() {
    let received: any;
    server_event.once('test::topic::hit', function(msg: any) { received = msg; });
    server_event.emit('test::topic::hit', { n: 1 });
    expect(received).to.deep.equal({ n: 1 });
  });

  it('supports wildcard subscription', function() {
    const received: string[] = [];
    const handler = function(this: any) { received.push(this.event); };
    server_event.on('test::wild::*', handler);
    server_event.emit('test::wild::one');
    server_event.emit('test::wild::two');
    server_event.off('test::wild::*', handler);
    expect(received).to.have.lengthOf(2);
  });

  it('registers an error listener that does not throw', function() {
    expect(server_event.listeners('error').length).to.be.at.least(1);
    expect(() => server_event.emit('error', new Error('test'))).to.not.throw();
  });

  it('registers a fatal listener', function() {
    expect(server_event.listeners('fatal').length).to.be.at.least(1);
  });
});
