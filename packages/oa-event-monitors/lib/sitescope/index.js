/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:sitescope');
var logger = logging.logger;
var debug = logging.debug;

var async = require('async');
var inspect = require('util').inspect;
var Class = require('joose').Class;
var SiteScopeLogParser = require('./log_parser').Parser;
var SiteScopeGroupsDirectory = require('./groups').SiteScopeGroupsDirectory;
var AgentRole = require('../utils/agent_role').Role;

var SiteScopeAgent = (exports.Agent = Class({
  my: {
    has: {
      /*
       * these are the properties specified in the configuration files
       * props{} section
       * these are Class level and not instance attributes
       */
      properties: { is: 'ro', init: ['logfile', 'groups', 'homedir'] },
    },
  },
  /*
   * AgentRole is a simple mixin that provides
   * props
   * eventCB
   */
  does: [AgentRole],

  has: {
    parser: { is: 'rw' },
    homeDir: { is: 'rw' },
    groups: { is: 'rw' },
  },

  after: {
    initialize: function (args) {
      logger.debug('INIT props', args.props, '');
      if (this.getProps().homedir == undefined) {
        throw new Error('SiteScope monitor is missing a property homedir');
      }
    },
  },

  methods: {
    start: function (started_cb) {
      var self = this;

      var f_groups = function (cb) {
        var groups_directory = self.getProps().homedir + '/groups';
        var ssgrpdir = new SiteScopeGroupsDirectory({ groupsDirectory: groups_directory });
        ssgrpdir.watch_directory(function (err) {
          if (!err) self.setGroups(ssgrpdir.groups);
          cb(err);
        });
      };

      var f_parser = function (cb) {
        var parser = new SiteScopeLogParser({
          logfilePath: self.getProps().logfile,
          groups: self.groups,
          tokenCB: self.getEventCB(),
        });
        self.setParser(parser);
        self.getParser().start();

        cb(null);
      };

      async.series({ groups: f_groups, parser: f_parser }, function (err, results) {
        if (err) return started_cb(err);
      });
    },
  },
}));
