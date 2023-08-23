/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

/*
 * Heartbeat (XMLD) monitor will listen on a port for an XML document of the form
 *
 * <lert>
 *  <mtype>message type</mtype>
 *  <hostname>host.domainname</hostname>
 *  <message>some long message, possibly with\nmany\nlines</message>
 * <lert>
 *
 * The root tags "<lert>" in above can be anything
 *
 * to execute heartbeat_xmld from the command line, run the following:
 *
 * monitors/bin/heartbeat_xmld --props:port_number <portnumber>
 *
 * alternatively you can configure the port_number to listen on via the
 * monitors/etc/heartbeat_xmld.ini file with the following:
 *
 * [props]
 * port_number = <portnumber>
 *
 */

var logging = require('oa-logging')('oa:event:monitors:heartbeat_xmld');
var logger = logging.logger;
var debug = logging.debug;

var Class = require('joose').Class;
var AgentRole = require('../utils/agent_role').Role;
var XmlListener = require('../utils/xml_listener').XmlListener;
var nconf = require('nconf'); // get access to command line args

var SampleAgent = (exports.Agent = Class({
  isa: XmlListener,
  /*
   * inherits a start() method for listening on a port
   * and will call parseRecord( object ) with the
   * root elemnents mapped to keys/values in <object>
   */

  my: {
    has: {
      /*
       * heartbeat_xmld.ini must have the follwoing in it:
       *
       * [props]
       * port_number = <some port number to listen on>
       */
      properties: { is: 'ro', init: ['port_number'] },
    },
  },

  does: [AgentRole],

  methods: {
    parseRecord: function (record) {
      var self = this;

      /*
       * ensure that the mandatory fields are present
       */

      if (record.message == undefined) return logger.error('XML missing a message token');

      if (record.mtype == undefined) return logger.error('XML missing a mtype token');

      if (record.hostname == undefined) return logger.error('XML missing a hostname token');

      /*
       * build an initial object to pass to the rule engine
       */
      var obj = {
        message: record.message,
        mtype: record.mtype,
        hostname: record.hostname,
        lines: [],
      };

      /*
       * split out any lines into their own tokens
       */
      var message_lines = record.message.split('\n');
      var position = 0;
      while (position < message_lines.length) {
        obj['message_' + position] = message_lines[position];
        obj.lines.push(message_lines[position]);
        position++;
      }

      // send the token/values to the rules engine
      self.getEventCB()(obj);
    },
  },
}));
