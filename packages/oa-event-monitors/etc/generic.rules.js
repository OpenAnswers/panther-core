/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:rules:generic')
var logger = logging.logger
var debug = logging.debug



/*
 * fields available in the input_object (obj)
 *
 * obj.day        Day of Month
 * obj.month      Month of Year
 * obj.hour       Hour of Day
 * obj.minute     Minute of Hour
 * obj.alert_time ms's since epoch using above date/time values
 * obj.hostname   hostname 
 * obj.mtype      message type, a possibly unique number
 * obj.message    Message line in the heartbeat logfile.
                  this will be the first line, if there are multiple
                  lines for one alert in heatbeat's log then obj.lines
 * obj.lines
 */

exports.rules = function( a, obj )
{
  /*
   * 
   */
  a.last_occurrence = obj.alert_time || new Date()


  a.node = obj.hostname || 'missing hostname';
  a.identifier = obj.mtype || 'missingMtype';
  a.identifier += ':' + a.node;

  a.severity = 1;
  a.summary = obj.message || 'ZZZZ';

  if( obj.lines && obj.lines.length == 1 )
  {
    logger.debug( "SINGLE LINE" );
    // single line heartbeat rules follow
    switch( obj.mtype )
    {

      case "11":
        /*
         * should deal witha a heartbeat message such as:
         * 14/02 22:11 Client [bwsvpv01], Mtype [11], Message [alarm.sh on bwsvpv01: CPU-Load=96 (treshold=90%)]
         */
        var matches = undefined;
        if( matches = obj.message_0.match( /alarm\.sh on (.*): CPU-Load=(\d+) \(treshold=(\d+)%/ ) )
        {
          a.node_alias = matches[1];
          a.alert_key = matches[2];
          a.summary = "CPU Load above threshold " + matches[3];
          a.severity = 3;
          if( parseInt( matches[2] ) >= 99 )
            a.severity = 4;
        }
      break;

      case "12":
      /*
       * should deal witha a heartbeat message such as:
       * 18/04 16:20 Client [blilpv01], Mtype [12], Message [blilpv01: only 119 MB of free memory. (Treshold=128)]
       */

        var matches = undefined;
        if( matches = obj.message_0.match( /(.*): only (\d+) MB of free memory.*Treshold=(\d+).*/ ) )
        {
          a.node_alias = matches[1];
          a.alert_key = matches[2];
          a.summary = "Memory below threshold " + matches[3] + "MB";
        }
        else logger.debug( "Failed to match: " + obj.message_0 );
      break;

      case "13":
        /*
         * there are several slightly differing formats that disk utilization
         * messages can arrive in
         */

        var matches = undefined;
        if( matches = obj.message_0.match( /(.*): Filesystem (\S+) is (\d+)% full(.*)/ ) )
        {
          a.node_alias = matches[1];
          var filesystem = matches[2];

          // make each event unique for the filesystem it is on
          a.identifier += filesystem;

          a.alert_key = matches[3];
          a.summary = "Filesystem " + matches[2] + " is " + matches[3] + " full";
        }

      break;

      case "50001":
        var matches = undefined;
        if( obj.message_0.match( /^racoon.log/ ) )
        {
          a.proxy_agent = "racoon";

          if( matches = obj.message_0.match( /^racoon.log VPN error: ((\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)): (\w+): (.*)/ ) )
          {
            var ts = matches[1];
            var year = parseInt( matches[2] );
            var month = parseInt( matches[3] );
            var day = parseInt( matches[4] );
            var hours = parseInt( matches[5] );
            var minutes = parseInt( matches[6] );
            var seconds = parseInt( matches[7] );

            var better_date = new Date( year, month, day, hours, minutes, seconds );
            a.last_occurrence = better_date

            var sev = matches[8];
            var msg = matches[9];
            // set an initial alert summary
            a.summary = msg;

            logger.debug( 'racoon matches: ' + inspect( matches ) );

            // set the alert severity based on the string extracted from the log entry
            switch( sev )
            {
              case 'ERROR':
                a.severity = 4;
                break;
              default:
                a.severity = 2;
                break;
            }

            /*
             * build up something to use for appending to a.identifier
             * start with the racoon msg and then later override it with 
             * something better
             */
            var ident2 = msg;

            var msgm = undefined;
            if( msgm = msg.match( /(\S+) give up to get IPsec-SA due to time up to wait/ ) )
            {
              a.node_alias = msgm[1];
              ident2 = msgm[1] + ':IPsec-SA-timeout';
            }
            else if( msgm = msg.match( /(phase[12]) negotiation failed due to time up(.*)/ ) )
            {
              ident2 = a.summary = msgm[1] + " timed out";
            }

            a.identifier += ident2;

          }

        }

      break;

      default:
        logger.warn( "Unhandled mtype: " + inspect( obj.mtype ) );
      break;
    }
  }
  else
  {
    logger.debug( "MULTI LINE" );
    // multi line heartbeat rules follow
  }
};
