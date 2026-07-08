//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Named config_spec2 because config_spec.ts already exists at test/unit/.
// This file covers the pieces the original spec skips.

const { expect } = require('../../mocha_helpers');
const { Config, get_instance } = require('../../../lib/config');

describe('Unit::EventConsole::lib::config', function() {

  describe('defaults', function() {
    it('populates app/mongodb/http/smtp/session/rules with default shapes', function() {
      const c = new Config('t-default', {});
      expect(c.app.name).to.equal('Panther');
      expect(c.app.view_limit).to.equal(2000);
      expect(c.app.apikey_limit).to.equal(7);
      expect(c.mongodb.uri).to.match(/^mongodb:\/\//);
      expect(c.mongodb.database).to.equal('oa');
      expect(c.http.port).to.equal(3001);
      expect(c.smtp.port).to.equal(25);
      expect(c.session.secret).to.be.a('string').and.have.lengthOf(64);
      expect(c.rules.types).to.include.members(['server', 'syslogd', 'http', 'graylog']);
    });

    it('merges user overrides into defaults', function() {
      const c = new Config('t-merge', {
        app: { name: 'Override', view_limit: 50 },
        http: { port: 9999 }
      });
      expect(c.app.name).to.equal('Override');
      expect(c.app.view_limit).to.equal(50);
      expect(c.app.apikey_limit).to.equal(7);
      expect(c.http.port).to.equal(9999);
    });
  });

  describe('get_instance', function() {
    it('returns a stable singleton keyed by name', function() {
      const a = get_instance('stable-key');
      const b = get_instance('stable-key');
      expect(a).to.equal(b);
    });

    it('separates instances by name', function() {
      const a = get_instance('name-a');
      const b = get_instance('name-b');
      expect(a).to.not.equal(b);
    });

    it('defaults to the "default" instance when no name is given', function() {
      expect(get_instance()).to.equal(get_instance('default'));
    });
  });

  describe('rules_path', function() {
    it('returns an absolute path when the type is registered', function() {
      const c = new Config('t-rp', {});
      const p = c.rules_path('server');
      expect(p).to.be.a('string');
      expect(p).to.contain('server');
    });

    it('throws a ValidationError for an unknown rule type', function() {
      const c = new Config('t-rp-bad', {});
      expect(() => c.rules_path('nosuch')).to.throw(/No rule type/);
    });
  });
});
