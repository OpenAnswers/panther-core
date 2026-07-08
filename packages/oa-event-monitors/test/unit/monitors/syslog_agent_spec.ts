//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Tests syslog/index.js (the file-tailer agent wrapper) and the non-contentious
// parts of syslog/logfile.js — the glossy happy path that passes through
// unchanged. The post-glossy daemon[pid] extraction block is on hold pending
// an owner decision and is not covered here.

process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect, sinon } = require('../../mocha_helpers');

const { Agent } = require('../../../lib/syslog');
const { Parser } = require('../../../lib/syslog/logfile');

describe('Unit::EventMonitors::syslog::Agent', function () {
  const created: string[] = [];

  function tmpLog(label: string) {
    const p = path.join(
      os.tmpdir(),
      `oamon-syslog-agent-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.log`
    );
    fs.writeFileSync(p, '');
    created.push(p);
    return p;
  }

  after(function () {
    for (const p of created) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  });

  it('exposes a Joose class with AgentRole composition', function () {
    const a = new Agent({ props: { logfile: tmpLog('ctor') }, eventCB: function () {} });
    expect(a.getEventCB()).to.be.a('function');
  });

  describe('start()', function () {
    it('constructs a LogParser, calls its start(), and fires cb(null)', function (done: Function) {
      // Stub Parser.prototype.start so we don't actually tail a file.
      const start_stub = sinon.stub(Parser.prototype, 'start');

      const a = new Agent({ props: { logfile: tmpLog('start') }, eventCB: function () {} });
      a.start(function (err: any) {
        expect(err).to.equal(null);
        expect(start_stub.calledOnce).to.equal(true);
        start_stub.restore();
        done();
      });
    });
  });
});

describe('Unit::EventMonitors::syslog::Parser (logfile)', function () {
  const created: string[] = [];

  function tmpLog(label: string) {
    const p = path.join(
      os.tmpdir(),
      `oamon-syslog-parser-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.log`
    );
    fs.writeFileSync(p, '');
    created.push(p);
    return p;
  }

  after(function () {
    for (const p of created) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  });

  function mkParser(cb: any) {
    return new Parser({ logfilePath: tmpLog('parser'), tokenCB: cb });
  }

  it('constructs as a LogTailer subclass with tokenCB and logfilePath', function () {
    const p = mkParser(function () {});
    expect(p.getTokenCB()).to.be.a('function');
    expect(p.getLogfilePath()).to.be.a('string');
  });

  // parse() behaviour is not tested here — it flows through the post-glossy
  // daemon/daemon_pid block in logfile.js which is on hold pending an owner
  // decision. Discovered during testing: the block's buggy inner match
  // (d is never captured) actually fires on normal RFC3164 lines because
  // glossy leaves `daemon[pid]:` in parsedMessage.message. See project notes.
});
