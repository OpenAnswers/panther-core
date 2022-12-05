/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var path = require('path');
var Class = require('joose').Class;
var exec = require('child_process').exec;
var async = require('async');

var OAmonHome = (exports.OAmonHome = Class('OAmonHome', {
  has: {
    baseDir: { is: 'rw', init: path.join(__dirname, '..') },
    etcDir: { is: 'rw' },
    logDir: { is: 'rw' },

    serverDir: { is: 'rw' },
    serverEtcDir: { is: 'rw' },
    automationsDir: { is: 'rw' },

    monitorEtcDir: { is: 'rw' },
    monitorLibDir: { is: 'rw' },
    externalCommandsDir: { is: 'rw' },
    version: { is: 'rw' },
  },

  after: {
    initialize: function (props) {
      if (process.env['OAFHOME'] !== undefined) this.setBaseDir(process.env['OAFHOME']);

      this.setEtcDir(path.join(this.getBaseDir(), 'etc'));
      this.setLogDir(path.join(this.getBaseDir(), 'log'));

      this.setServerDir(this.getBaseDir());
      this.setServerEtcDir(path.join(this.getBaseDir(), 'etc'));
      this.setAutomationsDir(path.join(this.getEtcDir(), 'automations'));

      this.setMonitorEtcDir(path.join(this.getBaseDir(), '/monitors/etc'));
      this.setMonitorLibDir(path.join(this.getBaseDir(), '/monitors/lib'));

      this.setExternalCommandsDir(path.join(this.getBaseDir(), 'external_commands'));

      var version = require(path.join(this.getServerDir(), 'package.json')).version;
      var self = this;
      self.setVersion(version);
      /*
      // Disabled 21/08/2014
      async.parallel({
        revision: function(callback) {
          exec("git rev-parse --short HEAD", function (error, stdout, stderr) {
            revision = stdout.replace(/\n$/, '');
            callback(error, revision);
          });
        },
        branch: function(callback) {
          exec("git rev-parse --abbrev-ref HEAD", function (error, stdout, stderr) {
            branch = stdout.replace(/\n$/, '');
            callback(error, branch);
          });
        }
      },
      function(err, results) {
        if (err) {
          self.setVersion(version);
        } else {
          self.setVersion(version + '-' + results.branch + '-' + results.revision);
        }
      });
      */
    },
  },
}));
