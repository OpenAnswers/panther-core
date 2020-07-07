/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */


var logging = require('oa-logging')('oa:event:monitors:syslogd')
var logger = logging.logger;
var debug = logging.debug;

var inspect = require('util').inspect;
var util = require('util')

var Class = require( 'joose' ).Class;
var AgentRole = require( '../utils/agent_role' ).Role
var syslogParser = require('glossy').Parse

logger.info( "AGENT LOADED SYSLOGD" )

var DEFAULT_SYSLOG_PORT = 514
var DEFAULT_SYSLOG_WS_PORT = 1503
var DEFAULT_SYSLOG_HTTP_PORT = 1501


exports.Agent = Class( "AgentSyslogd", {

  my: {
    has: {
      properties: { is: 'ro', init: [ "port", "wsport", "httpport" ] }
    }
  },

  does: [ AgentRole ], // picks up props and eventCB

  has: {
    port: { is: 'rw', init: DEFAULT_SYSLOG_PORT },
    wsport: { is: 'rw', init: DEFAULT_SYSLOG_WS_PORT },
    httpport: { is: 'rw', init: DEFAULT_SYSLOG_HTTP_PORT }
  },

  after: {
    initialize: function( args )
    {
      var self = this
      this.setPort( self.getProps().port || DEFAULT_SYSLOG_PORT )
      this.setWsport( self.getProps().wsport || DEFAULT_SYSLOG_WS_PORT )
      this.setHttpport( self.getProps().httpport || DEFAULT_SYSLOG_HTTP_PORT )
      logger.debug( 'wsport', self.getProps().wsport )
    }
  },

  methods: {
    parse: function(stringUtf8Message, cb)
    {
      syslogParser.parse( stringUtf8Message, function( parsedMessage ){
        debug('syslogd glossy parsed msg', parsedMessage )

        if ( parsedMessage.message === undefined ) {
          var message = 'no message found, originally had: ' + parsedMessage.originalMessage
          return cb( message )
        }

        cb( null, parsedMessage )
      })
    },

    start: function(cb)
    {
      var self = this;
      var port = parseInt( this.getPort() );
      var net = require('net');
      carrier = require('carrier');

      net.createServer(function (socket) {
        carrier.carry(socket, function(line) {

	  debug('TCP syslogd line raw msg', line)
          self.parse( line, function( err, parsed ) {
            if (err) return logger.error( message );
            self.getEventCB()( parsed )
          });
        });

      }).listen( port );

      var dgram = require("dgram");
      var server = dgram.createSocket("udp4");

      logger.info( "Starting udp syslogd listener" );

      server.on( "message", function( rawMessage ){
        debug('syslogd glossy raw msg', rawMessage)

        self.parse( rawMessage.toString('utf8', 0), function( err, parsed ){
          if (err) return logger.error( message );
          self.getEventCB()( parsed )
        });
      });

      server.on("listening", function(){
        var address = server.address();
        logger.info( "Server now listening at " + address.address + ":" + address.port);
      });

      server.on("error", function(err){
        logger.error( "Server error:" + err );
        console.error( "Server error", err );
        throw(err);
      });

      logger.info( "Binding to port = " + port.toString() );
      server.bind( port, cb ); // Remember ports < 1024 need root
    }
  }
});

