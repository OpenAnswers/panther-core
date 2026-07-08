//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { NewsRequest } = require('../../../app/controller/news');

const fs = require('fs');
const path = require('path');
const nock = require('nock');

describe('Unit::EventConsole::controller::news', function () {
  afterEach(function () {
    sinon.restore();
    NewsRequest.store.reset?.();
  });

  describe('fetch', function () {
    it('returns the cached value when present without calling request()', async function () {
      const cached = [{ title: 'from-cache' }];
      sinon.stub(NewsRequest.store, 'get').returns(cached);
      const reqStub = sinon.stub(NewsRequest, 'request').resolves([{ title: 'fresh' }]);

      const result = await NewsRequest.fetch('http://example/feed');
      expect(result).to.equal(cached);
      expect(reqStub.called).to.be.false;
    });

    it('delegates to request() on cache miss', async function () {
      sinon.stub(NewsRequest.store, 'get').returns(undefined);
      const reqStub = sinon.stub(NewsRequest, 'request').resolves([{ title: 'fresh' }]);

      const result = await NewsRequest.fetch('http://example/feed');
      expect(reqStub.calledWith('http://example/feed')).to.be.true;
      expect(result).to.deep.equal([{ title: 'fresh' }]);
    });

    it('propagates rejection from request() on cache miss', async function () {
      sinon.stub(NewsRequest.store, 'get').returns(undefined);
      sinon.stub(NewsRequest, 'request').rejects(new Error('network'));

      let threw: any;
      try {
        await NewsRequest.fetch('http://example/feed');
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.an('error');
      expect(threw.message).to.equal('network');
    });
  });

  describe('fetch_news', function () {
    it('fetches the configured feed url', async function () {
      const fetchStub = sinon.stub(NewsRequest, 'fetch').resolves([]);
      await NewsRequest.fetch_news();
      expect(fetchStub.calledWith('https://blog.example.com/feed/')).to.be.true;
    });
  });

  describe('request', function () {
    const FEED_HOST = 'http://news.example';
    const FEED_PATH = '/feed';
    const FEED_URL = FEED_HOST + FEED_PATH;

    let fixture_xml: string;

    before(function () {
      fixture_xml = fs.readFileSync(path.join(__dirname, '../../fixture/news-feed.xml'), 'utf8');
      nock.disableNetConnect();
    });

    after(function () {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    afterEach(function () {
      nock.cleanAll();
      // TinyCache has no reset(); evict per-url so the next test sees a miss.
      NewsRequest.store.del(FEED_URL);
    });

    it('fetches, parses the feed, and stores the items in the cache', async function () {
      this.timeout(10_000);
      nock(FEED_HOST).get(FEED_PATH).reply(200, fixture_xml, { 'Content-Type': 'application/rss+xml' });

      const items = await NewsRequest.request(FEED_URL);
      expect(items).to.be.an('array').with.lengthOf.at.least(1);
      expect(items[0]).to.have.property('title');
      expect(items[0]).to.have.property('link');
      // result is also written to the per-url cache
      expect(NewsRequest.store.get(FEED_URL)).to.equal(items);
    });

    it('rejects on a non-200 response (status check or feedparser error, whichever wins)', async function () {
      // The implementation pipes needle → feedparser as soon as the request
      // starts, so a non-RSS body can produce a feedparser error before
      // needle's response callback runs the statusCode check. Either rejection
      // is acceptable here — we just want a rejection, no items, no cache write.
      this.timeout(10_000);
      nock(FEED_HOST).get(FEED_PATH).reply(500, 'oops');

      let threw: any;
      try {
        await NewsRequest.request(FEED_URL);
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.an('error');
      expect(NewsRequest.store.get(FEED_URL)).to.equal(false);
    });

    it('rejects when the underlying HTTP request errors', async function () {
      this.timeout(10_000);
      nock(FEED_HOST).get(FEED_PATH).replyWithError(new Error('socket hangup'));

      let threw: any;
      try {
        await NewsRequest.request(FEED_URL);
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.an('error');
      expect(threw.message).to.match(/socket hangup/);
    });

    it('rejects when feedparser fails on malformed XML', async function () {
      this.timeout(10_000);
      nock(FEED_HOST).get(FEED_PATH).reply(200, '<<< not valid rss >>>', { 'Content-Type': 'application/rss+xml' });

      let threw: any;
      try {
        await NewsRequest.request(FEED_URL);
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.an('error');
      expect(NewsRequest.store.get(FEED_URL)).to.equal(false);
    });
  });
});
