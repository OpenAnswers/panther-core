//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../mocha_helpers');

const fs = require('fs');
const path = require('path');

const { AutomationManager } = require('../../lib/automations');
const Trigger = require('../../lib/triggers').Trigger;
const Action = require('../../lib/actions').Action;

describe('AutomationManager', function () {
  describe('after("initialize")', function () {
    it('derives triggers_directory and actions_directory from the default automations_directory', function () {
      const m = new AutomationManager();
      expect(m.getAutoDir()).to.match(/automations$/);
      expect(m.getTriggersDir()).to.equal(m.getAutoDir() + '/triggers');
      expect(m.getActionsDir()).to.equal(m.getAutoDir() + '/actions');
    });

    it('honours a custom automations_directory at construction', function () {
      const m = new AutomationManager({ automations_directory: '/tmp/custom-autos' });
      expect(m.getAutoDir()).to.equal('/tmp/custom-autos');
      expect(m.getTriggersDir()).to.equal('/tmp/custom-autos/triggers');
      expect(m.getActionsDir()).to.equal('/tmp/custom-autos/actions');
    });
  });

  describe('sanitizeFiles', function () {
    // async.filter's iteratee in async ~1.5 is (item, cb) where cb receives
    // a boolean indicating whether to keep the item.
    it('keeps files whose name starts with a digit', function (done) {
      const m = new AutomationManager();
      m.sanitizeFiles('/some/dir/01_example.js', function (keep: boolean) {
        expect(keep).to.equal(true);
        done();
      });
    });

    it('rejects files whose name starts with a non-digit', function (done) {
      const m = new AutomationManager();
      m.sanitizeFiles('/some/dir/example.js', function (keep: boolean) {
        expect(keep).to.equal(false);
        done();
      });
    });

    it('rejects dotfiles', function (done) {
      const m = new AutomationManager();
      m.sanitizeFiles('/some/dir/.hidden.js', function (keep: boolean) {
        expect(keep).to.equal(false);
        done();
      });
    });

    it('uses the basename, not the full path', function (done) {
      const m = new AutomationManager();
      // Directory contains digits, filename does not — should be rejected
      m.sanitizeFiles('/07_my_dir/example.js', function (keep: boolean) {
        expect(keep).to.equal(false);
        done();
      });
    });
  });

  describe('loadAutomationComponent', function () {
    let readdir_stub: any;

    afterEach(function () {
      if (readdir_stub) {
        readdir_stub.restore();
        readdir_stub = null;
      }
    });

    it('propagates fs.readdir errors to finished_cb', function (done) {
      const boom = new Error('readdir failed');
      readdir_stub = sinon.stub(fs, 'readdir').callsFake((_dir: any, cb: any) => cb(boom, null));

      const m = new AutomationManager();
      const loader = sinon.spy();

      m.loadAutomationComponent('/some/dir', loader, function (err: any) {
        expect(err).to.equal(boom);
        expect(loader.called).to.equal(false);
        done();
      });
    });

    it('returns [] when the directory is empty', function (done) {
      readdir_stub = sinon.stub(fs, 'readdir').callsFake((_dir: any, cb: any) => cb(null, []));

      const m = new AutomationManager();
      const loader = sinon.spy();

      m.loadAutomationComponent('/some/dir', loader, function (err: any, results: any) {
        expect(err).to.equal(null);
        expect(results).to.eql([]);
        expect(loader.called).to.equal(false);
        done();
      });
    });

    it('returns [] when every filename is filtered out by sanitizeFiles', function (done) {
      readdir_stub = sinon
        .stub(fs, 'readdir')
        .callsFake((_dir: any, cb: any) => cb(null, ['.hidden', 'no_digit.js', 'README.md']));

      const m = new AutomationManager();
      const loader = sinon.spy();

      m.loadAutomationComponent('/some/dir', loader, function (err: any, results: any) {
        expect(err).to.equal(null);
        expect(results).to.eql([]);
        expect(loader.called).to.equal(false);
        done();
      });
    });

    it('calls the supplied loader for each accepted file and returns its results', function (done) {
      readdir_stub = sinon
        .stub(fs, 'readdir')
        .callsFake((_dir: any, cb: any) => cb(null, ['01_a.js', '02_b.js', 'skip.js']));

      const m = new AutomationManager();
      const loader = sinon.stub().callsFake((filepath: string, cb: any) => cb(null, 'loaded:' + filepath));

      m.loadAutomationComponent('/some/dir', loader, function (err: any, results: any) {
        expect(err).to.equal(null);
        expect(results).to.eql(['loaded:/some/dir/01_a.js', 'loaded:/some/dir/02_b.js']);
        expect(loader.callCount).to.equal(2);
        // each loader call receives the full file path
        expect(loader.firstCall.args[0]).to.equal('/some/dir/01_a.js');
        expect(loader.secondCall.args[0]).to.equal('/some/dir/02_b.js');
        done();
      });
    });

    it('propagates loader errors to finished_cb', function (done) {
      readdir_stub = sinon.stub(fs, 'readdir').callsFake((_dir: any, cb: any) => cb(null, ['01_a.js']));

      const m = new AutomationManager();
      const loader_err = new Error('loader boom');
      const loader = sinon.stub().callsFake((_p: any, cb: any) => cb(loader_err));

      m.loadAutomationComponent('/some/dir', loader, function (err: any) {
        expect(err).to.equal(loader_err);
        done();
      });
    });
  });

  describe('loadTriggers / loadActions', function () {
    it('loadTriggers forwards triggers_directory and Trigger.load to loadAutomationComponent', function (done) {
      const m = new AutomationManager();
      const stub = sinon
        .stub(m, 'loadAutomationComponent')
        .callsFake((_dir: any, _loader: any, cb: any) => cb(null, []));
      const trigger_load = sinon.stub(Trigger, 'load').returns({ kind: 'trigger' });

      m.loadTriggers(function (err: any) {
        expect(err).to.equal(null);
        expect(stub.calledOnce).to.equal(true);
        expect(stub.firstCall.args[0]).to.equal(m.getTriggersDir());

        // The loader wrapper passed in calls Trigger.load then cb(null, trigger)
        const loader_wrapper = stub.firstCall.args[1];
        loader_wrapper('/some/file.js', (err2: any, trig: any) => {
          expect(err2).to.equal(null);
          expect(trig).to.eql({ kind: 'trigger' });
          expect(trigger_load.calledWith('/some/file.js')).to.equal(true);

          stub.restore();
          trigger_load.restore();
          done();
        });
      });
    });

    it('loadActions forwards actions_directory and Action.load to loadAutomationComponent', function (done) {
      const m = new AutomationManager();
      const stub = sinon
        .stub(m, 'loadAutomationComponent')
        .callsFake((_dir: any, _loader: any, cb: any) => cb(null, []));
      const action_load = sinon.stub(Action, 'load').returns({ kind: 'action' });

      m.loadActions(function (err: any) {
        expect(err).to.equal(null);
        expect(stub.calledOnce).to.equal(true);
        expect(stub.firstCall.args[0]).to.equal(m.getActionsDir());

        const loader_wrapper = stub.firstCall.args[1];
        loader_wrapper('/some/act.js', (err2: any, act: any) => {
          expect(err2).to.equal(null);
          expect(act).to.eql({ kind: 'action' });
          expect(action_load.calledWith('/some/act.js')).to.equal(true);

          stub.restore();
          action_load.restore();
          done();
        });
      });
    });
  });

  describe('setup', function () {
    it('invokes loadActions and loadTriggers (in series) and fires the final callback', function (done) {
      const m = new AutomationManager();
      const loadActions = sinon.stub(m, 'loadActions').callsFake((cb: any) => cb(null));
      const loadTriggers = sinon.stub(m, 'loadTriggers').callsFake((cb: any) => cb(null));

      m.setup(function (err: any) {
        expect(err).to.equal(null);
        expect(loadActions.calledOnce).to.equal(true);
        expect(loadTriggers.calledOnce).to.equal(true);
        loadActions.restore();
        loadTriggers.restore();
        done();
      });
    });

    it('propagates errors from loadActions/loadTriggers', function (done) {
      const m = new AutomationManager();
      const boom = new Error('setup boom');
      const loadActions = sinon.stub(m, 'loadActions').callsFake((cb: any) => cb(boom));
      const loadTriggers = sinon.stub(m, 'loadTriggers').callsFake((cb: any) => cb(null));

      m.setup(function (err: any) {
        expect(err).to.equal(boom);
        loadActions.restore();
        loadTriggers.restore();
        done();
      });
    });
  });

  describe('start', function () {
    it('calls start() on every registered Trigger', function (done) {
      const fakes = [
        { start: sinon.stub().callsFake((cb: any) => cb(null)) },
        { start: sinon.stub().callsFake((cb: any) => cb(null)) },
        { start: sinon.stub().callsFake((cb: any) => cb(null)) },
      ];
      const all_stub = sinon.stub(Trigger, 'all').returns(fakes);

      const m = new AutomationManager();
      m.start(function (err: any) {
        expect(err).to.equal(null);
        for (const f of fakes) expect(f.start.calledOnce).to.equal(true);
        all_stub.restore();
        done();
      });
    });

    it('propagates errors from a failing Trigger.start', function (done) {
      const boom = new Error('trigger failed');
      const fakes = [
        { start: sinon.stub().callsFake((cb: any) => cb(null)) },
        { start: sinon.stub().callsFake((cb: any) => cb(boom)) },
      ];
      const all_stub = sinon.stub(Trigger, 'all').returns(fakes);

      const m = new AutomationManager();
      m.start(function (err: any) {
        expect(err).to.equal(boom);
        all_stub.restore();
        done();
      });
    });
  });
});
