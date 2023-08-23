/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

/*
 * Heartbeat (CMM) monitor is meant to be invoked foreach heartbeat message.
 * The monitors/etc/heartbeat_cmm.ini *must* have the following in the global
 * section ( first line of the file will be fine ):
 *
 * oneshot
 *
 * This will cause the monitor to exit after the event has been received
 * by the server.  Otherwise it the monitor will enter an event loop
 * and forever wait for more command line arguments, which won't happen.
 *
 * also of note, there appears to a limitation/bug in nconf (the module
 * responsible for handling command line arguments) in that command line args
 * are only recognised upto the first \n in them.
 * as a work around to this limitation, nconf can also retrieve arguments
 * in a number of other ways, conveniently the shell environment is one option.
 *
 * to execute heartbeat_cmm from the command line, run the following:
 *
 * message="some message\nsplit\nover\nmany\lines" monitors/bin/heartbeat_cmm --mtype <XX> --client <HOSTNAME>
 *
 * alternatively you could pass all arguments via the shell environment, e.g.
 *
 * message="something happened" mtype="22" client="localhost" monitors/bin/heartbeat_cmm
 *
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:heartbeat_cmm');
var logger = logging.logger;
var debug = logging.debug;

var Class = require('joose').Class;
var AgentRole = require('../utils/agent_role').Role;
var nconf = require('nconf'); // get access to command line args

var SampleAgent = (exports.Agent = Class({
  does: [AgentRole],

  methods: {
    start: function (cb) {
      var self = this;

      // obj will be the tokens that are accessible to the rules file
      var obj = {
        hostname: nconf.get('client') || 'oaec_missing_client',
        mtype: nconf.get('mtype') || 'oaec_missing_mtype',
        alert_time: new Date(),
        lines: [],
      };

      debug('MESSAGE', nconf.get('message'));

      /*
       * the actual heartbeat message can be split across several lines.
       * suplicating the message is done for convenience.
       * such that its available as tokens (Object keys) with an index appended
       * and also as an array of lines
       */
      var message = nconf.get('message') || 'oaec_missing_message';
      var message_lines = message.split('\n');
      var position = 0;
      while (position < message_lines.length) {
        obj['message_' + position] = message_lines[position];
        obj.lines.push(message_lines[position]);
        position++;
      }

      /*
       * pass the Object tokens to the event callback, this will pass the
       * object to the rules for enrichment.
       */
      self.getEventCB()(obj);

      cb(null);
    },
  },
}));
