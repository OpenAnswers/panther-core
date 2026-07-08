//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../mocha_helpers');

const { ServerConfig } = require('../../lib/server_config');

describe('ServerConfig', function () {
  let config: any;

  before(function () {
    config = new ServerConfig({});
  });

  it('exposes a numeric server Port from defaults', function () {
    expect(config.Port()).to.be.a('number');
    expect(config.Port()).to.be.greaterThan(0);
  });

  it('exposes a numeric DeltaPort from defaults', function () {
    expect(config.DeltaPort()).to.be.a('number');
  });

  it('builds a mongodb DbConnectionString from its parts', function () {
    const cs = config.DbConnectionString();
    expect(cs).to.be.a('string');
    expect(cs).to.match(/^mongodb:\/\/.+:\d+\/.+$/);
    expect(cs).to.include(config.DbHostname());
    expect(cs).to.include(String(config.DbPort()));
    expect(cs).to.include(config.DbCollection());
  });

  it('exposes numeric expire TTLs', function () {
    expect(config.ExpireMatches()).to.be.a('number');
    expect(config.ExpireOccurrences()).to.be.a('number');
    expect(config.ExpireMatches()).to.be.greaterThan(0);
    expect(config.ExpireOccurrences()).to.be.greaterThan(0);
  });

  it('exposes a RulesFile path and boolean RulesTracking', function () {
    expect(config.RulesFile()).to.be.a('string');
    expect(config.RulesFile()).to.match(/server\.rules\.yml$/);
    expect(config.RulesTracking()).to.equal(true);
  });

  it('exposes the LogComponents list', function () {
    const comps = config.LogComponents();
    expect(comps).to.be.an('array');
    expect(comps).to.include('server');
    expect(comps).to.include('trigger');
  });

  describe('numeric validation', function () {
    // Rather than muck with the shared nconf singleton, stub the instance's
    // nconf.get directly so each test can inject a bad value for one key.
    function stub_get(overrides: Record<string, any>) {
      const real = config.nconf.get.bind(config.nconf);
      return sinon.stub(config.nconf, 'get').callsFake((key: string) => {
        if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key];
        return real(key);
      });
    }

    it('Port() throws when port is not a number', function () {
      const stub = stub_get({ port: 'not-a-number' });
      try {
        expect(() => config.Port()).to.throw(/port not a number/);
      } finally {
        stub.restore();
      }
    });

    it('ExpireMatches() throws when the ttl is not a number', function () {
      const stub = stub_get({ 'expires:alert_matches': 'forever' });
      try {
        expect(() => config.ExpireMatches()).to.throw(/expire:alert_matches not a number/);
      } finally {
        stub.restore();
      }
    });

    it('ExpireOccurrences() throws when the ttl is not a number', function () {
      const stub = stub_get({ 'expires:alert_occurrences': 'forever' });
      try {
        expect(() => config.ExpireOccurrences()).to.throw(/expire:alert_occurrences not a number/);
      } finally {
        stub.restore();
      }
    });

    it('DbPort() throws when db:port is not a number', function () {
      const stub = stub_get({ 'db:port': 'xyz' });
      try {
        expect(() => config.DbPort()).to.throw(/db:port not a number/);
      } finally {
        stub.restore();
      }
    });
  });
});
