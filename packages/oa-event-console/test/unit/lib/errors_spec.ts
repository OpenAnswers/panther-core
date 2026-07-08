//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const Errors = require('../../../lib/errors');

function make_fake_socket() {
  return {
    id: 'sock-1',
    emit: sinon.spy()
  };
}

describe('Unit::EventConsole::lib::errors', function() {

  describe('re-exports oa-errors', function() {

    it('exposes the common error types', function() {
      expect(Errors.ValidationError).to.be.a('function');
      expect(Errors.ValidationError.prototype).to.be.instanceof(Error);
    });

    it('attaches the Helpers class', function() {
      expect(Errors.Helpers).to.be.a('function');
    });
  });

  describe('Helpers.socket_error', function() {

    it('emits a message event on the socket with error name and message', function() {
      const socket = make_fake_socket();
      const result = Errors.Helpers.socket_error(
        Errors.ValidationError, socket, 'bad thing', { extra: 1 }
      );

      expect(socket.emit.calledOnce).to.be.true;
      const [evName, payload] = socket.emit.firstCall.args;
      expect(evName).to.equal('message');
      expect(payload).to.deep.equal({
        error:   'ValidationError',
        message: 'bad thing'
      });
      expect(result).to.contain('ValidationError');
      expect(result).to.contain('sock-1');
      expect(result).to.contain('bad thing');
    });

    it('tolerates missing data', function() {
      const socket = make_fake_socket();
      const result = Errors.Helpers.socket_error(Errors.ValidationError, socket, 'oops');
      expect(socket.emit.calledOnce).to.be.true;
      expect(result).to.contain('oops');
    });
  });

  describe('Helpers.throw_socket', function() {

    it('throws the given error type with the formatted message', function() {
      const socket = make_fake_socket();
      expect(() =>
        Errors.Helpers.throw_socket(Errors.ValidationError, socket, 'denied', '')
      ).to.throw(Errors.ValidationError).that.has.property('message').contain('denied');
    });

    it('still emits the socket message when thrown', function() {
      const socket = make_fake_socket();
      try { Errors.Helpers.throw_socket(Errors.ValidationError, socket, 'denied'); }
      catch (_) { /* expected */ }
      expect(socket.emit.calledOnce).to.be.true;
    });
  });

  describe('Helpers.generic_error', function() {

    it('returns a formatted string with type name, message and data', function() {
      const result = Errors.Helpers.generic_error(Errors.ValidationError, 'bad', { k: 1 });
      expect(result).to.contain('ValidationError');
      expect(result).to.contain('bad');
    });

    it('tolerates missing data', function() {
      const result = Errors.Helpers.generic_error(Errors.ValidationError, 'bad');
      expect(result).to.contain('ValidationError');
      expect(result).to.contain('bad');
    });
  });

  describe('Helpers.throw_generic', function() {

    it('throws the given error type', function() {
      expect(() =>
        Errors.Helpers.throw_generic(Errors.ValidationError, 'nope')
      ).to.throw(Errors.ValidationError);
    });
  });
});
