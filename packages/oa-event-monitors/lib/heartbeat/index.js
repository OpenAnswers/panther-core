/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */


// Logging
var logging = require('oa-logging')('oa:event:monitors:syslog')
var logger = logging.logger
var debug = logging.debug

var Class = require( 'joose' ).Class;
var AgentRole = require( '../utils/agent_role' ).Role;
var LogTailer = require( '../utils/log_tailer' ).LogTailer;
var LogTokenizer = require( '../utils/log_tailer' ).ComplexLogTokenizer;

var SampleAgent = exports.Agent = Class({

  my: {
    has: {
      properties: { is: 'ro', init: [ "logfile" ] }
    }
  },

  does: [ AgentRole ],

  methods: {
    isRecordTerminator: function( record_lines )
    {
      /*
       */
      var first_line = record_lines[0];
      var last_line = record_lines[ record_lines.length -1 ];
      logger.debug( "Last line now: " + last_line );

      if( first_line && first_line.match( /^[0-9]+\/[0-9]+ .*\], Message \[/ ) )
      {
        if( last_line && last_line.match( /\]$/ ) )
          return true;
        else
          return false;
      }
      else
      {
        logger.warn ( "INCOMPLETE RECORD",record_lines,'' );
        return false;
      }
    },
    parseRecord: function( record_lines )
    {
      var first_line = record_lines.shift();
      var tokens = {};
      var matches = undefined;

      /*
       * on the edge case with a single line split over two, append them together
       * FIXME: this is too simplistic and is liable to break
       */

      if( first_line.match( /Message \[Low\ Idle$/ ) )
        first_line += " " + record_lines.shift();



      if( matches = first_line.match( /^(\d\d)\/(\d\d) (\d\d):(\d\d) Client \[(\w+)\], Mtype \[(\d+)\], Message \[(.*)/ ) )
      {
        tokens['day'] = matches[1];
        tokens['month'] = matches[2];
        tokens['hour'] = matches[3];
        tokens['minute'] = matches[4];
        
        /*
         * convert the available time and date information into ms's since epoch
         * heartbeat does not provide the year, so we use the value for the current year
         */
        var current_date = new Date();

        // javascript months start at 0

        var alert_time = new Date( current_date.getFullYear(), parseInt(tokens['month']) - 1, tokens['day'], tokens['hour'], tokens['minute'] );
        //debug( "ALERT TIME[" + alert_time + "]" );
        tokens['alert_time'] = alert_time

        tokens['hostname'] = matches[5];
        tokens['mtype'] = matches[6];
        tokens['lines'] = [];

        var message = matches[7];

        /*
         * there are now two possibilities 
         * 0) we only have a single record line, terminated by /\]$/
         * 1) multiple record lines and the last one is terminated by /\]$/
         *
         * so in all cases the trailing square bracket must be removed...
         */

        if( record_lines.length == 0 )
        {
          if( message.charAt( message.length - 1 ) == ']' )
            message = message.slice( 0, message.length -1 );
          tokens['message_0'] = message;
          tokens.lines.push( message );
        }

        var position = 0;
        while( position < record_lines.length )
        {
          var line = record_lines[position];
          logger.debug( "LINE[" + position + "] = " + line );

          // is this the last line?
          if( position == record_lines.length )
          {
            // check and strip the trailing ]
            if( line.charAt( line.length - 1 ) == ']' )
              line = line.slice( 0, line.length - 1 );
          }

          tokens['message_' + position] = line;
          tokens.lines.push( line );

          position++;
        }

        debug( "TOKENS", tokens )
        return tokens;
      }
      else
      {
        logger.warn( "Failed to parse record" );
        debug( 'record_time', record_lines )
        return false;
      }
    },
    start: function( cb )
    {
      var self = this;
      var parser = new LogTokenizer( { 
            logfilePath         : self.getProps().logfile,
            tokenCB             : self.getEventCB(),
            isRecordTerminator  : self.isRecordTerminator,
            parseRecord         : self.parseRecord } );

      parser.start();
      cb( null );
    }
  }
});

