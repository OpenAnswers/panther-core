/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var path = require('path');
var Class = require('joose').Class;

var OAmonHome = (exports.OAmonHome = Class('OAmonHome', {
  has: {
    baseDir: { is: 'rw', init: path.join(__dirname, '..') },
    etcDir: { is: 'rw' },
    logDir: { is: 'rw' },

    serverDir: { is: 'rw' },
    serverEtcDir: { is: 'rw' },

    monitorDir: { is: 'rw' },
    monitorEtcDir: { is: 'rw' },
    monitorLibDir: { is: 'rw' },
    version: { is: 'rw' },
  },

  after: {
    initialize: function (props) {
      if (process.env['OAMONHOME'] != undefined) this.setBaseDir(process.env['OAMONHOME']);

      this.setEtcDir(path.join(this.getBaseDir(), 'etc'));
      this.setLogDir(path.join(this.getBaseDir(), 'log'));

      this.setServerDir(this.getBaseDir());
      this.setServerEtcDir(path.join(this.getBaseDir(), 'etc'));

      this.setMonitorDir(this.getBaseDir());
      this.setMonitorEtcDir(path.join(this.getMonitorDir(), 'etc'));
      this.setMonitorLibDir(path.join(this.getMonitorDir(), 'lib'));

      this.setVersion(require(path.join(this.getMonitorDir(), 'package.json')).version);
    },
  },
}));
