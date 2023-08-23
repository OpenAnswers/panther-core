/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:monitors:syslog:logfile');
var logger = logging.logger;
var debug = logging.debug;

inspect = require('util').inspect;

var Class = require('joose').Class;
var LogTailer = require('../utils/log_tailer').LogTailer;

syslogParser = require('glossy').Parse;

var DEFAULT_FILENAME = '/var/log/messages';

var SyslogLogParser = (exports.Parser = Class({
  isa: LogTailer,

  methods: {
    parse: function (line) {
      var self = this;

      syslogParser.parse(line, function (parsedMessage) {
        var message_match = undefined;
        if ((message_match = parsedMessage.message.match(/(\S+): (.*)/))) {
          /*
           * go one step further and extract out the daemon and possible pid
           */
          parsedMessage.daemon = message_match[1];
          parsedMessage.message = message_match[2];

          var d = undefined;
          if (parsedMessage.daemon.match(/(.*)\[(\d+)\]/)) {
            parsedMessage.daemon = d[1];
            parsedMessage.daemon_pid = d[2];
          }
        }
        debug('parsedMessage now', parsedMessage);
        self.getTokenCB()(parsedMessage);
      });
    },
  },
}));
