//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// OaMon lifecycle methods. The existing common_spec.ts only covers
// construction; this spec exercises the per-stage methods that are safe to
// drive from a unit test (no port binding, no process.exit hosing).
//
// Skipped here (documented for the test plan):
//   * start()        — orchestrator that calls process.exit(1) on stage error
//   * setupNconf()   — branches with process.exit(0) and process.exit(2)
//   * httpListen()   — express.listen on the agent's http port
//   * socketListen() — socket.io binds the agent's ws port
//   * connectToServer() — modest ROI given the MonitorClient ceremony involved

const { expect, sinon } = require('../mocha_helpers');

const fs = require('fs');
const os = require('os');
const path = require('path');

const nconf = require('nconf');
const OaMon = require('../../common');

describe('OaMon lifecycle', function () {
  let tmp_dir: string;
  let oamon: any;

  before(function () {
    tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oamon-'));
  });

  after(function () {
    try {
      fs.rmSync(tmp_dir, { recursive: true, force: true });
    } catch (_) {
      /* best effort */
    }
  });

  beforeEach(function () {
    oamon = new OaMon();
    // self.monitor / self.state are normally populated by connectToServer; stub
    // them so a single method under test runs in isolation.
    oamon.monitor = {
      sendAlert: sinon.stub(),
      sendOneAlert: sinon.stub(),
    };
    oamon.state = {
      established: () => ({ identifier: 'state:est' }),
      start: () => ({ identifier: 'state:start' }),
      stop: () => ({ identifier: 'state:stop' }),
      amalive: () => ({ identifier: 'state:amalive' }),
      rules_reloaded: () => ({ identifier: 'state:reload' }),
    };
  });

  afterEach(function () {
    sinon.restore();
    if (oamon?.heartbeat_interval) clearInterval(oamon.heartbeat_interval);
  });

  // ─────────────────────────────────────────────────────────────────────
  // readyAlerts — installs the 'newalert' handler with several discard /
  // coercion branches.
  // ─────────────────────────────────────────────────────────────────────
  describe('readyAlerts', function () {
    function stub_nconf(overrides: any = {}) {
      sinon.stub(nconf, 'get').callsFake((key: string) => {
        if (key in overrides) return overrides[key];
        if (key === 'agent:type') return 'sample';
        if (key === 'oneshot') return false;
        return undefined;
      });
    }

    function inject_rules(produced: any) {
      // The handler does `self.agent_rules.rules(e, obj)` — assign the desired
      // result onto e so we can drive each branch deterministically.
      oamon.agent_rules = {
        rules: function (e: any, _obj: any) {
          Object.assign(e, produced);
        },
      };
    }

    it('happy path: forwards a structured event to monitor.sendAlert', function () {
      stub_nconf();
      inject_rules({ severity: 3, identifier: 'host:3:msg' });

      const cb = sinon.stub();
      oamon.readyAlerts(sinon.stub());
      oamon.emit('newalert', { raw: 1 }, cb);

      expect(oamon.monitor.sendAlert.calledOnce).to.equal(true);
      const ev = oamon.monitor.sendAlert.firstCall.args[0];
      expect(ev.identifier).to.equal('host:3:msg');
      expect(ev.agent).to.equal('sample');
      expect(oamon.monitor.sendOneAlert.called).to.equal(false);
    });

    it('discards events with severity < 0 and notifies all callbacks', function () {
      stub_nconf();
      inject_rules({ severity: -1, identifier: 'never' });

      const cb = sinon.stub();
      const qcb = sinon.stub();
      const lcb = sinon.stub();
      oamon.readyAlerts(sinon.stub());
      oamon.emit('newalert', { raw: 1 }, cb, qcb, lcb);

      expect(oamon.monitor.sendAlert.called).to.equal(false);
      for (const stub of [cb, qcb, lcb]) {
        expect(stub.calledOnce).to.equal(true);
        const [err, res] = stub.firstCall.args;
        expect(err).to.equal(null);
        expect(res.status).to.equal('discarded');
      }
    });

    it('drops events with a null identifier', function () {
      stub_nconf();
      inject_rules({ severity: 3, identifier: null });

      const cb = sinon.stub();
      oamon.readyAlerts(sinon.stub());
      oamon.emit('newalert', { raw: 1 }, cb);

      expect(oamon.monitor.sendAlert.called).to.equal(false);
      expect(cb.firstCall.args[1].message).to.match(/missing identifier/);
    });

    it('coerces a non-string identifier to a string before sending', function () {
      stub_nconf();
      inject_rules({ severity: 3, identifier: 12345 });

      oamon.readyAlerts(sinon.stub());
      oamon.emit('newalert', { raw: 1 });

      expect(oamon.monitor.sendAlert.calledOnce).to.equal(true);
      const ev = oamon.monitor.sendAlert.firstCall.args[0];
      expect(ev.identifier).to.equal('12345');
    });

    it('truncates an identifier longer than 1024 characters', function () {
      stub_nconf();
      const long_id = 'x'.repeat(2000);
      inject_rules({ severity: 3, identifier: long_id });

      oamon.readyAlerts(sinon.stub());
      oamon.emit('newalert', { raw: 1 });

      expect(oamon.monitor.sendAlert.calledOnce).to.equal(true);
      const ev = oamon.monitor.sendAlert.firstCall.args[0];
      expect(ev.identifier.length).to.equal(1012);
    });

    it('routes through sendOneAlert when oneshot mode is on', function () {
      stub_nconf({ oneshot: true });
      inject_rules({ severity: 3, identifier: 'os:1' });

      oamon.readyAlerts(sinon.stub());
      oamon.emit('newalert', { raw: 1 });

      expect(oamon.monitor.sendOneAlert.calledOnce).to.equal(true);
      expect(oamon.monitor.sendAlert.called).to.equal(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // startHeartbeat — both the disabled and the enabled (interval) branches.
  // ─────────────────────────────────────────────────────────────────────
  describe('startHeartbeat', function () {
    it('does not schedule when heartbeating is below the minimum period', function (done) {
      sinon.stub(nconf, 'get').callsFake((key: string) => {
        if (key === 'oneshot') return false;
        if (key === 'agent:heartbeating') return 0; // < MINIMUM (1)
        return undefined;
      });

      oamon.startHeartbeat(function (err: any) {
        try {
          expect(err).to.equal(null);
          expect(oamon.heartbeat_interval).to.equal(undefined);
          expect(oamon.monitor.sendAlert.called).to.equal(false);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('schedules a periodic sendAlert when enabled', function (done) {
      const clock = sinon.useFakeTimers();
      sinon.stub(nconf, 'get').callsFake((key: string) => {
        if (key === 'oneshot') return false;
        if (key === 'agent:heartbeating') return 5; // 5 seconds
        return undefined;
      });

      oamon.startHeartbeat(function (err: any) {
        let testError: any = null;
        try {
          expect(err).to.equal(null);
          expect(oamon.heartbeat_interval).to.exist;
          clock.tick(5_000);
          expect(oamon.monitor.sendAlert.calledOnce).to.equal(true);
          clock.tick(5_000);
          expect(oamon.monitor.sendAlert.calledTwice).to.equal(true);
        } catch (e) {
          testError = e;
        }
        clearInterval(oamon.heartbeat_interval);
        clock.restore();
        done(testError);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // loadAgent / loadRules / loadYamlRules / loadJsRules
  // ─────────────────────────────────────────────────────────────────────
  describe('loadAgent', function () {
    // loadAgent does `require(path.join(monitorLibDir, nconf.get('agent:type')))`.
    // path.join treats a leading-slash second arg as relative, so to point at a
    // tmp file we feed it the path relative to monitorLibDir; the join then
    // resolves back to the tmp location.
    const monitorLibDir = path.resolve(__dirname, '../../lib');

    function relativise(absPath: string): string {
      return path.relative(monitorLibDir, absPath);
    }

    it('requires the agent module and stores the Agent class', function (done) {
      const agent_path = path.join(tmp_dir, 'happy_agent.js');
      fs.writeFileSync(
        agent_path,
        'function Agent(opts) { this.opts = opts; }\n' +
          'Agent.getProperties = function() { return ["foo"]; };\n' +
          'Agent.prototype.start = function(cb) { cb(null); };\n' +
          'module.exports.Agent = Agent;'
      );
      const rel = relativise(path.join(tmp_dir, 'happy_agent'));
      sinon.stub(nconf, 'get').callsFake((key: string) => (key === 'agent:type' ? rel : undefined));

      // Happy path: the catch never fires, so callback is invoked exactly once
      // (the unconditional `callback(null)` at the bottom of loadAgent).
      oamon.loadAgent(function (err: any) {
        try {
          expect(err).to.equal(null);
          expect(oamon.Agent).to.be.a('function');
          expect(oamon.Agent.getProperties()).to.eql(['foo']);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('reports an error when the agent module has no Agent export (and the trailing callback fires anyway)', function (done) {
      const agent_path = path.join(tmp_dir, 'no_agent.js');
      fs.writeFileSync(agent_path, 'module.exports = {};');
      const rel = relativise(path.join(tmp_dir, 'no_agent'));
      sinon.stub(nconf, 'get').callsFake((key: string) => (key === 'agent:type' ? rel : undefined));

      const calls: any[] = [];
      oamon.loadAgent(function (err: any) {
        calls.push(err);
        if (calls.length === 2) {
          try {
            // Documented dual-callback bug: error first, then null at the bottom.
            expect(calls[0]).to.be.an('error');
            expect(calls[0].message).to.match(/Missing Agent export/);
            expect(calls[1]).to.equal(null);
            done();
          } catch (e) {
            done(e);
          }
        }
      });
    });
  });

  describe('loadYamlRules / loadJsRules / loadRules', function () {
    const YAML_RULES = path.resolve(__dirname, '../../etc/http.rules.yml');

    it('loadYamlRules: builds an EventRules instance from a YAML file', function () {
      oamon.agent_rules_file = YAML_RULES;
      oamon.loadYamlRules();
      expect(oamon.agent_rules).to.exist;
      expect(oamon.agent_rules.rules).to.be.a('function');
    });

    it('loadJsRules: requires the JS file and assigns it to agent_rules', function () {
      const rules_path = path.join(tmp_dir, 'jsrules.js');
      fs.writeFileSync(rules_path, 'module.exports = { rules: function(e) { e.identifier = "from-js"; } };');
      oamon.agent_rules_file = rules_path;
      oamon.loadJsRules();
      expect(oamon.agent_rules.rules).to.be.a('function');

      const e: any = {};
      oamon.agent_rules.rules(e);
      expect(e.identifier).to.equal('from-js');
    });

    it('loadRules: dispatches to loadYamlRules for *.yml extension', function (done) {
      oamon.agent_rules_file = YAML_RULES;
      oamon.loadRules(function (err: any, msg: any) {
        try {
          expect(err).to.equal(null);
          expect(msg).to.equal('rules loaded');
          expect(oamon.agent_rules).to.exist;
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('loadRules: dispatches to loadJsRules for *.js extension', function (done) {
      const rules_path = path.join(tmp_dir, 'jsrules2.js');
      fs.writeFileSync(rules_path, 'module.exports = { rules: function() {} };');
      oamon.agent_rules_file = rules_path;
      oamon.loadRules(function (err: any) {
        try {
          expect(err).to.equal(null);
          expect(oamon.agent_rules.rules).to.be.a('function');
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // startAgent — constructs the agent class assigned by loadAgent.
  // ─────────────────────────────────────────────────────────────────────
  describe('startAgent', function () {
    it('builds the agent with props from nconf and calls .start', function (done) {
      const start_stub = sinon.stub().callsFake(function (cb: any) {
        cb(null);
      });
      function FakeAgent(opts: any) {
        this.opts = opts;
        this.start = start_stub;
      }
      (FakeAgent as any).getProperties = () => ['p1', 'p2'];
      oamon.Agent = FakeAgent;

      sinon.stub(nconf, 'get').callsFake((key: string) => {
        if (key === 'oneshot') return false;
        if (key === 'props:p1') return 'one';
        if (key === 'props:p2') return 'two';
        return undefined;
      });

      oamon.startAgent(function (err: any) {
        try {
          expect(err).to.equal(null);
          expect(oamon.agent).to.be.instanceof(FakeAgent);
          expect(oamon.agent.opts.props).to.eql({ p1: 'one', p2: 'two' });
          expect(start_stub.calledOnce).to.equal(true);
          // sendAlert(state.start()) fires once for non-oneshot
          expect(oamon.monitor.sendAlert.calledOnce).to.equal(true);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('skips the sendAlert(state.start()) when oneshot is on', function (done) {
      function FakeAgent(_opts: any) {
        this.start = (cb: any) => cb(null);
      }
      (FakeAgent as any).getProperties = () => [];
      oamon.Agent = FakeAgent;

      sinon.stub(nconf, 'get').callsFake((key: string) => (key === 'oneshot' ? true : undefined));

      oamon.startAgent(function (err: any) {
        try {
          expect(err).to.equal(null);
          expect(oamon.monitor.sendAlert.called).to.equal(false);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // registerSignalHandlers — installs SIGINT / SIGUSR1, then calls back.
  // We restore the listeners we add so we don't pollute the mocha process.
  // ─────────────────────────────────────────────────────────────────────
  describe('registerSignalHandlers', function () {
    it('adds one SIGINT and one SIGUSR1 listener and invokes the callback', function (done) {
      const sigint_before = process.listenerCount('SIGINT');
      const sigusr1_before = process.listenerCount('SIGUSR1');

      oamon.registerSignalHandlers(function (err: any) {
        const sigint_after = process.listenerCount('SIGINT');
        const sigusr1_after = process.listenerCount('SIGUSR1');

        // Pop the listeners we added so this test is hermetic.
        process.removeListener('SIGINT', process.listeners('SIGINT').slice(-1)[0]);
        process.removeListener('SIGUSR1', process.listeners('SIGUSR1').slice(-1)[0]);

        try {
          expect(err).to.equal(null);
          expect(sigint_after).to.equal(sigint_before + 1);
          expect(sigusr1_after).to.equal(sigusr1_before + 1);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
