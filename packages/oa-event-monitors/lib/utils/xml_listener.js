/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:utils:xml_listener');
var logger = logging.logger;
var debug = logging.debug;

var net = require('net');
var libxmljs = require('libxmljs');

var Class = require('joose').Class;

var XmlListener = (exports.XmlListener = Class({
  has: {
    /*
     * callback to be run when tokens have been parsed out
     */
    eventCB: { is: 'ro', required: true },
  },

  methods: {
    parseRecord: function (record) {
      /* base method - must be over ridden */
      debug('parse record', record);
      logger.error('base class parse');
      self.getEventCB()({ msg: 'MISSING PARSE function in overridden base class' });
    },
    start: function (started_cb) {
      var self = this;
      var server = net.createServer(function (c) {
        c.on('data', function (data) {
          var str = data.toString();

          try {
            var xmlDoc = libxmljs.parseXmlString(str);
            var keys = xmlDoc.root().childNodes();
            var o = {};
            keys.forEach(function (key) {
              o[key.name()] = key.text();
            });
            self.parseRecord(o);
          } catch (err) {
            logger.error('Error parsing data', err, err.stack);
          }

          c.end(); // disconnect client
        });
        c.on('end', function () {
          logger.debug('Connection ended');
        });
      });

      server.listen(parseInt(self.getProps().port_number), function () {
        started_cb(null);
      });
    },
  },
}));
