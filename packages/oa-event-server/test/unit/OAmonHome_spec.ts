//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const path = require('path');
const fs = require('fs');
const os = require('os');

const { OAmonHome } = require('../../lib/OAmonHome');

const package_root = path.resolve(__dirname, '../..');

describe('OAmonHome', function () {
  describe('with no OAFHOME env var', function () {
    let saved: any;

    before(function () {
      saved = process.env.OAFHOME;
      delete process.env.OAFHOME;
    });

    after(function () {
      if (saved !== undefined) process.env.OAFHOME = saved;
    });

    it('defaults baseDir to the package root', function () {
      const h = new OAmonHome();
      expect(h.getBaseDir()).to.equal(package_root);
    });

    it('derives etcDir, logDir under baseDir', function () {
      const h = new OAmonHome();
      expect(h.getEtcDir()).to.equal(path.join(package_root, 'etc'));
      expect(h.getLogDir()).to.equal(path.join(package_root, 'log'));
    });

    it('derives monitor and external-command dirs under baseDir', function () {
      const h = new OAmonHome();
      expect(h.getMonitorEtcDir()).to.equal(path.join(package_root, '/monitors/etc'));
      expect(h.getMonitorLibDir()).to.equal(path.join(package_root, '/monitors/lib'));
      expect(h.getExternalCommandsDir()).to.equal(path.join(package_root, 'external_commands'));
    });

    it('derives automationsDir under etcDir', function () {
      const h = new OAmonHome();
      expect(h.getAutomationsDir()).to.equal(path.join(package_root, 'etc', 'automations'));
    });

    it('reads version from the server package.json', function () {
      const h = new OAmonHome();
      const expected = require(path.join(package_root, 'package.json')).version;
      expect(h.getVersion()).to.equal(expected);
    });
  });

  describe('with OAFHOME set', function () {
    let saved: any;
    let tmp_dir: string;

    before(function () {
      saved = process.env.OAFHOME;
      // scratch dir with a minimal package.json so the version read succeeds
      tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oamon-home-'));
      fs.writeFileSync(path.join(tmp_dir, 'package.json'), JSON.stringify({ name: 'scratch', version: '9.9.9' }));
      process.env.OAFHOME = tmp_dir;
    });

    after(function () {
      if (saved === undefined) delete process.env.OAFHOME;
      else process.env.OAFHOME = saved;
      try {
        fs.rmSync(tmp_dir, { recursive: true, force: true });
      } catch {}
    });

    it('uses OAFHOME as the baseDir', function () {
      const h = new OAmonHome();
      expect(h.getBaseDir()).to.equal(tmp_dir);
      expect(h.getEtcDir()).to.equal(path.join(tmp_dir, 'etc'));
    });

    it('reads the version from the OAFHOME package.json', function () {
      const h = new OAmonHome();
      expect(h.getVersion()).to.equal('9.9.9');
    });
  });
});
