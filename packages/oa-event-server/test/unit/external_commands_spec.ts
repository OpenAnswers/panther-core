//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../mocha_helpers');

const fs = require('fs');
const os = require('os');
const path = require('path');

const ext_module = require('../../lib/external_commands');
const { ExternalCommand, run_trigger, update_alert } = ext_module;

describe('external_commands (ExternalCommand)', function () {
  // NOTE: run_trigger() and update_alert() reference an undeclared
  // `ExternalClasses` model and `oafserver` global — they cannot be unit-tested
  // here without substantial module rewiring. These specs cover the Joose class
  // behaviour only.

  let tmp_dir: string;
  let existing_cmd: string;

  before(function () {
    tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'extcmd-'));
    existing_cmd = path.join(tmp_dir, 'probe.sh');
    fs.writeFileSync(existing_cmd, '#!/bin/sh\necho ok\n', { mode: 0o755 });
  });

  after(function () {
    try {
      fs.rmSync(tmp_dir, { recursive: true, force: true });
    } catch {}
  });

  describe('initialize (cmd path + activation)', function () {
    it('activates when cmd is an absolute existing path', function () {
      const e = new ExternalCommand({ cmd: existing_cmd });
      expect(e.getCmd()).to.equal(existing_cmd);
      expect(e.getActivated()).to.equal(true);
    });

    it('deactivates when cmd is an absolute non-existent path', function () {
      const e = new ExternalCommand({ cmd: '/definitely/does/not/exist/xyz' });
      expect(e.getActivated()).to.equal(false);
    });

    // NOTE: the module tries to `this.setCmd(...)` on a relative path, but `cmd`
    // is declared `is: 'ro'` so no setter exists — relative cmds throw during
    // initialize(). Documented behaviour, not exercised here.
  });

  describe('env', function () {
    // NOTE: The `env` init function calls `this.setEnv(...)` inside Joose's init
    // hook, but those calls have no effect — attribute initialisation uses the
    // constructor value directly. Observed behaviour:
    //   * env not passed  -> getEnv() is undefined
    //   * env passed      -> getEnv() returns exactly what the caller passed
    // The OAF_ARG_COUNT tagging inside init is therefore dead code.

    it('getEnv returns undefined when env is not provided', function () {
      const e = new ExternalCommand({ cmd: existing_cmd });
      expect(e.getEnv()).to.equal(undefined);
    });

    it('getEnv returns the passed-in env object unchanged', function () {
      const src = { FOO: '1', BAR: '2' };
      const e = new ExternalCommand({ cmd: existing_cmd, env: src });
      expect(e.getEnv()).to.equal(src);
      expect(e.getEnv()).to.eql({ FOO: '1', BAR: '2' });
    });
  });

  describe('make_the_env', function () {
    it('prefixes each object env key with "0_" and sets OAF_ARG_COUNT = 1', function () {
      const e = new ExternalCommand({ cmd: existing_cmd, env: { NODE: 'host1', SEVERITY: '3' } });
      const shaped = e.make_the_env();
      expect(shaped.OAF_ARG_COUNT).to.equal(1);
      expect(shaped['0_NODE']).to.equal('host1');
      expect(shaped['0_SEVERITY']).to.equal('3');
      // raw keys must not leak through unprefixed
      expect(shaped.NODE).to.equal(undefined);
    });
  });

  describe('run', function () {
    it('does not spawn when the command is deactivated', function () {
      const e = new ExternalCommand({ cmd: '/nope/missing' });
      let called = false;
      // If spawn were invoked on a missing cmd we'd get an ENOENT error event —
      // but run() is supposed to early-return on !activated without calling fn.
      e.run(() => {
        called = true;
      });
      expect(called).to.equal(false);
    });

    it('spawns the activated command, captures stdout/stderr and yields the return code', function (done) {
      this.timeout(10_000);
      const script = path.join(tmp_dir, 'echo_both.sh');
      fs.writeFileSync(script, '#!/bin/sh\necho out-line\necho err-line >&2\nexit 0\n', { mode: 0o755 });
      const e = new ExternalCommand({ cmd: script, env: { FOO: 'bar' } });
      e.run((err: any, code: number) => {
        try {
          expect(err).to.be.null;
          expect(code).to.equal(0);
          expect(e.getStdout()).to.match(/out-line/);
          expect(e.getStderr()).to.match(/err-line/);
          done();
        } catch (ex) {
          done(ex);
        }
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // run_trigger / update_alert reference undeclared `ExternalClasses` and
  // `oafserver` globals that are installed by OAmonServer at runtime. The
  // tests below set them up for each case and tear them down afterwards.
  // ─────────────────────────────────────────────────────────────────────

  describe('run_trigger / update_alert', function () {
    let ec_findOne: any;
    let had_ExternalClasses: boolean;
    let had_oafserver: boolean;

    beforeEach(function () {
      ec_findOne = sinon.stub();
      had_ExternalClasses = 'ExternalClasses' in (global as any);
      had_oafserver = 'oafserver' in (global as any);
      (global as any).ExternalClasses = { findOne: ec_findOne };
      (global as any).oafserver = {
        alerts: {
          hasColumn: (key: string) => key === 'node' || key === 'severity',
        },
      };
    });

    afterEach(function () {
      if (!had_ExternalClasses) delete (global as any).ExternalClasses;
      if (!had_oafserver) delete (global as any).oafserver;
    });

    describe('run_trigger', function () {
      it('propagates ExternalClasses.findOne errors via the callback', function (done) {
        ec_findOne.callsFake((_q: any, cb: any) => cb(new Error('db down')));
        run_trigger('any', { NODE: 'h' }, (err: any) => {
          try {
            expect(err).to.be.an('error');
            expect(err.message).to.equal('db down');
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('returns "missing trigger" when the trigger row is not found', function (done) {
        ec_findOne.callsFake((_q: any, cb: any) => cb(null, null));
        run_trigger('does-not-exist', null, (err: any) => {
          try {
            expect(err).to.equal('missing trigger');
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('spawns the configured command and yields stdout data through the callback', function (done) {
        this.timeout(10_000);
        const script = path.join(tmp_dir, 'trigger_out.sh');
        fs.writeFileSync(script, '#!/bin/sh\necho node=host1\n', { mode: 0o755 });

        ec_findOne.callsFake((_q: any, cb: any) => cb(null, { trigger_name: 'tone', command: script }));

        let fired = false;
        run_trigger('tone', { SEVERITY: '5' }, (err: any, data: any) => {
          if (fired) return;
          fired = true;
          try {
            expect(err).to.be.null;
            expect(String(data)).to.match(/node=host1/);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    });

    describe('update_alert', function () {
      it('propagates errors from run_trigger', function (done) {
        ec_findOne.callsFake((_q: any, cb: any) => cb(new Error('boom')));
        update_alert('tone', {}, (err: any) => {
          try {
            expect(err).to.be.an('error');
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('parses key=value lines, keeping only known columns and dropping junk', function (done) {
        this.timeout(10_000);
        const script = path.join(tmp_dir, 'update_out.sh');
        fs.writeFileSync(
          script,
          '#!/bin/sh\necho "garbage line"\necho "node=host42"\necho "unknown_field=ignored"\necho "severity=2"\n',
          { mode: 0o755 }
        );

        ec_findOne.callsFake((_q: any, cb: any) => cb(null, { trigger_name: 'tone', command: script }));

        let fired = false;
        update_alert('tone', { NODE: 'host1' }, (err: any, updates: any) => {
          if (fired) return;
          fired = true;
          try {
            expect(err).to.be.null;
            expect(updates).to.eql({ node: 'host42', severity: '2' });
            expect(updates).to.not.have.property('unknown_field');
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    });
  });
});
