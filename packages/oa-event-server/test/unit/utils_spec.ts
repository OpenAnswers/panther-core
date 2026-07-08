//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const Class = require('joose').Class;

const { Activated, Filepath } = require('../../lib/utils');

describe('utils', function () {
  describe('Activated role', function () {
    const Widget = Class('Widget', {
      does: Activated,
    });

    it('initialises activated to true', function () {
      const w = new Widget();
      expect(w.getActivated()).to.equal(true);
    });

    it('deactivate() sets activated to false', function () {
      const w = new Widget();
      w.deactivate();
      expect(w.getActivated()).to.equal(false);
    });

    it('activate() sets activated to true again', function () {
      const w = new Widget();
      w.deactivate();
      w.activate();
      expect(w.getActivated()).to.equal(true);
    });

    it('setActivated() accepts explicit values', function () {
      const w = new Widget();
      w.setActivated(false);
      expect(w.getActivated()).to.equal(false);
      w.setActivated(true);
      expect(w.getActivated()).to.equal(true);
    });
  });

  describe('Filepath role', function () {
    const Doc = Class('Doc', {
      does: Filepath,
    });

    it('filename() returns the basename of the filepath', function () {
      const d = new Doc();
      d.setFilepath('/a/b/c/file.txt');
      expect(d.filename()).to.equal('file.txt');
    });

    it('dirname() returns the directory portion', function () {
      const d = new Doc();
      d.setFilepath('/a/b/c/file.txt');
      expect(d.dirname()).to.equal('/a/b/c');
    });

    it('handles a bare filename', function () {
      const d = new Doc();
      d.setFilepath('only.txt');
      expect(d.filename()).to.equal('only.txt');
      expect(d.dirname()).to.equal('.');
    });
  });
});
