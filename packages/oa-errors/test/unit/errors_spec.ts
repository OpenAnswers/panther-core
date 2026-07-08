//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const debug = require('debug')('oa:test:errors');

// helpers
const { expect } = require('../mocha_helpers');

// Test setup
const Errors = require('../../lib/');

debug('Errors', Errors);
debug('Errors.SocketError', Errors.SocketError);

describe('Errors', function () {
  it('throws SocketError', function () {
    const fn = () => {
      throw new Errors.SocketError();
    };
    expect(fn).to.throw(Errors.SocketError);
  });

  it('throws SocketMsgError', function () {
    const fn = () => {
      throw new Errors.SocketMsgError();
    };
    expect(fn).to.throw(Errors.SocketMsgError);
  });

  it('throws QueryError', function () {
    const fn = () => {
      throw new Errors.QueryError();
    };
    expect(fn).to.throw(Errors.QueryError);
  });

  it('throws NotFoundError', function () {
    const fn = () => {
      throw new Errors.NotFoundError();
    };
    expect(fn).to.throw(Errors.NotFoundError);
  });

  it('throws RequestError', function () {
    const fn = () => {
      throw new Errors.RequestError();
    };
    expect(fn).to.throw(Errors.RequestError);
  });

  it('throws BadRequestError', function () {
    const fn = () => {
      throw new Errors.BadRequestError();
    };
    expect(fn).to.throw(Errors.BadRequestError);
  });

  describe('BadRequestError', function () {
    it('is an error', function () {
      expect(new Errors.BadRequestError()).to.be.an.instanceof(Error);
    });

    it('throws a BadRequestError', function () {
      const fn = () => {
        throw new Errors.BadRequestError();
      };
      expect(fn).to.throw(Errors.BadRequestError);
    });

    it('throws a BadRequestError with a message', function () {
      const fn = () => {
        throw new Errors.BadRequestError('booboo');
      };
      expect(fn).to.throw(Errors.BadRequestError, /booboo/);
    });
  });

  describe('ValidationError', function () {
    it('is an error', function () {
      expect(new Errors.ValidationError()).to.be.an.instanceof(Error);
    });

    it('throws a ValidationError', function () {
      const fn = () => {
        throw new Errors.ValidationError();
      };
      expect(fn).to.throw(Errors.ValidationError);
    });

    it('should have metadata attached', function () {
      const e = new Errors.ValidationError('test', {
        field: 'what',
        format: 'string',
        code: 234,
        type: 'atype',
        value: 'avalue',
      });
      expect(e.field).to.equal('what');
      expect(e.format).to.equal('string');
      expect(e.code).to.equal(234);
      expect(e.name).to.equal('ValidationError');
      expect(e.type).to.equal('atype');
      expect(e.value).to.equal('avalue');
    });
  });

  it('throws a ValidationError via helper', function () {
    const fn = () => Errors.throw_a(Errors.ValidationError, 'test', ['a'], ['b']);
    expect(fn).to.throw(Errors.ValidationError);
  });

  it('throws a CertificateError', function () {
    const fn = () => {
      throw new Errors.CertificateError();
    };
    expect(fn).to.throw(Errors.CertificateError);
  });

  it('throws NotImplementedError', function () {
    const fn = () => {
      throw new Errors.NotImplementedError();
    };
    expect(fn).to.throw(Errors.NotImplementedError);
  });

  it('throws EmailError', function () {
    const fn = () => {
      throw new Errors.EmailError();
    };
    expect(fn).to.throw(Errors.EmailError);
  });

  describe('HttpErrors', function () {
    it('throws HttpError400', function () {
      const fn = () => {
        throw new Errors.HttpError400();
      };
      expect(fn).to.throw(/Bad Request/);
    });

    it('throws HttpError400 with message', function () {
      const fn = () => {
        throw new Errors.HttpError400('nope');
      };
      expect(fn).to.throw(/Bad Request nope/);
    });

    it('throws HttpError404', function () {
      const fn = () => {
        throw new Errors.HttpError404();
      };
      expect(fn).to.throw(/Not Found/);
    });

    it('throws HttpError404 with path', function () {
      const fn = () => {
        throw new Errors.HttpError404('/path/to/missing');
      };
      expect(fn).to.throw('Not Found /path/to/missing');
    });

    it('throws HttpError401', function () {
      const fn = () => {
        throw new Errors.HttpError401();
      };
      expect(fn).to.throw('Unauthorised');
    });

    it('throws HttpError500', function () {
      const fn = () => {
        throw new Errors.HttpError500();
      };
      expect(fn).to.throw(/Server Error/);
    });
  });

  describe('ErrorType', function () {
    it('can lookup a validation error', function () {
      expect(Errors.ErrorType.lookup('ValidationError')).to.be.ok;
    });

    it('can create a Validation Error from data', function () {
      const obj = {
        name: 'ValidationError',
        message: 'Whatever message',
        field: 'test',
      };
      const error = Errors.ErrorType.from_object(obj);
      expect(error).to.be.an.instanceof(Errors.ValidationError);
      expect(error.name).to.equal(obj.name);
      expect(error.message).to.equal(obj.message);
      expect(error.field).to.equal(obj.field);
    });

    it('defaults to a standard error on string', function () {
      const error = Errors.ErrorType.from_object('test');
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('test');
      expect(error).to.not.have.property('type');
    });
  });

  describe('ErrorGroup', function () {
    it('can create one', function () {
      expect(new Errors.ErrorGroup('a')).to.be.an.instanceof(Errors.ErrorGroup);
    });

    describe('instance', function () {
      let eg: any = null;

      beforeEach(function () {
        eg = new Errors.ErrorGroup('Whatever');
      });

      it('adds an error', function () {
        eg.add(new Error('b'));
        expect(eg.errors.length).to.equal(1);
        expect(eg.errors[0].message).to.equal('b');
      });

      it('adds a new error', function () {
        eg.add_new('WhatEver', 'This is an error message');
        expect(eg.errors.length).to.equal(1);
        expect(eg.errors[0].name).to.equal('Error');
        expect(eg.errors[0].message).to.equal('This is an error message');
      });

      it('counts errors', function () {
        eg.add(new Error('c'));
        expect(eg.count()).to.equal(1);
      });

      it('throws if there are errors inside', function () {
        eg.add(new Error('d error'));
        const fn = () => eg.throw_if_errors();
        expect(fn).to.throw(Errors.ErrorGroup);
      });

      it("doesn't throw if there aren't errors", function () {
        const fn = () => eg.throw_if_errors();
        expect(fn).to.not.throw();
      });
    });
  });

  describe('ValidationGroup', function () {
    it('can create one', function () {
      expect(new Errors.ValidationGroup('a')).to.be.an.instanceof(Errors.ValidationGroup);
    });

    describe('instance', function () {
      let eg: any = null;

      beforeEach(function () {
        eg = new Errors.ValidationGroup('the group');
      });

      it('throws if there are errors inside', function () {
        eg.add(new Error('d error'));
        const fn = () => eg.throw_if_errors();
        expect(fn).to.throw(Errors.ValidationGroup);
      });

      it("doesn't throw if there aren't errors", function () {
        const fn = () => eg.throw_if_errors();
        expect(fn).to.not.throw();
      });
    });
  });
});
