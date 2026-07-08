//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:helpers');

const { expect } = require('../mocha_helpers');

const Errors = require('../../lib/');
const helpers = require('../../lib/helpers');

describe('helpers', function () {
  describe('throw_a', function () {
    it('is exported from the package index', function () {
      expect(Errors.throw_a).to.equal(helpers.throw_a);
    });

    it('throws the requested error type', function () {
      const fn = () => helpers.throw_a(Errors.ValidationError, 'boom');
      expect(fn).to.throw(Errors.ValidationError);
    });

    it('throws a plain Error when asked', function () {
      const fn = () => helpers.throw_a(Error, 'boom');
      expect(fn).to.throw(Error, 'boom');
    });

    it('uses the message as-is when no vars are supplied', function () {
      try {
        helpers.throw_a(Error, 'just a message');
        expect.fail('should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('just a message');
      }
    });

    it('appends a single var in brackets', function () {
      try {
        helpers.throw_a(Error, 'msg', 'one');
        expect.fail('should have thrown');
      } catch (e: any) {
        // util.inspect wraps strings in single quotes
        expect(e.message).to.equal("msg ['one']");
      }
    });

    it('joins multiple vars with "] ["', function () {
      try {
        helpers.throw_a(Error, 'msg', 'a', 'b', 'c');
        expect.fail('should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal("msg ['a'] ['b'] ['c']");
      }
    });

    it('inspects non-string vars (objects, arrays, numbers)', function () {
      try {
        helpers.throw_a(Error, 'ctx', { a: 1 }, [1, 2], 42);
        expect.fail('should have thrown');
      } catch (e: any) {
        expect(e.message).to.match(/^ctx \[/);
        expect(e.message).to.include('{ a: 1 }');
        expect(e.message).to.include('[ 1, 2 ]');
        expect(e.message).to.include('42');
      }
    });

    it('preserves metadata on error subclasses that accept it', function () {
      try {
        helpers.throw_a(Errors.ValidationError, 'bad', 'field-value');
        expect.fail('should have thrown');
      } catch (e: any) {
        expect(e).to.be.an.instanceof(Errors.ValidationError);
        expect(e.name).to.equal('ValidationError');
        expect(e.message).to.include('bad');
        expect(e.message).to.include("['field-value']");
      }
    });
  });
});
