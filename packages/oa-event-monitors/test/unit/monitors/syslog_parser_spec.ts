//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// syslog/parser.js exports a `parse` function attached to `this`. Call sites
// use `new syslog.parse(line)` which runs the function with a fresh `this`
// so the mutated `this` effectively becomes the parsed object.

process.env.NODE_ENV = 'test';

const { expect } = require('../../mocha_helpers');
const syslog = require('../../../lib/syslog/parser');

describe('Unit::EventMonitors::syslog::parser', function () {
  describe('RFC3164-style lines', function () {
    it('parses month, dom, time, hostname, daemon, message and splits daemon[pid]', function () {
      const p: any = new (syslog.parse as any)('Oct 24 22:39:25 server-a sshd[12345]: Accepted password for alice');

      expect(p.month).to.equal('Oct');
      expect(p.dom).to.equal('24');
      expect(p.time).to.equal('22:39:25');
      expect(p.hours).to.equal('22');
      expect(p.minutes).to.equal('39');
      expect(p.seconds).to.equal('25');
      expect(p.hostname).to.equal('server-a');
      expect(p.daemon).to.equal('sshd');
      expect(p.pid).to.equal('12345');
      expect(p.message).to.equal('Accepted password for alice');
    });

    it('parses a daemon without a bracketed pid', function () {
      const p: any = new (syslog.parse as any)('Oct 24 22:39:25 server-a cron: morning job');

      expect(p.daemon).to.equal('cron');
      expect(p.pid).to.equal(undefined);
      expect(p.message).to.equal('morning job');
    });

    it('stores the original line on msg', function () {
      const line = 'Jan  1 00:00:00 h d[1]: hi';
      const p: any = new (syslog.parse as any)(line);
      expect(p.msg).to.equal(line);
    });
  });

  describe('unparseable lines', function () {
    it('throws when the line does not match any known shape', function () {
      expect(function () {
        new (syslog.parse as any)('totally not a syslog line');
      }).to.throw(/Failed to parse/);
    });

    it('includes the original message in the thrown error', function () {
      const bad = 'random nonsense';
      let err: any = null;
      try {
        new (syslog.parse as any)(bad);
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.message).to.include(bad);
    });

    it('throws for partial matches (month + dom only) — logs match5 internally', function () {
      // "Oct 24" on its own hits match 4 in the fallback chain and still throws.
      expect(function () {
        new (syslog.parse as any)('Oct 24');
      }).to.throw(/Failed to parse/);
    });

    it('throws for a line missing the daemon/message portion', function () {
      expect(function () {
        new (syslog.parse as any)('Oct 24 22:39:25 server-a');
      }).to.throw(/Failed to parse/);
    });
  });
});
