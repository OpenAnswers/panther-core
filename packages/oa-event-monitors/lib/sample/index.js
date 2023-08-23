/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var Class = require('joose').Class;
var AgentRole = require('../utils/agent_role').Role;
var LogTailer = require('../utils/log_tailer').LogTailer;
var LogTokenizer = require('../utils/log_tailer').LogTokenizer;

var SampleAgent = (exports.Agent = Class({
  my: {
    has: {
      properties: { is: 'ro', init: ['logfile'] },
    },
  },

  does: [AgentRole],

  methods: {
    start: function (cb) {
      var self = this;
      var parser = new LogTokenizer({
        logfilePath: self.getProps().logfile,
        tokenCB: self.getEventCB(),
        seperator: '\t',
        fieldMapping: {
          0: 'col1',
          1: 'col2',
          2: 'col3',
          3: 'col4',
          4: 'col5',
          5: 'col6',
          6: 'col7',
        },
      });

      parser.start();
      cb(null);
    },
  },
}));
