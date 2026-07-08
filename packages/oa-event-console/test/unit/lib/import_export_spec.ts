//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const { ImportExport } = require('../../../lib/import-export');

describe('Unit::EventConsole::lib::import-export', function() {

  describe('compare_files', function() {
    let tmpDir: string;

    before(function() {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oa-ie-'));
    });

    after(function() {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns true for two files with identical contents', function() {
      const a = path.join(tmpDir, 'a1');
      const b = path.join(tmpDir, 'b1');
      fs.writeFileSync(a, 'same content');
      fs.writeFileSync(b, 'same content');
      expect(ImportExport.compare_files(a, b)).to.equal(true);
    });

    it('returns false when file sizes differ', function() {
      const a = path.join(tmpDir, 'a2');
      const b = path.join(tmpDir, 'b2');
      fs.writeFileSync(a, 'short');
      fs.writeFileSync(b, 'a longer piece of content');
      expect(ImportExport.compare_files(a, b)).to.equal(false);
    });

    it('returns false when sizes match but bytes differ', function() {
      const a = path.join(tmpDir, 'a3');
      const b = path.join(tmpDir, 'b3');
      fs.writeFileSync(a, 'AAAAAA');
      fs.writeFileSync(b, 'AAAAAB');
      expect(ImportExport.compare_files(a, b)).to.equal(false);
    });

    it('handles files larger than the 6KB read buffer', function() {
      const a = path.join(tmpDir, 'big-a');
      const b = path.join(tmpDir, 'big-b');
      const buf = Buffer.alloc(10 * 1024, 0x42);
      fs.writeFileSync(a, buf);
      fs.writeFileSync(b, buf);
      expect(ImportExport.compare_files(a, b)).to.equal(true);
    });
  });
});
