//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect, sinon } = require('../../mocha_helpers');

const { FileWatcher } = require('../../../lib/utils/file_watcher');

describe('Unit::EventMonitors::utils::FileWatcher', function () {
  const created: string[] = [];

  function tmpPath(label: string) {
    const p = path.join(
      os.tmpdir(),
      `oamon-filewatcher-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.log`
    );
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

  describe('construction', function () {
    it('requires a filePath', function () {
      expect(function () {
        new FileWatcher({});
      }).to.throw();
    });

    it('applies a default polling interval of 500ms', function () {
      const w = new FileWatcher({ filePath: '/tmp/nope' });
      expect(w.getInterval()).to.equal(500);
    });

    it('accepts a custom polling interval', function () {
      const w = new FileWatcher({ filePath: '/tmp/nope', interval: 250 });
      expect(w.getInterval()).to.equal(250);
    });

    it('inherits from EventEmitter (on/emit available)', function () {
      const w = new FileWatcher({ filePath: '/tmp/nope' });
      expect(w.on).to.be.a('function');
      expect(w.emit).to.be.a('function');
    });
  });

  describe('check_file_exists', function () {
    it('returns a stat object when the file exists', function () {
      const p = tmpPath('exists');
      fs.writeFileSync(p, 'hello\n');
      const w = new FileWatcher({ filePath: p });
      const st = w.check_file_exists();
      expect(st.isFile()).to.equal(true);
    });

    it('throws when the file does not exist', function () {
      const w = new FileWatcher({ filePath: tmpPath('missing') });
      expect(function () {
        w.check_file_exists();
      }).to.throw();
    });
  });

  describe('rawline / read_upto helpers', function () {
    it('rawline() emits a "rawline" event with the payload', function () {
      const w = new FileWatcher({ filePath: '/tmp/nope' });
      const spy = sinon.spy();
      w.on('rawline', spy);
      w.rawline('hello world');
      expect(spy.calledOnceWith('hello world')).to.equal(true);
    });

    it('read_upto() emits a "read_upto" event with the stat payload', function () {
      const w = new FileWatcher({ filePath: '/tmp/nope' });
      const spy = sinon.spy();
      w.on('read_upto', spy);
      const stat = { size: 42 };
      w.read_upto(stat);
      expect(spy.calledOnceWith(stat)).to.equal(true);
    });
  });
});
