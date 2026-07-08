//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const debug = require('debug')('oa:helpers:test:objhash');

// Test setup
const expect = require('chai').expect;
const objectHash = require('../src/objhash');

// This needs something to test collisions.

describe('ObjHash', function () {
  describe('boolean', function () {
    it('creates two equal bools', function (done: Function) {
      expect(objectHash(true)).to.equal(objectHash(true));
      done();
    });

    it('creates two unequal bools', function (done: Function) {
      expect(objectHash(true)).to.not.equal(objectHash(false));
      done();
    });
  });

  describe('null', function () {
    it('creates two equal null', function (done: Function) {
      expect(objectHash(null)).to.equal(objectHash(null));
      done();
    });

    it('doesnt match something else', function (done: Function) {
      expect(objectHash(null)).to.not.equal(objectHash(undefined));
      done();
    });
  });

  describe('numbers', function () {
    it('matches two equal numbers', function (done: Function) {
      expect(objectHash(1)).to.equal(objectHash(1));
      done();
    });

    it("doesn't match different numbers", function (done: Function) {
      expect(objectHash(1)).to.not.equal(objectHash(2));
      done();
    });
  });

  describe('regexp', function () {
    it('matches two equal regexps', function (done: Function) {
      expect(objectHash(/a/)).to.equal(objectHash(/a/));
      done();
    });

    it("doesn't match different regexps", function (done: Function) {
      expect(objectHash(/a/)).to.not.equal(objectHash(/a/i));
      done();
    });

    it("doesn't match different regexps", function (done: Function) {
      expect(objectHash(/^a/)).to.not.equal(objectHash(/a/));
      done();
    });
  });

  describe('date', function () {
    it('matches two equal dates', function (done: Function) {
      const ts = Date.now();
      const first = objectHash(new Date(ts));
      const second = objectHash(new Date(ts));
      expect(first).to.equal(second);
      done();
    });

    it("doesn't match two unequal dates", function (done: Function) {
      const first = new Date(Date.now());
      const second = new Date(Date.now() - 1);
      expect(first).to.not.equal(second);
      expect(objectHash(first)).to.not.equal(objectHash(second));
      done();
    });
  });

  describe('string', function () {
    it('matches two equal strings', function (done: Function) {
      const first = objectHash('string');
      const second = objectHash('string');
      expect(first).to.equal(second);
      done();
    });

    it("doesn't match two unequal string", function (done: Function) {
      const first = objectHash('string');
      const second = objectHash('sstring');
      expect(first).to.not.equal(second);
      done();
    });
  });

  describe('function', function () {
    it('creates two equal functions', function (done: Function) {
      const first = function () {
        return 'yep';
      };
      const second = function () {
        return 'yep';
      };
      expect(objectHash(first)).to.equal(objectHash(second));
      done();
    });

    it('creates two unequal functions', function (done: Function) {
      const first = function () {
        return 'yep';
      };
      const second = function () {
        return 'nope';
      };
      expect(objectHash(first)).to.not.equal(objectHash(second));
      done();
    });
  });

  describe('arrays', function () {
    it('matches two simple array', function (done: Function) {
      const first = [1];
      const second = [1];
      expect(objectHash(first)).to.equal(objectHash(second));
      done();
    });

    it("doesn't match two simple arrays", function (done: Function) {
      const first = [1];
      const second = [2];
      expect(objectHash(first)).to.not.equal(objectHash(second));
      done();
    });

    it('matches two more complex objects', function (done: Function) {
      const first = objectHash([1, 2, 3]);
      const second = objectHash([1, 2, 3]);
      expect(first).to.equal(second);
      done();
    });

    it('matches to nested arrays', function (done: Function) {
      const first = objectHash([1, [], 3]);
      const second = objectHash([1, [], 3]);
      expect(first).to.equal(second);
      done();
    });

    it("doesn't matches to nested arrays", function (done: Function) {
      const first = objectHash([1, [], 3]);
      const second = objectHash([1, 3, []]);
      expect(first).to.not.equal(second);
      done();
    });
  });

  describe('objects', function () {
    it('matches two simple objects', function (done: Function) {
      expect(objectHash({ set: 1 })).to.equal(objectHash({ set: 1 }));
      done();
    });

    it("doesn't match two simple objects", function (done: Function) {
      expect(objectHash({ set: 1 })).to.not.equal(objectHash({ set: 2 }));
      done();
    });

    it('matches two more complex objects', function (done: Function) {
      const first = objectHash({ set: 1, met: 2 });
      const second = objectHash({ met: 2, set: 1 });
      expect(first).to.equal(second);
      done();
    });
  });

  describe('complex', function () {
    it('matches two ordered objects', function (done: Function) {
      const first = { field: { $set: { field: 1, other: null, undef: undefined } } };
      const second = { field: { $set: { field: 1, other: null, undef: undefined } } };
      expect(objectHash(first)).to.equal(objectHash(second));
      done();
    });

    it('matches two unordered objects', function (done: Function) {
      const first = {
        field: { $set: { field: 1, other: 'two' } },
        mope: { $set: { field: 1, other: 'two' } },
      };
      const second = {
        mope: { $set: { other: 'two', field: 1 } },
        field: { $set: { field: 1, other: 'two' } },
      };
      expect(objectHash(first)).to.equal(objectHash(second));
      done();
    });

    it("doesn't match two nested unequal objects", function (done: Function) {
      const first = {
        field: { $set: { field: 'one', other: [null, 5, undefined] } },
      };
      const second = {
        field: { $set: { field: 'one', other: [null, 4, undefined] } },
      };
      expect(objectHash(first)).to.not.equal(objectHash(second));
      done();
    });
  });

  describe('consistancy', function () {
    it('matches a previously generated hash', function () {
      const test = objectHash({ one: 1, two: 'two', three: { 3: 3 }, four: null, five: [1, 2, '3'], six: true });
      expect(test).to.equal('b5fc6d6f7fd6739b5e985d598ed318f76cee87a5');
    });
  });
});
