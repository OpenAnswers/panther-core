//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

process.env.NODE_ENV = 'test';

const { expect } = require('../mocha_helpers');

const path = require('path');
const fs = require('fs');
const os = require('os');

const { OAmonHome } = require('../../common/OAmonHome');

const package_root = path.resolve(__dirname, '../..');

describe('OAmonHome', function () {
  describe('with no OAMONHOME env var', function () {
    let saved: any;

    before(function () {
      saved = process.env.OAMONHOME;
      delete process.env.OAMONHOME;
    });

    after(function () {
      if (saved !== undefined) process.env.OAMONHOME = saved;
    });

    it('defaults baseDir to the package root', function () {
      const h = new OAmonHome();
      expect(h.getBaseDir()).to.equal(package_root);
    });

    it('derives etcDir and logDir under baseDir', function () {
      const h = new OAmonHome();
      expect(h.getEtcDir()).to.equal(path.join(package_root, 'etc'));
      expect(h.getLogDir()).to.equal(path.join(package_root, 'log'));
    });

    it('derives serverDir + serverEtcDir under baseDir', function () {
      const h = new OAmonHome();
      expect(h.getServerDir()).to.equal(package_root);
      expect(h.getServerEtcDir()).to.equal(path.join(package_root, 'etc'));
    });

    it('derives monitor{,Etc,Lib}Dir under baseDir', function () {
      const h = new OAmonHome();
      expect(h.getMonitorDir()).to.equal(package_root);
      expect(h.getMonitorEtcDir()).to.equal(path.join(package_root, 'etc'));
      expect(h.getMonitorLibDir()).to.equal(path.join(package_root, 'lib'));
    });

    it('reads version from the monitor package.json', function () {
      const h = new OAmonHome();
      const expected = require(path.join(package_root, 'package.json')).version;
      expect(h.getVersion()).to.equal(expected);
    });
  });

  describe('with OAMONHOME set', function () {
    let saved: any;
    let tmp_dir: string;

    before(function () {
      saved = process.env.OAMONHOME;
      tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oamon-home-'));
      fs.writeFileSync(path.join(tmp_dir, 'package.json'), JSON.stringify({ name: 'scratch', version: '9.9.9' }));
      process.env.OAMONHOME = tmp_dir;
    });

    after(function () {
      if (saved === undefined) delete process.env.OAMONHOME;
      else process.env.OAMONHOME = saved;
      try {
        fs.rmSync(tmp_dir, { recursive: true, force: true });
      } catch {}
    });

    it('uses OAMONHOME as the baseDir', function () {
      const h = new OAmonHome();
      expect(h.getBaseDir()).to.equal(tmp_dir);
      expect(h.getEtcDir()).to.equal(path.join(tmp_dir, 'etc'));
      expect(h.getMonitorLibDir()).to.equal(path.join(tmp_dir, 'lib'));
    });

    it('reads the version from the OAMONHOME package.json', function () {
      const h = new OAmonHome();
      expect(h.getVersion()).to.equal('9.9.9');
    });
  });
});
