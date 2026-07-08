//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('../../mocha_helpers');

const { FileTracker } = require('../../../lib/utils/file_tracker');

describe('Unit::EventMonitors::utils::FileTracker', function () {
  const created: string[] = [];

  function tmpPath(label: string) {
    const p = path.join(
      os.tmpdir(),
      `oamon-filetracker-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
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
    it('leaves tracker undefined when the tracking file does not exist', function () {
      const ft = new FileTracker({ trackingFile: tmpPath('missing') });
      expect(ft.getTracker()).to.equal(undefined);
    });

    it('loads a JSON-encoded tracker from an existing tracking file', function () {
      const p = tmpPath('preloaded');
      fs.writeFileSync(p, JSON.stringify({ ino: 42, size: 1024 }));
      const ft = new FileTracker({ trackingFile: p });
      expect(ft.getTracker()).to.deep.equal({ ino: 42, size: 1024 });
    });
  });

  describe('compare_inode / compare_size', function () {
    it('returns false when tracker is undefined', function () {
      const ft = new FileTracker({ trackingFile: tmpPath('cmp-u') });
      expect(ft.compare_inode(42)).to.equal(false);
      expect(ft.compare_size(1)).to.equal(false);
    });

    it('returns false when tracker lacks the specific field', function () {
      const p = tmpPath('cmp-partial');
      fs.writeFileSync(p, JSON.stringify({ size: 10 })); // no ino
      const ft = new FileTracker({ trackingFile: p });
      expect(ft.compare_inode(42)).to.equal(false);
      expect(ft.compare_size(10)).to.equal(true);
    });

    it('returns true only when both match', function () {
      const p = tmpPath('cmp-both');
      fs.writeFileSync(p, JSON.stringify({ ino: 42, size: 100 }));
      const ft = new FileTracker({ trackingFile: p });
      expect(ft.compare_inode_and_size(42, 100)).to.equal(true);
      expect(ft.compare_inode_and_size(42, 99)).to.equal(false);
      expect(ft.compare_inode_and_size(1, 100)).to.equal(false);
    });
  });

  describe('write', function () {
    it('persists the stat object as JSON', function () {
      const p = tmpPath('write');
      const ft = new FileTracker({ trackingFile: p });
      ft.write({ ino: 7, size: 2048 });
      expect(JSON.parse(fs.readFileSync(p, 'utf8'))).to.deep.equal({ ino: 7, size: 2048 });
    });
  });

  describe('where_to_start_from', function () {
    it('returns 0 when tracker is undefined', function () {
      const ft = new FileTracker({ trackingFile: tmpPath('ws-u') });
      expect(ft.where_to_start_from({ ino: 42, size: 100 })).to.equal(0);
    });

    it('returns 0 when inode has changed (log rotation)', function () {
      const p = tmpPath('ws-ino');
      fs.writeFileSync(p, JSON.stringify({ ino: 42, size: 100 }));
      const ft = new FileTracker({ trackingFile: p });
      expect(ft.where_to_start_from({ ino: 99, size: 500 })).to.equal(0);
    });

    it('returns the current size when the file has shrunk (truncation)', function () {
      const p = tmpPath('ws-shrunk');
      fs.writeFileSync(p, JSON.stringify({ ino: 42, size: 1000 }));
      const ft = new FileTracker({ trackingFile: p });
      expect(ft.where_to_start_from({ ino: 42, size: 500 })).to.equal(500);
    });

    it('returns the tracker size when the file has grown (resume point)', function () {
      const p = tmpPath('ws-grown');
      fs.writeFileSync(p, JSON.stringify({ ino: 42, size: 200 }));
      const ft = new FileTracker({ trackingFile: p });
      expect(ft.where_to_start_from({ ino: 42, size: 500 })).to.equal(200);
    });
  });
});
