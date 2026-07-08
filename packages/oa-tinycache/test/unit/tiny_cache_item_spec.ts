//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const expect = require('chai').expect;
const debug = require('debug')('oa:test:tinycache:tinycacheitem');

const { TinyCacheItem } = require('../../lib/tiny_cache');

describe('TinyCacheItem', function () {
  describe('simple instance', function () {
    let cache: any = null;
    let now: any = null;

    before(function () {
      now = Date.now();
      cache = new TinyCacheItem('that');
    });

    it('should the _value property', function () {
      expect(cache._value).to.eql('that');
    });

    it('should be created after now', function () {
      expect(cache.created).to.be.gte(now);
    });

    it('should have the same accessed and created times', function () {
      expect(cache.accessed).to.eql(cache.created);
    });

    it('should have the value', function () {
      expect(cache.value()).to.eql('that');
    });

    it('should default to a timeout of 60', function () {
      expect(cache.timeout).to.eql(60);
    });

    it('should have an expirey time 60s in the future', function () {
      expect(cache.expires).to.be.gte(now + 60 * 1000);
    });

    it('shouldnt be expired', function () {
      expect(cache.expired()).to.eql(false);
    });
  });

  xdescribe('expiry update', function () {
    let cache: any = null;
    let now: any = null;
    let accessed: any = null;
    let expires: any = null;

    before(function () {
      now = Date.now();
      cache = new TinyCacheItem('that');
      accessed = cache.accessed;
      expires = cache.expires;
    });

    it('updates the expires value', function () {
      accessed = cache.accessed;
      expires = cache.expires;
      for (let i = 1; i <= 5000; i++) {
        new TinyCacheItem('what', 60);
      }
      expect(cache.value_expirey()).to.eql('that');
      expect(cache.accessed).to.be.gt(accessed);
      expect(cache.expires).to.be.gt(expires);
    });
  });
});
