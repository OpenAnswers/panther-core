//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const expect = require('chai').expect;
const debug = require('debug')('oa:test:tinycache:tinycache');

const TinyCache = require('../../lib/tiny_cache').TinyCache;

describe('TinyCache', function () {
  it('should set, get and del a value', function () {
    const cache = new TinyCache();
    expect(cache.set('what', 'that')).to.eql('that');
    expect(cache.get('what')).to.eql('that');
    expect(cache.del('what')).to.eql(true);
    expect(cache.get('what')).to.eql(false);
  });

  it('doesnt set a falsey value', function () {
    const cache = new TinyCache();
    const fn = function () {
      cache.set('what', false);
    };
    expect(fn).to.throw(/Can't store falsey values/);
  });

  it('deletes an entry', function () {
    const cache = new TinyCache();
    cache.set('what', 1);
    expect(cache.del('what')).to.eql(true);
  });

  it("can't delete a non existant entry", function () {
    const cache = new TinyCache();
    expect(cache.del('what')).to.eql(false);
  });

  it('expires entries in a non background expire cache', function (done) {
    const cache = new TinyCache({ timeout: 0.1 });
    expect(cache.set('what', 'that')).to.eql('that');
    expect(cache.get('what')).to.eql('that');
    setTimeout(function () {
      expect(cache.get('what')).to.eql(false);
      done();
    }, 150);
  });

  describe('does expire entries in a non background expire cache', function () {
    let cache: any = null;

    before(function () {
      cache = new TinyCache({ timeout: 0.1, limit: 4 });
      for (let i = 1; i <= 4; i++) {
        cache.set(`what${i}`, `that${i}`);
      }
    });

    it('has what1', function () {
      expect(cache.get('what4')).to.eql('that4');
    });

    it('expires', async function () {
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('what1')).to.equal(false);
      cache.expire();
    });

    it('has no entries', function () {
      expect(Array.from(cache.store.entries())).to.eql([]);
    });

    it('has a size of 0', function () {
      expect(cache.store.size).to.equal(0);
    });

    it('has a total of 0', function () {
      expect(cache.total()).to.equal(0);
    });
  });

  it('should run the expirey_cb callback function during expire', function (done) {
    const cache = new TinyCache({
      timeout: 0.1,
      limit: 5,
      bg_expire: 0.15,
      expirey_cb: function (err: any) {
        try {
          expect(err).to.equal(null);
          cache.cleanup();
          done();
        } catch (e) {
          done(e);
        }
      },
    });
    expect(cache).to.be.an.instanceof(TinyCache);
    cache.set('what1', 'that1');
    cache.set('what2', 'that2');
    cache.set('what3', 'that3');
  });

  it('should run the force_expirey callback when force expire runs', function (done) {
    const cache = new TinyCache({
      timeout: 10,
      limit: 1,
      force_expirey_cb: function (err: any) {
        try {
          expect(err).to.equal(null);
          done();
        } catch (e) {
          done(e);
        }
      },
    });
    expect(cache).to.be.an.instanceof(TinyCache);
    cache.set('what1', 'that1');
    cache.set('what2', 'that2');
    cache.set('what3', 'that3');
  });

  it('should run a background expire when defined', function (done) {
    const cache = new TinyCache({ timeout: 0.05, limit: 2, bg_expire: 0.1 });
    for (let i = 1; i <= 3; i++) {
      cache.set(`what${i}`, `that${i}`);
    }
    setTimeout(function () {
      expect(cache.total()).to.equal(0);
      cache.cleanup();
      done();
    }, 150);
  });

  it('should force an expire', function (done) {
    const cache = new TinyCache({ timeout: 1, limit: 5 });
    for (let i = 1; i <= 8; i++) {
      cache.set(`what${i}`, `that${i}`);
    }
    cache.expire_force();
    expect(cache.total()).to.equal(4);
    done();
  });

  it('drops the cache', function () {
    const cache = new TinyCache({ timeout: 100, limit: 100 });
    cache.set('what', 'that');
    expect(cache.get('what')).to.eql('that');
    cache.drop();
    expect(cache.get('what')).to.eql(false);
  });
});
