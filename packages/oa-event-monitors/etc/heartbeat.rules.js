/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:rules:heartbeat')
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
  if (obj.alert_time)
    a.last_occurrence = new Date(obj.alert_time)
  else
    a.last_occurrence = new Date()


  a.node = obj.hostname || 'missing hostname';

  /*
   * construct an initial identifier that should be a good starting point.
   * if ( and this is the case as i understand it right now ) one mtype
   * can originate from multiple different events then it would be
   * important to ensure that further down in the rules a.identifier is 
   * appended to with something more unique for each event
   */
  a.identifier = obj.mtype || 'missingMtype';
  a.identifier += ':' + a.node;

  a.severity = 1;
  a.summary = obj.message_0 || 'ZZZZ';

  //debug
  if( obj.lines == undefined || obj.lines.length == 0 )
  {
    logger.error( 'there were no lines', obj, '' )
  }

var matches = undefined;
  if( matches = a.summary.match(/Agent heartbeat_xmld is alive/))
  {
    logger.debug( "Remove heartbeat messages" );
    // OA 59631
   a.severity = -1; // discard
  }

var matches = undefined;
  if( matches = a.summary.match(/racoon.log VPN error: [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}: ERROR/))
  {
    logger.debug( "Dedup racoon.log VPN error messages" );
    // OA 60198
  a.summary=a.summary.replace(/racoon.log VPN error: [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}: ERROR/,"racoon.log VPN error: ERROR");
  }

var matches = undefined;
  if( matches = a.summary.match(/\[error\] \[exception.CHttpException.400\] exception CHttpException with message/))
  {
    logger.debug( "Remove Web form exceptions" );
    // OA 59177
   a.severity = -1; // discard
  }

  var matches = undefined; 
  if( matches = a.summary.match(/ESD: .* \[error\] \[exception.Swift_TransportException\] exception Swift_TransportException with message/))
  {
    // oa 60536
    a.summary=a.summary.replace(/ESD: .* \[error\]/,"ESD: [error]");
    logger.debug( "remove timestamp" );
  }

  var matches = undefined; 
  if( matches = a.summary.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*[0-9][0-9]:[0-9][0-9]:[0-9][0-9]/))
  {
    // oa 52882
    a.summary=a.summary.replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*[0-9][0-9]:[0-9][0-9]:[0-9][0-9]/,"");
    logger.debug( "remove messages timestamp" );
  }
  
  var matches = undefined; 
  if( matches = a.summary.match(/Market Data from InteractiveData age > 120 seconds/))
  {
    // oa 59335
    a.summary=a.summary.replace(/120 seconds .*/,"120 seconds");
    logger.debug( "remove m s timestamp" );
  }

  var matches = undefined; 
  if( matches = a.summary.match(/Market Data from InteractiveData age > 300 seconds/))
  {
    // oa 59335
    a.summary=a.summary.replace(/300 seconds .*/,"300 seconds");
    logger.debug( "remove m s timestamp" );
  }

  var matches = undefined; 
  if( matches = a.summary.match(/Apache - Uptime nodata > 120 seconds [0-9]*h [0-9]*m [0-9]*s/))
  {
    // oa 58838
    a.summary=a.summary.replace(/[0-9]*h [0-9]*m [0-9]*s/,"");
    logger.debug( "remove h m s timestamp" );
  }

  var matches = undefined; 
  if( matches = a.summary.match(/Apache - Uptime nodata > 120 seconds [0-9]*d [0-9]*h [0-9]*m/))
  {
    // oa 58838
    a.summary=a.summary.replace(/[0-9]*d [0-9]*h [0-9]*m/,"");
    logger.debug( "remove d h m timestamp" );
  }

  var matches = undefined; 
  if( matches = a.summary.match(/[0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+,[0-9]+ /))
  {
    // oa 58675
    a.summary=a.summary.replace(/[0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+,[0-9]+/,"");
    logger.debug( "remove messages timestamp" );
  }

  var matches = undefined; 
  if( matches = a.summary.match(/[0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+ /))
  {
    // oa 58675
    a.summary=a.summary.replace(/[0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+/,"");
    logger.debug( "remove messages timestamp" );
  }

var matches = undefined;
  if( matches = a.summary.match(/checkraid.sh: .* at [0-9]*-[0-9]*:[0-9]*:[0-9]*: checkraid: cciss_vol_status returned/))
  {
    logger.debug( "remove checkraid.sh duplicates" );
    // OA 61998
  a.summary=a.summary.replace(/at [0-9]*-[0-9]*:[0-9]*:[0-9]*: checkraid/," checkraid");
  }

var matches = undefined;
  if( matches = a.summary.match(/openvpn-camwifi:.*:[0-9][0-9]* /))
  {
    logger.debug( "camelot openvpn remove duplicates" );
    // OA 54585
  a.summary=a.summary.replace(/:[0-9][0-9]* /," ");
  }

  if (a.summary.match(/accounts-2 SC Alert: .* SYS_FAN at FT2 has FAILED|Multiple Drive Failure at Drive \[2,0\];\[2,1\]/i))
  {
	a.owner="known_issues";
  }


/* De-duplicate CPU utilization alerts  */
var matches = undefined;
  if( matches = a.summary.match(/CPU utilization High/))
  {
    logger.debug( "CPU utilization remove duplicates" );
    // OA 55703
  a.summary=a.summary.replace(/\(>95% 15 min avg\) [0-9]{2}\.[0-9]{1,4}/,"\(>95% 15 min avg\)");
  }

/* De-duplicate CPU idle alerts  */
var matches = undefined;
  if( matches = a.summary.match(/CPU idle Very Low/))
  {
    logger.debug( "CPU idle remove duplicates" );
    // OA 55703
  a.summary=a.summary.replace(/\(<1% 1 min avg\) [0-9]\.[0-9]{1,4}/,"\(<1% 1 min avg\)");
  a.summary=a.summary.replace(/\(<5% 5 min avg\) [0-9]\.[0-9]{1,4}/,"\(<5% 5 min avg\)");
  a.summary=a.summary.replace(/\(<5% 15 min avg\) [0-9]\.[0-9]{1,4}/,"\(<5% 15 min avg\)");
  }


var matches = undefined;
  if( matches = a.summary.match(/CPU idle Low/))
  {
    logger.debug( "CPU idle remove duplicates" );
    // OA 57122
  a.summary=a.summary.replace(/\(<50% 1 min avg\) [0-9]{2}\.[0-9]{1,4}/,"\(<50% 1 min avg\)");
  }

/* De-duplicate Free Diskspace alerts  */
var matches = undefined;
  if( matches = a.summary.match(/Free diskspace Low/))
  {
    logger.debug( "Free diskspace Low remove duplicates" );
    // OA 57700
  a.summary=a.summary.replace(/[0-9]{2}\.[0-9]{2} %/," ");
  }

var matches = undefined;
  if( matches = a.summary.match(/Free diskspace Very Low/))
  {
    logger.debug( "Free diskspace Very Low remove duplicates" );
    // OA 57700
  a.summary=a.summary.replace(/[0-9]{2}\.[0-9]{2} %/," ");
  }

/* De-duplicate Memory Low alerts  */
var matches = undefined;
  if( matches = a.summary.match(/Free memory .*Low/))
  {
    logger.debug( "Memory Low remove duplicates" );
    // OA 57122
  a.summary=a.summary.replace(/[0-9]{1,2}\.[0-9]{1,4} %/," ");
  }



var matches = undefined;
  if( matches = a.summary.match(/slpipagwp01:20.*?[0-9][0-9]:[0-9][0-9]:[0-9][0-9],\d+ ERROR \[\[queuing-proxy-1.0.4\].connector.http.mule.default.receiver.\d+\] .* Caught exception in Exception Strategy: Broken pipe/))
  {
    logger.debug( "Picsolve remove messages timestamp" );
    // OA 55703
  a.summary=a.summary.replace(/20.*?[0-9][0-9]:[0-9][0-9]:[0-9][0-9],\d+ /," ");
  }


var matches = undefined;
  if( matches = a.summary.match(/20.*?[0-9][0-9]:[0-9][0-9]:[0-9][0-9],\d+ ERROR \[ActiveMQ Session Task-\d+\] logging.DispatchingLogger \(DispatchingLogger.java:341\)/))
  {
    logger.debug( "Picsolve remove ActiveMQ messages timestamp" );
    // OA 55703
  a.summary=a.summary.replace(/20.*?[0-9][0-9]:[0-9][0-9]:[0-9][0-9],\d+ ERROR \[ActiveMQ Session Task-\d+\] /," ERROR \[ActiveMQ Session Task- \] ");
  }

var matches = undefined;
  if( matches = a.summary.match(/gatekeeper2 backup_util: scheduled operation: BACKUP operation/))
  {
    logger.debug( "remove gatekeeper2 backup messages" );
    // OA 58880
   a.severity = -1; // discard
  }

var matches = undefined;
  if( matches = a.summary.match(/xinetd\[\d+\]: START:|EXIT: rsync .*/))
  {
    logger.debug( "remove rsync messages" );
    // OA 55703
   a.severity = -1; // discard
  }

var matches = undefined;
  if( matches = a.summary.match(/ntpd.*sync/))
  {
    logger.debug( "remove ntpd messages" );
    // OA 55703
   a.severity = -1; // discard
  }



  /*
   * NOTE:
   * Some heartbeat messages such as Low Idle span multiple lines
   *
   * Here we:
   * if single line { 
   * process single line
   * } else 
   * { 
   * process multi-line
   * } 
   *
   */
  if( obj.lines && obj.lines.length == 1 )
  {
    logger.debug( "SINGLE LINE" );
    // single line heartbeat rules follow

    switch( obj.mtype )
    {

      case "2":
      case "4": /* domain processor alert */
         a.severity =5;
         break;
      case "15":
      case "15998":
        var matches = undefined;
        if( matches = obj.message_0.match(/.*last message repeated.*/))
	  {
	 a.severity=-1; //discard
          }
        else if( obj.message_0.match(/ntpd.*sync/))
        {
          a.severity = -1; // discard
        }
        else if( obj.message_0.match( /Time offset/ ) )
        {
          a.severity = -1; // discard
        }
        else if( obj.message_0.match( /xinetd\[\d+\]: START:|EXIT: rsync .*/ ) )
        {
          a.severity = -1; // discard
        }
        break;

      case "11":
    logger.debug( "Mtype 11" );
        /*
	 * see single-line code later
         *
         * should deal witha a heartbeat message such as:
         * 14/02 22:11 Client [bwsvpv01], Mtype [11], Message [alarm.sh on bwsvpv01: CPU-Load=96 (treshold=90%)]
         */
        var matches = undefined;
        if( matches = obj.message_0.match( /alarm\.sh on (.*): CPU-Load=(\d+) \(treshold=(\d+)%/ ) )
        {
          a.node_alias = matches[1];
          a.alert_key = matches[2];
          a.identifier += 'cpuabove';
          a.summary = "CPU Load above threshold " + matches[3];
          a.severity = 2;
          if( parseInt( matches[2] ) >= 99 )
            a.severity = 4;
        }
        else if( matches = obj.message_0.match( /^Low Idle (\w+) Idle CPU (\d+) is below the desired threshold (\d+)/) )
        {
          a.summary = "CPU low idle below threshold " + matches[3];
          a.node_alias = matches[1];
          a.alert_key = matches[2];
          a.identifier += 'cpubelow';
	  a.severity = 2; /* display and auto clear */
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
	  a.severity = -1; /* display and auto clear */
	  a.owner = "system";
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

      case "16093":
      case "35375":
	switch( a.node )
	{
		/*
		 * Grover uses 16093/35375 from SiteScope for some
		 * red alerts that need to generate a pager bleep.
		 * 
		 */
		case "grover":
			a.identifier += obj.message;
			a.severity = 5;
			break;

		/*
		 * So other 16093/35375s will just appear as severity 1
		 * and simply agregated by node
		 */
	}
      break;

      case "50000":
	switch( a.node )
	{
		/*
		 * grover/burton uses 50000 from SiteScope when there are
		 * red alerts that need to generate a pager bleep.
		 * 
		 */
		case "burton":
		case "grover":
			a.identifier += obj.message;
			a.severity = 5;
			break;

		/*
		 * GOS duplicate SQL insert attempts
		 */
		case "blsbs01":
		case "oasbs01":
			var matches = undefined;
			if( matches = obj.message_0.match( /^GOS error.php: \d{4}-\d\d-\d\d\s+\d\d:\d\d:\d\d\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s*\S*\s*\d+\s*(\/apps1\/gos-prd1\/gos_web\/gos\/forms\/gos[13456]\/process\.php#\d+)\|ERROR\|Error code: \d+\|Duplicate entry \d+ for key \d+ SQL=INSERT INTO (gos_gos[13456])/ ) )
			  {
        //logger.info( 'GOS matches', matches, '' )
				a.summary = "GOS php error: " + matches[1] + " attempted duplicate insert into " + matches[2];
				a.severity = 5;
			  }
			break;

		/*
		 * So other 50000s will just appear as severity 1
		 * and simply agregated by node
		 */
		
	}
      break;

      case "50001":
	switch( a.node )
	{
		/*
		 * grover/burton uses 50001 from SiteScope when there are
		 * red alerts that need to generate a beep from
		 * webscreen but no pager alert.
		 */
		case "burton":
		case "grover":
			a.identifier += obj.message;
			a.severity = 5;
			break;

		/*
		 * So other 50001s will drop through
		 * and do what they did before
		 */
	}
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

            var better_date = new Date( year, --month, day, hours, minutes, seconds );
            a.last_occurrence = better_date

            var sev = matches[8];
            var msg = matches[9];
            // set an initial alert summary
            a.summary = msg;

            logger.debug( 'racoon matches', matches, '' )

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
        else if( matches = obj.message_0.match( /xntpd.*time reset/ ) )
        {
          a.severity = -1; //discard
        }

      break;

      case "88888":
          a.identifier += obj.message;
      break;

      default:
        logger.warn( "Unhandled message type. mtype", obj.mtype, '' )
      break;
    }



        /* DE-DUP FLOOD WARNING MESSAGES */
        var matches = undefined;
        if( matches = a.summary.match(/Flood warning: more than.*messages.*/))
        {
                a.summary=a.summary.replace(/more than.*messages/,"many messages");
                logger.debug("de-dup flood warning");
        }
	if (a.summary.match(/ntp.*time reset/))
	{
		a.severity = -1; /* display and auto-clear */
		a.owner = "system";
	}

  }
  else
  {
    logger.debug( "MULTI LINE" );
    // multi line heartbeat rules follow
    var ident2 = "";

    if( obj.message_0.match( /^### Message generated by checkwinlog.sh/ ) )
    {
      a.alert_group = "Windows";
      ident2 += "win:";

      winlog = {};
      obj.lines.forEach( function( line )
      {
        var matches = undefined;
        if( matches = line.match( /(^[A-Z][a-z\ ]+):[\.]+(\w+)/ ) )
        {
          winlog[matches[1]] = matches[2];
        }
      });

      if( winlog['Event code'] != undefined ) ident2 += winlog['Event code'];
      if( winlog['Hostname'] != undefined )  a.node_alias = winlog['Hostname'];
      if( winlog['Source'] != undefined )  a.proxy_agent = winlog['Source'];
      switch( winlog['Type'] )
      {
        case "Error": a.severity = 5; break;
        default: a.severity = 1; break;
      }

      var matches = "";
      if( matches = obj.message_12.match( /^(The (.*) service terminated unexpectedly)(.*)/ ) )
      {
        a.summary = matches[1];
      }
    }
    else if( obj.message_0.match( /Report: \w+/ ) )
    {
      // intention here is to discard report messages that are not real time alerts
      a.severity = -1;
    }
    else if( obj.message_0.match( /The Disk Space Report: / ) )
    {
      // intention here is to discard report messages that are not real time alerts
      a.severity = -1;
    }	
    else if ( obj.message_0.match( /Low Idle/ ))
	{
		a.severity = -1; /* display and auto-clear */
		a.owner = "system";
	}



    a.identifier += ":" + ident2;
  }


//  a.identifier += ':' + a.summary.replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9])+[0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]/,""); // mantis 1474
    a.identifier += ':' + a.summary; // mantis 1474



	switch(a.node) {
		case 'smtp':
			a.node = "oaxgs16";
			break;
		default:
			break;
	}
 /*
  * Populate the customer field
  */
	if (a.node.match(/accounts-2.*/i))
	{
        	a.customer = 'BDB Law';
        	a.group = 'BDB Law';
	}
	else if (a.node.match(/10\.51\.0\.1|192\.168\.50\.1|192\.168\.50\.2|camelot|ctracker/i))
	{
        	a.customer = 'Camelot';
        	a.group = 'Camelot';
	}
	else if (a.node.match(/xeib|xeldap2prdswn|vitspr/i))
	{
        	a.customer = 'Xerox';
        	a.group = 'Xerox';
	}
	else if (a.node.match(/[hb]lgmtv0\d/))
	{
        	a.customer = 'GoldMoney';
        	a.group = 'GoldMoney';
	}
	else if (a.node.match(/eastwood|burton|hlbkp001|hlmn|hlsfp|hlsq|hlswt|hlvb|hlut|OA_UPS|blmn|blvb|blut|bloapv02|hwm|hwjk|blbkp|plbkp/i))
	{
        	a.customer = 'OA';
        	a.group = 'OA';
	}
        else if (a.node.match(/blfwp|hlfwp|gatekeeper/i))
        {
                a.customer = 'OA_Firewall';
                a.group = 'OA_Firewall';
        }
        else if (a.summary.match(/backup script failed|rsync complete backup for hostname.* failed/i))
        {
                a.customer = 'OA_Backup';
                a.group = 'OA_Backup';
        }
	else if (a.node.match(/[fd]cr-v-.*|mulemmc/i))
	{
        	a.customer = 'C4';
        	a.group = 'C4';
	}
        else if (a.node.match(/invoice-01|scruttock|psap.*|[zs][lw]pip.*|[zu][lw]piat.*|z[lw]piqa.*/i))
        {
                a.customer = 'Picsolve';
                a.group = 'Picsolve';
        }
	else if (a.node.match(/hlsnpv01/))
	{
        	a.customer = 'Security';
        	a.group = 'Security';
	}
        else if ( a.node.match(/gm10v|gm11v|gm12v|gm13v|gm14v|gm15v|gm6v|gm7v|gm9v|gm20v|gm31|gm32|gm33|gm23|gm22|gm2v|gm65/i))
        {
                a.customer = 'GoldMoneyTest';
                a.group = 'GoldMoneyTest';
		a.owner = 'GoldMoneyTest';
                a.acknowledged = true;
        }
        else if ( a.node.match(/gm0v|cms3preprod.*|cms3ppdb|gsppapp.*|gsppdb.*/i))
        {
                a.customer = 'GoldMoneyPre-Prod';
                a.group = 'GoldMoneyPre-Prod';
                a.acknowledged = true;
        }
        else if ( a.node.match(/gm89|gm21|cms3prod.*|cms3db.*|gm1v|gm71|gm26|gm27|gm-mta.*|gm16v|gm100.*|gm40|gm87|gm88|gm90|gm91|gm42|gm17|gm68|gm69|gm28|gm-infra.*|(www|secure).goldmoney.com|gmnfs/i))
        {
                a.customer = 'GoldMoneyProd';
                a.group = 'GoldMoneyProd';
        }
        else if (a.node.match(/lcqc.*|imsuexp|cqc-esb|cqc.org.uk/i))
        {
                a.customer = 'CQC';
                a.group = 'CQC';
        }
        else if (a.node.match(/zlcsc/i))
        {
                a.customer = 'CSC';
                a.group = 'CSC';
        }

        else if (a.node.match(/donor2/i))
        {
                a.customer = 'AnthonyNolan';
                a.group = 'AnthonyNolan';
        }

        else if (a.node.match(/oasbs|blsbs|hlsbs|hlss|lftpserver|oaxgs20|sbs-scan|blsid|sbs.nhs.uk|app-dev1|gos-test3|owls-pilot/i))
        {
                a.customer = 'Steria';
                a.group = 'Steria';
        }

        else if (a.node.match(/cmapp|cmdb|cmproxy|_bridge/i))
        {
                a.customer = 'RoyalC';
                a.group = 'RoyalC';
        }

};
