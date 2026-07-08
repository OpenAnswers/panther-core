//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const expect = require('chai').expect;

const {
  delay,
  merge,
  tap,
  ensure_array,
  regex_escape,
  throw_error,
  under_to_class,
  class_to_under,
  ends_with,
  starts_with,
  format_string,
  format_string_object,
  _,
  map_object,
  map_objects,
  map_clone_object,
  map_clone_objects,
  random_string,
  crypto_random_hex,
  crypto_random_base64,
  crypto_random_base64_url,
  crypto_random_base62_string,
  crypto_random_base62_string_async,
  base62_from_base64,
  regex_from_array,
  is_numeric,
  is_stringy,
  is_regexy,
  regexy_to_regex,
  regexy_to_string,
  array_replace,
} = require('../src/helpers');

describe('Helpers', function () {
  describe('.delay', function () {
    it('runs', function (done: Function) {
      const start = Date.now();
      delay(100, function () {
        expect(Date.now() - start).to.be.at.least(95);
        done();
      });
    });
  });

  describe('.ensure_array', function () {
    it('runs', function () {
      expect(ensure_array('test')).to.eql(['test']);
    });
  });

  describe('.regex_escape', function () {
    it('runs', function (done: Function) {
      expect(regex_escape('\\\\')).to.eql('\\\\\\\\');
      done();
    });
  });

  describe('.throw_error', function () {
    xit('runs', function (done: Function) {
      const fn = function () {
        throw_error('test');
      };
      expect(fn).to.throw('test');
      done();
    });
  });

  describe('.regex_from_array', function () {
    it('runs', function (done: Function) {
      expect(() => regex_from_array([])).to.not.throw();
      done();
    });

    it('turns simple array into regex', function (done: Function) {
      expect(regex_from_array(['test'])).to.be.an.instanceof(RegExp);
      done();
    });

    it('turns simple regex into regex', function (done: Function) {
      expect(regex_from_array([/re\dex/])).to.be.an.instanceof(RegExp);
      done();
    });

    it('turns simple stregex into regex', function (done: Function) {
      const re = regex_from_array(['/test/']);
      expect(re).to.be.an.instanceof(RegExp);
      expect(re.source).to.equal('test');
      done();
    });
  });

  describe('.under_to_class', function () {
    it('converts single word', function (done: Function) {
      expect(under_to_class('test')).to.equal('Test');
      done();
    });

    it('converts a double word', function (done: Function) {
      expect(under_to_class('test_next')).to.equal('TestNext');
      done();
    });
  });

  describe('.class_to_under', function () {
    it('converts single word', function (done: Function) {
      expect(class_to_under('Test')).to.equal('test');
      done();
    });

    it('converts a double word', function (done: Function) {
      expect(class_to_under('TestNext')).to.equal('test_next');
      done();
    });
  });

  describe('_', function () {
    it('can run an lodash function', function (done: Function) {
      expect(_.keys({ a: 2, b: 4 })).to.eql(['a', 'b']);
      done();
    });
  });

  describe('.map_object', function () {
    const obj: any = {
      one: 1,
      two: 2,
    };

    const map = {
      one: 'three',
      two: 'four',
    };

    it('has the function', function (done: Function) {
      expect(map_object).to.be.instanceof(Function);
      done();
    });

    it('can run the function', function (done: Function) {
      expect(() => map_object(obj, map)).to.not.throw();
      done();
    });

    it('move values to new names', function (done: Function) {
      expect(obj.three).to.eql(1);
      expect(obj.four).to.eql(2);
      done();
    });

    it('removes old values', function (done: Function) {
      expect(obj.one).to.equal(undefined);
      expect(obj.two).to.equal(undefined);
      done();
    });
  });

  describe('.map_objects', function () {
    const objs: any[] = [
      {
        one: 1,
        two: 2,
      },
      {
        one: 3,
        two: 4,
      },
    ];

    const map = {
      one: 'three',
      two: 'four',
    };

    it('has the function', function (done: Function) {
      expect(map_objects).to.be.instanceof(Function);
      done();
    });

    it('can run the function', function (done: Function) {
      expect(() => map_objects(objs, map)).to.not.throw();
      done();
    });

    it('moves values to new names', function (done: Function) {
      expect(objs[0].three).to.eql(1);
      expect(objs[0].four).to.eql(2);
      expect(objs[1].three).to.eql(3);
      expect(objs[1].four).to.eql(4);
      done();
    });

    it('removes old values', function (done: Function) {
      expect(objs[0].one).to.equal(undefined);
      expect(objs[0].two).to.equal(undefined);
      expect(objs[1].one).to.equal(undefined);
      expect(objs[1].two).to.equal(undefined);
      done();
    });
  });

  describe('.ends_with', function () {
    it('works', function () {
      expect(ends_with('test', 'st')).to.equal(true);
    });

    it('fails', function () {
      expect(ends_with('test', 'te')).to.equal(false);
    });
  });

  describe('.starts_with', function () {
    it('works', function () {
      expect(starts_with('test', 'te')).to.equal(true);
    });

    it('fails', function () {
      expect(starts_with('test', 'st')).to.equal(false);
    });
  });

  describe('.format_string', function () {
    it('formats a single var', function (done: Function) {
      const str = format_string('{test}', { test: 'one' });
      expect(str).to.equal('one');
      done();
    });

    it('formats a more complex string', function (done: Function) {
      const fmt = '1{test}{two} {three}5a';
      const vars = { test: 'one', two: '222', three: 'tt' };
      const str = format_string(fmt, vars);
      expect(str).to.equal('1one222 tt5a');
      done();
    });

    it('returns stringified for nested objects', function (done: Function) {
      const fmt = '2{nested} {one}5a';
      const vars = { one: '1', nested: { two: '222' }, three: 'tt' };
      const str = format_string(fmt, vars);
      expect(str).to.equal('2{"two":"222"} 15a');
      done();
    });
  });

  describe('.format_string_object', function () {
    it('formats a single var from an object', function () {
      const str = format_string_object('{test}', { test: 'one' });
      expect(str).to.equal('one');
    });

    it("formats a single var that's last", function () {
      const str = format_string_object('a{test}', { test: 'one' });
      expect(str).to.equal('aone');
    });

    it("formats a single var that's first", function () {
      const str = format_string_object('{test}a', { test: 'one' });
      expect(str).to.equal('onea');
    });

    it('formats two vars', function () {
      const str = format_string_object('{a}{b}', { a: '1', b: '2' });
      expect(str).to.equal('12');
    });

    it('formats two vars with last missing', function () {
      const str = format_string_object('{a}{b}', { a: '1' });
      expect(str).to.equal('1{b}');
    });

    it('formats two vars with first missing', function () {
      const str = format_string_object('{a}{b}', { b: '2' });
      expect(str).to.equal('{a}2');
    });

    it('formats two vars with a zero length string', function () {
      const str = format_string_object('{none}{b}', { none: '', b: '2' });
      expect(str).to.equal('2');
    });

    it('formats a more complex string', function () {
      const fmt = '1{test}{two} {three}';
      const vars = { test: 'one', two: '222', three: 'tt' };
      const str = format_string_object(fmt, vars);
      expect(str).to.equal('1one222 tt');
    });

    it('formats a string with a deep property', function () {
      const fmt = '1{test.two}a';
      const vars = { test: { two: '222' } };
      const str = format_string_object(fmt, vars);
      expect(str).to.equal('1222a');
    });

    it('formats a string with a long deep property', function () {
      const fmt = '1{test.tworeallylongkey}';
      const vars = { test: { tworeallylongkey: '222' } };
      const str = format_string_object(fmt, vars);
      expect(str).to.equal('1222');
    });

    it('ignores an open parenthesi', function () {
      const fmt = '1{test.twoa';
      const vars = { test: { twoa: 'aaaa' } };
      const str = format_string_object(fmt, vars);
      expect(str).to.equal('1{test.twoa');
    });

    it('formats a real string', function () {
      const fmt = '{user} assigned {metadata.ids} to {metadata.owner}';
      const vars = {
        user: 'meee',
        metadata: {
          ids: '234234',
          owner: 'yooou',
        },
      };
      const str = format_string_object(fmt, vars);
      expect(str).to.equal('meee assigned 234234 to yooou');
    });
  });

  describe('.map_clone_object', function () {
    const obj = {
      one: 1,
      two: 2,
    };
    const map = {
      one: 'three',
      two: 'four',
    };

    it('can run the function', function (done: Function) {
      expect(() => map_clone_object(obj, map)).to.not.throw();
      done();
    });

    it('maps a value', function (done: Function) {
      expect(map_clone_object(obj, map)).to.have.property('three');
      done();
    });
  });

  describe('.is_numeric', function () {
    it('can run the function', function (done: Function) {
      expect(() => is_numeric(1)).to.not.throw();
      done();
    });

    it('works for a val', function (done: Function) {
      expect(is_numeric(5)).to.equal(true);
      done();
    });

    it('fails for a string', function (done: Function) {
      expect(is_numeric('testing')).to.equal(false);
      done();
    });

    it('fails for ""', function (done: Function) {
      expect(is_numeric('')).to.equal(false);
      done();
    });
  });

  describe('.is_regexy', function () {
    it('can run the function', function (done: Function) {
      expect(() => is_regexy('/r/')).to.not.throw();
      done();
    });

    it('works', function (done: Function) {
      expect(is_regexy('/test/')).to.equal(true);
      done();
    });

    it('works with a trailing /i', function (done: Function) {
      expect(is_regexy('/test/i')).to.equal(true);
      done();
    });

    it('works with a trailing /m', function (done: Function) {
      expect(is_regexy('/test/m')).to.equal(true);
      done();
    });

    it('works with a trailing /g', function (done: Function) {
      expect(is_regexy('/test/g')).to.equal(true);
      done();
    });

    it('works with a trailing /img', function (done: Function) {
      expect(is_regexy('/test/img')).to.equal(true);
      done();
    });

    it('fails for unknown trailing', function (done: Function) {
      expect(is_regexy('/other/C')).to.equal(false);
      done();
    });

    it('fails for trailing slash', function (done: Function) {
      expect(is_regexy('other/')).to.equal(false);
      done();
    });

    it('fails for leading slash', function (done: Function) {
      expect(is_regexy('/other')).to.equal(false);
      done();
    });
  });

  describe('.is_stringy', function () {
    it('can run the function', function (done: Function) {
      expect(() => is_stringy('"t"')).to.not.throw();
      done();
    });

    it('works doubles', function (done: Function) {
      expect(is_stringy('"5"')).to.equal(true);
      done();
    });

    it('works singles', function (done: Function) {
      expect(is_stringy("'5'")).to.equal(true);
      done();
    });

    it('fails', function (done: Function) {
      expect(is_stringy('other/')).to.equal(false);
      done();
    });
  });

  describe('.regexy_to_string', function () {
    it('can run the function', function (done: Function) {
      expect(() => regexy_to_string('//')).to.not.throw();
      done();
    });

    it('works on "/test/"', function (done: Function) {
      expect(regexy_to_string('/test/')).to.eql('test');
      done();
    });

    it('fails on re', function (done: Function) {
      const fn = function () {
        regexy_to_regex(/re/);
      };
      expect(fn).to.throw(Error, /Regexy match failed for/);
      done();
    });
  });

  describe('.regexy_to_regex', function () {
    it('can run the function', function (done: Function) {
      expect(() => regexy_to_regex('//')).to.not.throw();
      done();
    });

    it('will throw on invalid input', function (done: Function) {
      const fn = function () {
        regexy_to_regex('/\(.*/');
      };
      expect(fn).to.throw(SyntaxError, /Invalid regular expression/);
      done();
    });

    it('works on "/test/"', function (done: Function) {
      expect(regexy_to_regex('/test/')).to.eql(/test/);
      done();
    });

    it('works on "/test/i"', function (done: Function) {
      expect(regexy_to_regex('/test/i')).to.eql(/test/i);
      done();
    });

    it('works on "/test/m"', function (done: Function) {
      expect(regexy_to_regex('/test/m')).to.eql(/test/m);
      done();
    });

    it('fails on "test"', function (done: Function) {
      const fn = function () {
        regexy_to_regex(/re/);
      };
      expect(fn).to.throw(Error, /Regexy match failed for/);
      done();
    });
  });

  describe('.array_replace', function () {
    xit('can run the function', function (done: Function) {
      expect(() => array_replace()).to.not.throw();
      done();
    });

    xit('works', function (done: Function) {
      const start = [5, 6];
      expect(array_replace(start, 7, 6)).to.eql([5, 7]);
      done();
    });
  });

  describe('.random_string', function () {
    it('generates a string of length 12', function (done: Function) {
      expect(random_string(12).length).to.equal(12);
      done();
    });

    it('generates only chars', function (done: Function) {
      const rnd = random_string(12);
      expect(rnd.length).to.equal(12);
      expect(rnd).to.match(/^[A-Za-z0-9]+$/);
      done();
    });
  });

  describe('.crypto_random_base62', function () {
    it('generates a string of length 12', function (done: Function) {
      expect(crypto_random_base62_string(12).length).to.equal(12);
      done();
    });

    it('generates a string of length 13', function (done: Function) {
      expect(crypto_random_base62_string(13).length).to.equal(13);
      done();
    });

    it('generates a string of length 14', function (done: Function) {
      expect(crypto_random_base62_string(14).length).to.equal(14);
      done();
    });

    it('generates only chars', function (done: Function) {
      const rnd = crypto_random_base62_string(13);
      expect(rnd.length).to.equal(13);
      expect(rnd).to.match(/^[A-Za-z0-9]+$/);
      done();
    });
  });

  describe('.crypto_random_base64', function () {
    it('generates a string of length 12 for 9 bytes', function (done: Function) {
      const result = crypto_random_base64(9);
      expect(result).to.have.keys('string', 'bytes');
      expect(result.bytes).to.be.an.instanceof(Buffer);
      expect(result.string.length).to.equal(12);
      done();
    });
  });

  describe('.crypto_random_hex', function () {
    it('generates a string of length 12 for 9 bytes', function (done: Function) {
      const result = crypto_random_hex(6);
      expect(result).to.have.keys('string', 'bytes');
      expect(result.bytes).to.be.an.instanceof(Buffer);
      expect(result.string.length).to.equal(12);
      done();
    });
  });
});
