//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const pug  = require('pug');

const precache = require('../../../lib/express-pug-cache');

describe('Unit::EventConsole::lib::express-pug-cache', function() {

  let tmpDir: string;
  let testSubDir: string;

  before(function() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oa-pug-cache-'));
    testSubDir = path.join(tmpDir, 'test');
    fs.mkdirSync(testSubDir);
    fs.writeFileSync(path.join(tmpDir, 'a.pug'),       'p Hello a');
    fs.writeFileSync(path.join(tmpDir, 'b.pug'),       'p Hello b');
    fs.writeFileSync(path.join(testSubDir, 'skip.pug'),'p Hello skip');
  });

  after(function() {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  afterEach(function() { sinon.restore(); });

  it('compiles every .pug file in the tree via pug.compileFile', function() {
    const spy = sinon.spy(pug, 'compileFile');
    precache(tmpDir);
    const compiled = spy.getCalls().map((c: any) => c.args[0]);
    expect(compiled).to.include(path.join(tmpDir, 'a.pug'));
    expect(compiled).to.include(path.join(tmpDir, 'b.pug'));
  });

  it('ignores files under a "test/" subdirectory', function() {
    const spy = sinon.spy(pug, 'compileFile');
    precache(tmpDir);
    const compiled = spy.getCalls().map((c: any) => c.args[0]);
    expect(compiled).to.not.include(path.join(testSubDir, 'skip.pug'));
  });

  it('does not throw when the directory is empty', function() {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oa-pug-empty-'));
    try {
      expect(() => precache(emptyDir)).to.not.throw();
    } finally {
      fs.rmdirSync(emptyDir);
    }
  });
});
