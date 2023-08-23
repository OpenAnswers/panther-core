/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:sitescope:log_parser');
var logger = logging.logger;
var debug = logging.debug;

var Class = require('joose').Class;
var LogTailer = require('../utils/log_tailer').LogTailer;

var SiteScopeParser = (exports.Parser = Class({
  /*
   * inherit from LogTailer
   * which gives us the logic to start tailing a file line by line
   * each line is then passed to the provided parse method below
   */

  isa: LogTailer,

  has: {
    groups: { is: 'ro' },
  },

  methods: {
    parse: function (line) {
      var self = this;
      var columns = line.split('\t');

      var rawalert = {};
      rawalert.rawtime = columns[0];
      rawalert.status = columns[1];
      rawalert.group = columns[2];
      rawalert.name = columns[3];
      rawalert.current_reading = columns[4];

      if (columns[5] == undefined) {
        logger.debug('Missing col5');
      } else {
        var matches = undefined;
        if ((matches = columns[5].match(/(\d+):(\d+)/))) {
          rawalert.monitor_id = matches[1];
          rawalert.sample = matches[2];
        }
        var var_offset = 6;
        while (var_offset < columns.length) {
          rawalert['var' + var_offset] = columns[var_offset];
          var_offset++;
        }

        rawalert.group_path = 'UNKOWN_GROUP_PATH';
        var ss_group = self.getGroups()[rawalert.group];
        if (ss_group != undefined) {
          rawalert.group_path = ss_group.getGroupPath();
        }
      }
      debug('rawalert tokens', rawalert);

      /*
       * raise the new event
       * getTokenCB() is inherited from LogTailer
       */
      self.getTokenCB()(rawalert);
    },
  },
}));
