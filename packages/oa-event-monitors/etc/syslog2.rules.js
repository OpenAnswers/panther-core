/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */


var log4js = require( 'log4js' );
var logger = log4js.getLogger( 'agent' );
var inspect = require( 'util' ).inspect;
//logger.setLevel('TRACE');
//logger.setLevel('DEBUG');
logger.setLevel('WARN');

/*
 * a short helper function
 */
var kv_splitter = function( input, sep_one, sep_two )
{
  var tk_one = input.split( sep_one );
  var o = {};
  tk_one.forEach( function( tk )
  {
    var tk_two = tk.split( sep_two );
    o[tk_two[0]] = tk_two[1] || '';
  });
  return o;
};

/*
 * rules start here, exports.rules is the logic that maps input tokens that 
 * have been parsed from the alert source, into fields for the database
 *
 * The primary purpose of the rules, is to use the tokens from the
 * input object to set values in the output alert.  In cases where there is a simple
 * mapping if input fields to output fields then the rules will be fairly short.
 *
 * In order for each event to be correctly be identified by the server as a repeat event
 * there is one field in the output_alert that must be constructed to be 
 * "fairly unique".  That field is the identifier.  When the server receives an
 * event with an identical identifier to one that already exists in the 
 * database a counter (the tally) is incremented on the existing record.
 *
 * A good indentifier is one that if the same event happens again it will produce
 * the same identifier.
 *
 * e.g. given a message from syslog such as
 *   Login failure by user vince
 * 
 * the following would be a good indentifier
 *
 * output_alert.identifier = input_object.daemon +':'+ input_object.host +':'+ input_object.message
 *
 * that way the next time user vince fails to login there will be one event with a 
 * count of 2.
 * 
 *
 * exports.rules = function( output_alert, input_object )
 *
 * output_alert = {}
 *   field names in output_alert can be any of the 'names' specified
 *   in nodeserver/etc/alertdefs.js
 *   e.g. to set the "node" field for the alert
 *     output_alert.node = "myhostname";
 *     or
 *     output_alert["node"] = "myhostname";
 *
 *   The output_alert object is what gets sent over the wire to the server
 *
 *
 * input_object = {
 *        originalMessage: '<23>Apr 19 16:03:43 vinces-desktop master[40]: process 4460 exited, status 0',
 *        prival: 23,
 *        facilityID: 2,
 *        severityID: 7,
 *        facility: 'mail',
 *        severity: 'debug',
 *        type: 'RFC3164',
 *        time: Thu, 19 Apr 2012 15:03:43 GMT,
 *        host: 'vinces-desktop',
 *        message: 'process 4460 exited, status 0',
 *        daemon: 'master',
 *        daemon_pid: '40' }
 *
 *   The fields in the input_object are what you have to work with.  They represent 
 *   the tokens and values that have been extracted from the event source 
 *   ( in this case syslog )
 *                  
 */


exports.rules = function( a, obj )
{
	logger.trace( "a=" + inspect( a ) );
	logger.trace( "obj=" + inspect( obj ) );

	/*
	 * Compulsory alert fields
	 *
	 * a.node
	 * a.severity
	 * a.identifier
	 * a.summary
	 *
	 */

	a.summary = "";
	
	a.node = "unknown_host";
	if(obj.host != undefined)
	{
		a.node = obj.host.toLowerCase();
	}

	/* TRANSLATE SYSLOG severityID TO EVENT CONSOLE SEVERITY */

	/*
	 * these are the event console severity levels:
	 *
	 * Critical 5
	 * Major 4
	 * Minor 3
	 * Warning 2
	 * Indeterminate 1
	 * Display then clear automatically 0
	 * Drop and don't show -1
	 * 
	 * suggested policy:
	 * for things we really do not care about, set a.severity=-1
	 * to drop them.
	 * for things we don't care about, set a.severity=0
	 * so they will be displayed then auto cleared
	 */
	 
	switch(obj.severityID)
	{
		case 0: /* emerg   severityID 1 > a.severity 5 Critical */
			a.severity = 5;
			break;
		case 1: /* alert   severityID 1 > a.severity 5 Critical */
			a.severity = 5;
			break;
		case 2: /* crit    severityID 2 > a.severity 4 Major */
			a.severity = 4;
			break;
		case 3: /* err     severityID 3 > a.severity 3 minor */
			a.severity = 3;
			break;
		case 4: /* warning severityID 4 > a.severity 2 warning */
			a.severity = 2;
			break;
			
			/* a.severity 1 indeterminate reserved for heartbeat */

		case 5: /* notice  severityID 5 
			 * The oa-event-relay can be configured with oa-event-relay.properties
			 * to send heartbeat messages. We configure this to be "OAER OA Event Relay".
			 * We need to be store these in mongo so we can monitor the relay. 
			 */
			if(obj.message === "OAER OA Event Relay")
			{
				a.severity = 1; 
			} else 
			{
				a.severity = -1; /* drop */
			}	
			break;
		case 6: /* info    severityID 6 > a.severity -1 drop */
			a.severity = -1; /* drop */
			break;
		case 7: /* debug severityID 7 > a.severity -1 drop */
			a.severity = -1; /* drop */
			break;
	}	
	/*
	 * a.summary set the obj.message
	 * a.identifier set to a.node + a.severity + a.summary
	 */

	a.summary = obj.message;

        /*  Remove heartbeat messages - call 59631 */

        if (a.summary.match(/Agent syslogd is alive/i))
        {
                a.severity = -1; // Discard
        }

        /*  Remove GM messages - call 65068 */

        if (a.summary.match(/Forbidden request: gmprivsc02.goldmoney.com|must be purely alphanumeric, not/i))
        {
                a.severity = -1; // Discard
        }


	if (a.node.match(/^gmp/))
	{
		a.owner = 'GM_AWS';
		a.acknowledged = 1;
	}


	if (a.node.match(/^gmt/))
	{
		a.owner = 'GM_AWS_Test';
		a.acknowledged = 1;
	}

	/* Deduplicate GM_AWS alerts  - see call 65657 */

	if (a.summary.match(/process .* pid [0-9]+ exit status 1/i))
        {
		a.summary=a.summary.replace(/pid [0-9]+ exit/,"pid exit");
        }


	/* Deduplicate zabbix agents checks for cmapp1  - see call 64709 */

	if (a.summary.match(/temporarily disabling Zabbix agent checks on host/i))
        {
		a.summary=a.summary.replace(/zabbix-server: zabbix_server.log: .* temporarily/,"zabbix-server: zabbix_server.log: temporarily");
        }

	/* Discard hwmopv01 messages - see call 63586 */

	if (a.summary.match(/WTS_ERROR_UNEXPECTED/i) && a.node.match(/hwmopv01/i))
        {
		a.severity = -1; // Discard
        }

	/* Discard gm65 "erver name not matched" messages - see call 64479 */

	if (a.summary.match(/WARNING: Server name not matched/i) && a.node.match(/gm65/i))
        {
		a.severity = -1; // Discard
        }

	/* Discard Metal currency is not valid messages - see call 64174 */

	if (a.summary.match(/svc-spot-prices.php->svc-spot-prices.php.* An error occured. Error: Metal currency is not valid/i) && a.node.match(/gm10027/i))
        {
		a.severity = -1; // Discard
        }

	/* Discard GM failed age verificated alerts - see call 64087 */

	if (a.summary.match(/gm_getrates-frxfeedl.btc.php->gm_frx.inc.php.* failed age verification/i) && a.node.match(/gm26|gm0v/i))
        {
		a.severity = -1; // Discard
        }

	/* Discard GM HOCA messages - see call 64026 */

	if (a.summary.match(/gm_rbs-hoca-import.btc.php .* (HOCA import batch script starting|HOCA import batch script finishing|No files were processed|Processing .* file|Could not find any records in file:)/i) && a.node.match(/gm26|gm0v/i))
        {
		a.severity = -1; // Discard
        }

	/* Discard gm26 Feed messages - see call 63590 */

	if (a.summary.match(/Feed .* for USD and (HKD|CAD)|Cross variance was: .* but threshold was:|has been turned back on. All tests passed|At least one feed for each of the metals and exchange|All feeds for .* and .* are unavailable|Feed .* for .* failed cross variance threshold|Feed .* for .* turned off/i) && a.node.match(/gm26/i))
        {
		a.severity = -1; // Discard
        }

	/* Discard zlcscmgmtv01 pulp warning messages - see call 63333 */

	if (a.summary.match(/pulp.*WARNING: Overwriting existing metadata file/i) && a.node.match(/zlcscmgmtv01/i))
        {
		a.severity = -1; // Discard
        }

        /*  Remove printer messages - call 62851 */

        if (a.summary.match(/Contact the administrator to install the driver before you log in again/i))
        {
                a.severity = -1; // Discard
        }

	/* Discard feed rate variance too big alerts from pre-prod and test servers - call 63206 */

	if (a.summary.match(/currency feed rate variance too big/i) && a.node.match(/gm0v|gm11v|gm7v/i))
        {
		a.severity = -1; // Discard
        }

	/* Discard general Feed messages from gm0v - call 63415 */

	if (a.summary.match(/Feed/i) && a.node.match(/gm0v/i))
        {
		a.severity = -1; // Discard
        }

	/* Deduplicate feed rate variance too big alerts from prod - call 63206 */

	if (a.summary.match(/currency feed rate variance too big \[Standard Bank.*/i) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/Standard Bank.*/,"Standard Bank]");
        }

	/* Deduplicate feed rate variance too big alerts from prod - call 63206 */

	if (a.summary.match(/currency feed rate variance too big \[Reuters.*/i) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/Reuters.*/,"Reuters]");
        }

	/* Discard gm26 rsync messages -see call 62833 */

	if (a.summary.match(/rsync.* error|rsync: connection unexpectedly closed/i) && a.node.match(/gm26/i))
        {
		a.severity = -1; // Discard
        }

	/* Deduplicate hlsnpv01 messages -see call 63024 */

	if (a.summary.match(/Recovering by rolling forward the cid=[0-9]+/i) && a.node.match(/hlsnpv01/i))
        {
		a.summary=a.summary.replace(/cid=[0-9]+/,"cid ");
        }

	/* Deduplicate security messages -see call 62868 */

	if (a.summary.match(/{TCP} [0-9]+.[0-9]+.[0-9]+.[0-9]+/i) && a.node.match(/hlsnpv01/i))
        {
		a.summary=a.summary.replace(/{TCP} [0-9]+.[0-9]+.[0-9]+.[0-9]+/,"{TCP} ");
        }

	if (a.summary.match(/{UDP} [0-9]+.[0-9]+.[0-9]+.[0-9]+/i) && a.node.match(/hlsnpv01/i))
        {
		a.summary=a.summary.replace(/{UDP} [0-9]+.[0-9]+.[0-9]+.[0-9]+/,"{UDP} ");
        }


	/* Deduplicate GM messages -see call 62707 */

	if (a.summary.match(/AFTR batch script starting/i))
        {
		a.summary=a.summary.replace(/AFTR batch script starting .*/,"AFTR batch script starting ");
        }

	if (a.summary.match(/HOCA import batch script starting/i))
        {
		a.summary=a.summary.replace(/HOCA import batch script starting .*/,"HOCA import batch script starting ");
        }

	if (a.summary.match(/HOCA import batch script finishing/i))
        {
		a.summary=a.summary.replace(/HOCA import batch script finishing .*/,"HOCA import batch script finishing ");
        }

	if (a.summary.match(/historic exch rate conversion: unable to find recent rate for feed/i))
        {
		a.summary=a.summary.replace(/unable to find recent rate for feed .*/,"unable to find recent rate for feed ");
        }

	if (a.summary.match(/AFTR batch script exiting .* no transactions imported/i))
        {
		a.summary=a.summary.replace(/AFTR batch script exiting .* no transactions imported/,"AFTR batch script exiting no transactions imported");
        }

	/* Deduplicate IP addr snort messages -see call 62623 */

	if (a.summary.match(/SDF Combination Alert \[Classification: Senstive Data\] \[Priority: 2\] .* {PROTO:254}/i) && a.node.match(/hlsnpv01/i))
        {
		a.summary=a.summary.replace(/{PROTO:254} .*/,"{PROTO:254} ");
        }

	/* Deduplicate GM price messages -see call 62577 */

	if (a.summary.match(/Failing Ask price:[0-9]{2}.[0-9]{10} lower than [0-9]{2}.[0-9]{10}/i) && a.node.match(/gm32v/i))
        {
		a.summary=a.summary.replace(/Failing Ask price:[0-9]{2}.[0-9]{10} lower than [0-9]{2}.[0-9]{10}/,"Failing Ask price: X lower than Y");
        }

	if (a.summary.match(/Failing Bid price:[0-9]{2}.[0-9]{10} is higher than [0-9]{2}.[0-9]{10}/i) && a.node.match(/gm32v/i))
        {
		a.summary=a.summary.replace(/Failing Bid price:[0-9]{2}.[0-9]{10} is higher than [0-9]{2}.[0-9]{10}/,"Failing Bid price: X is higher than Y");
        }

	/* Remove caching messages from gm10027?v - see call 59728 */

	if (a.summary.match(/Cannot cache the result for key/i) && a.node.match(/gm10027/i))
        {
                a.severity = -1; // Discard
        }

	/* Remove spurious gm42 messages - see call 60121 */

	if (a.summary.match(/cc_id = pc_acc_id#015#012#011#011#011#011and acc_id = pc_acc_id#015#012#011#011#011#011|select count\(\*\) as num_rules from#015#012#011#011#011#011post_rule,#015#012#011#011#011#011post_to_acc,#015#012#011#011#011#011function/i) && a.node.match(/gm42/i))
        {
                a.severity = -1; // Discard
        }

	/* Remove spurious blftpv01 messages */

        if (a.summary.match(/pam_succeed_if\(proftpd:session\): error retrieving information about user 0/i))
        {
                a.severity = -1; // Discard
        }



	/* Remove spurious sbs-scan messages - see call 60800 */

	if (a.summary.match(/sbs-scan - Error. Duplicate batches \(this\) .* and \(previous\)/i))
        {
                a.severity = -1; // Discard
        }


	/* Remove spurious sbs-scan messages - see call 62041 */

	if (a.summary.match(/SBS Scanning - Failed to move batch directory on PCT/i))
        {
                a.severity = -1; // Discard
        }

	/* Remove spurious message from gm100270v - see call 59759 */

	if (a.summary.match(/RepositoryAbstract.php:562 | msg:Invalid argument supplied for foreach/i) && a.node.match(/gm10027/i))
        {
                a.severity = -1; // Discard
        }

	/* Remove spurious GM alerts - see call 60975 */

	if (a.summary.match(/unsupported currency and location combo|Got in acle_updateExchRates|Running only holding specific RTE checks/i))
        {
                a.severity = -1; // Discard
        }


	/* Remove spurious gm26 messages - see call 59486 */

	if (a.summary.match(/\[gm_close-abandoned-hld.btc.php->gm_close-abandoned-hld.btc.php.* (count:|duration:)/i) && a.node.match(/gm26/i))
        {
                a.severity = -1; // Discard
        }

	/* Filter GM gm26 storage fee messages -see call 60594 */

	if (a.summary.match(/monthly fee batch: failed|monthly fee batch: Cannot directly convert metal to metal|monthly fee batch: unknown combination passed to gm__generateFeeMemo|monthly fee batch: currency to convert should be a metal, not|monthly fee batch: currency .* is invalid|monthly fee batch: invalid storage payment preference|detected another instance of this service - terminating/i) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/\[.*\] monthly fee batch/,"GoldMoney monthly fee batch");
                a.severity = 5; // Discard
        }

	/* Deduplicate printing alerts -see call 61921  */

	if (a.summary.match(/printing\/print_cups.c/))
	{
		a.summary=a.summary.replace(/.* printing\/print_cups.c.*/," printing/print_cups.c");
	}

	/* Deduplicate gm27 and gm71 messages -see call 61406  */

	if (a.summary.match(/About to forcefully kill process/) && a.node.match(/gm27|gm71/i))
	{
		a.summary=a.summary.replace(/kill process .*/,"kill process");
	}

	/* Deduplicate gm26 messages -see call 61406  */

	if (a.summary.match(/gm_rrm-calc.btc.php\] rrm [0-9]{1,2}% complete/) && a.node.match(/gm26/i))
	{
		a.summary=a.summary.replace(/rrm [0-9]{1,2}%/,"rrm %");
	}

	/* Discard GM alerts -see call 63138 */

	if (a.summary.match(/vs\. .* feed variance = USD/))
	{
		a.severity = -1; // Discard
	}

	/* Remove GM country_code messages - see call 59486 */

	if (a.summary.match(/msg:Undefined index:  country_code/i) && a.node.match(/gm10027/i))
        {
                a.severity = -1; // Discard
        }

	/* De-duplicate GM alerts - see call 61389*/

	if (a.summary.match(/run-parts\(\/etc\/cron.hourly\).* finished 0anacron/))
	{
		a.summary=a.summary.replace(/y\).* finished/,"y) finished");
	}

	if (a.summary.match(/run-parts\(\/etc\/cron.hourly\).* starting 0anacron/))
	{
		a.summary=a.summary.replace(/y\).* starting/,"y) starting");
	}

	if (a.summary.match(/Finished catalog run in .* seconds/))
	{
		a.summary=a.summary.replace(/in .* seconds/," ");
	}

	/*  GoldMoney - see OA 61694 */

	if (a.summary.match(/slow query in db .*/) && a.node.match(/gm7v|gm32v|gm9v|gm11v/i))
	{
			a.summary=a.summary.replace(/slow query in db .*/,"slow query in db ");
	}

	if (a.summary.match(/currency feed rate old .*/) && a.node.match(/gm7v|gm32v|gm9v|gm11v/i))
	{
			a.summary=a.summary.replace(/currency feed rate old .*/,"currency feed rate old ");
	}

	/* De-duplicate CQC alerts - see call 59330*/

	if (a.summary.match(/.* [0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+.[0-9]+ BST >/))
	{
		a.summary=a.summary.replace(/.* [0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+.[0-9]+ BST >/," ");
	}


	/* De-duplicate C4 alerts - see call 59643 and 59643 */

	if (a.summary.match(/prod2 c4ms-rmws ERROR com.openanswers.core.platform.appsupport.exceptions.AppExceptionHandler ||CAUSE_DEPTH=0||CODE=/))
	{
		a.summary=a.summary.replace(/\[<\?xml version=.*/," ");
	}

	/* De-duplicate GM alerts - see call 59367 */

	if (a.summary.match(/warning: .* write queue file: No space left on device/))
	{
		a.summary=a.summary.replace(/warning: .* write queue file: No space left on device/,"warning: write queue file: No space left on device");
	}

        /*  Remove GM deprecated messages - call 59334 */

        if (a.summary.match(/is deprecated. For more information, see|Deprecation notice: must now include|Skipping because of failed dependencies|warning: unable to look up public\/pickup/i))
        {
                a.severity = -1; // Discard
        }

        /*  Remove GM MailChimp and translator alerts - call 59486 */

        if (a.summary.match(/No entry is registered for key .*translator|MailChimp logs. Environment: GS. Email: .* Mailchimp code: 1. Mailchimp error: No errors/i))
        {
                a.severity = -1; // Discard
        }

        /*  Remove gm26 alerts  OA 59432 */

        if (a.summary.match(/Starting holding specific RTE checks|Running both entity and holding specific RTE checks|Starting entity specific RTE checks|Data Cache setting|Max EntCode:|thv\/tnmfv duration|thv\/tnmfv count|initiated delta match/))
        {
                a.severity = -1; // Discard
        }

        /*  TEMPORARY OA 58415 */

        if (a.summary.match(/RFC 1918 response from Internet for/))
        {
                a.severity = -1; // Discard
        }

        /*  Remove some Zabbix alerts - call 59385 */

        if (a.summary.match(/ERROR:  relation .* does not exist at character|ERROR:  current transaction is aborted, commands ignored until end of transaction block|STATEMENT:  SELECT/i) && a.node.match(/hlmnpv02/i))
        {
                a.severity = -1; // Discard
        }

        /*  Remove some truncating alerts - call 59385 */

        if (a.summary.match(/truncating integer value/i))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 59001 */

        if (a.summary.match(/Size of LBMA platinum feed for .* was smaller than expected/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 59001 */

        if (a.summary.match(/Interactive Data vs. Morningstar \(XML\) feed variance =/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 59001 */

        if (a.summary.match(/gm-frxfeedl.* (Starting|Shutting down|Listener started successfully|Listener reached end of life)/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 59001 */

        if (a.summary.match(/index.php->index.php.* .*TicketTrackingController.php.* msg:Undefined index/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 59001 */

        if (a.summary.match(/Could not find template .*gpg\/\/gnupg\/gpg.conf.* .* on node gm_hurasu_test.goldmoney.com/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 59001 */

        if (a.summary.match(/Access denied for user|pam_fprintd.so/i) && a.node.match(/gm12v/i))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58949 */

	/* Discard the following currencies - Russian ruble,Mexican peso and Indian rupee */

        if (a.summary.match(/currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;(810|484|356);.*/) && a.node.match(/gm26/i))
        {
                a.severity = -1; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;840;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;840;.*/," ;US Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;826;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;826;.*/," ;Pound Sterling] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;978;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;978;.*/," ;Euro] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;756;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;756;.*/," ;Swiss Franc] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;392;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;392;.*/," ;Japanese Yen] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;036;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;036;.*/," ;Australian Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;124;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;124;.*/," ;Canadian Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;554;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;554;.*/," ;New Zealand Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* .* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;344;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/.* currency/,"gm_getrates-frxfeedl.btc.php-> currency");
		a.summary=a.summary.replace(/;[0-9]+;344;.*/," ;Hong Kong Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;840;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;840;.*/," ;US Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;826;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;826;.*/," ;Pound Sterling] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;978;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;978;.*/," ;Euro] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;756;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;756;.*/," ;Swiss Franc] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;392;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;392;.*/," ;Japanese Yen] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;036;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;036;.*/," ;Australian Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;124;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;124;.*/," ;Canadian Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;554;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;554;.*/," ;New Zealand Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->.*\]* currency feed rate variance too big \[(Morningstar|Interactive) [^0-9]+;[0-9]+;344;.*/) && a.node.match(/gm26/i))
        {
		a.summary=a.summary.replace(/;[0-9]+;344;.*/," ;Hong Kong Dollar] ");
                a.severity = 5; 
        }

        if (a.summary.match(/currency feed rate variance too big/) && a.node.match(/gm9v|gm32v/i))
        {
                a.severity = -1; // Discard
        }

        if (a.summary.match(/currency feed rate variance too big \[Interactive/) && a.node.match(/gm0v|gm7v|gm32v/i))
        {
		a.summary=a.summary.replace(/Interactive Data.*/,"Interactive Data] ");
        }

        if (a.summary.match(/currency feed rate variance too big \[Morningstar/) && a.node.match(/gm0v|gm7v|gm32v/i))
        {
		a.summary=a.summary.replace(/Morningstar .*/,"Morningstar] ");
        }


        /*  GoldMoney - see OA 58773 */

        if (a.summary.match(/Failed to open device: \/dev\/symbdsnapctl, errno: 2/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58879 */

        if (a.summary.match(/partneripverify=/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58879 */

        if (a.summary.match(/unknown sysparam key/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58879 */

        if (a.summary.match(/submitted sms message to/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58879 */

        if (a.summary.match(/invalid promocode/))
        {
                a.severity = -1; // Discard
        }


        /*  GoldMoney - see OA 58881 */

        if (a.summary.match(/Directory .*pyhook/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58881 */

        if (a.summary.match(/\/var\/spool\/abrt\/pyhook/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58881 */

        if (a.summary.match(/apache_status_fetch.py.* belong to any package and ProcessUnpackaged/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58881 */

        if (a.summary.match(/New client connected/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58882 */

        if (a.summary.match(/gm_getrates-frxfeedl.btc.php->gm_frx.inc.php\]* .*currency feed rate old/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58882 */

        if (a.summary.match(/gm_wck.* (world-check - imported|world-check - deleted|world-check match)/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58882 */

        if (a.summary.match(/gm_rte-check.btc.php->gm_rte-check.btc.php .* Memory .*usage/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58882 */

        if (a.summary.match(/.*gx_db.inc.php .* slow query in db/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58882 */

        if (a.summary.match(/gm_rte-check.btc.php->gm_rte-check.btc.php .* Max HldCode/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58882 */

        if (a.summary.match(/.* rte duration|.* rte review|.* rte count|.* rte .* complete/))
        {
                a.severity = -1; // Discard
        }

        /*  GoldMoney - see OA 58882 */

        if (a.summary.match(/.*gm_ent-match.btc.php .* entity match (count|duration)/))
        {
                a.severity = -1; // Discard
        }

	/* Discard GM info messages - see call 58593 */

        if (a.summary.match(/Affiliate counters updated|AFTR batch script starting|AFTR batch script exiting/))
        {
                a.severity = -1; // Discard
        }

	/* remove digits from within [] and () brackets from GM messages */

	if (a.summary.match(/.* \([0-9]+\)\]\[[0-9]+\] .*/))
	{
		a.summary=a.summary.replace(/ \([0-9]+\)\]\[[0-9]+\]/,"\]");
	}


        /*  Discard blutpv03 dump messages see call 59002 */

        if (a.summary.match(/Directory .*ccpp.* creation detected|\/var\/spool\/abrt\/ccpp/i) && a.node.match(/blutpv03/i))
        {
                a.severity = -1; // Discard
        }

	/* remove date time from start of switch messages */

	if (a.summary.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*?\.[0-9][0-9][0-9]:/))
	{
		a.summary=a.summary.replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*?\.[0-9][0-9][0-9]:/,"");
	}


	/* remove date time from picsolve atlantis palm db messages */
	if (a.summary.match(/20.*?[0-9][0-9]:[0-9][0-9]:[0-9][0-9] [BG]ST/))
	{
		a.summary=a.summary.replace(/20.*?[0-9][0-9]:[0-9][0-9]:[0-9][0-9] [BG]ST/,"");
	}

	/* Remove zabbix-server: zabbix_server.log and series of numbers from unsupported messages */

	if (a.summary.match(/zabbix-server: zabbix_server.log: [\s]*[0-9]+:[0-9]+:[0-9]+\.[0-9]+ item/))
	{
		a.summary=a.summary.replace(/zabbix-server: zabbix_server.log: [\s]*[0-9]+:[0-9]+:[0-9]+\.[0-9]+/,"zabbix_server.log ");
	}

	/* remove duplicate key value violates unique constraint messages */

	if (a.summary.match(/duplicate key value violates unique constraint/))
	{
		a.severity = 0; // display and then discard
	}

        /*  Discard all Printer Driver messages from invoice-01 */

        if (a.summary.match(/Driver .* Printer/i) && a.node.match(/invoice-01|scruttock/i))
        {
                a.severity = -1; // Discard
        }

        /*  Discard all login failure messages from scruttock */

        if (a.summary.match(/AUDIT_FAILURE An account failed to log on/i) && a.node.match(/scruttock|invoice-01/i))
        {
                a.severity = -1; // Discard
        }

	/* remove PicSolve Schema messages */

	if (a.summary.match(/Picsolve.UserDB ERROR: schema \"transactions\" does not exist/))
	{
		a.severity = 0; // display and then discard
	}


        /* Check if obj.facility is undefined and if so set it to a dummy value */

        if (obj.facility === undefined)
        {
                obj.facility = "dummy";
        }


        /* Set all messsages with a facility of auth or authpriv to Security */

        if (obj.facility.match(/auth/))
        {
                a.customer = 'Security';
                a.summary=a.summary.replace(/(:[0-9]{1,5})? -> (\b[0-9]{1,3}\.){3}[0-9]{1,3}(:[0-9]{1,5})?/,"");
              /*  a.summary=a.summary.replace(/:[0-9][0-9][0-9][0-9][0-9]/,""); */
        }


	/* Discard server reboot messages - call 56806 */

        if (obj.facility.match(/kern/) && obj.severity.match(/info/))
        {
                a.severity = -1;
        }


        /*  Set all Priority 1 messages from snort server to priority 4 */

        if (a.summary.match(/\[Priority: 1\]/) && a.node.match(/hlsnpv01/))
        {
                a.severity = 4; // Set severity to 4
        }

        /*  Discard all messages from snort server that do not contain the string "Priority: 1" or "Priority: 2" */

        if (a.summary.match(/\[Priority: 3\]/) && a.node.match(/hlsnpv01/))
        {
                a.severity = -1; // Discard
        }

        /*  Discard all messages "fatal: unsupported: -bV" generated by cfg2html */

        if (a.summary.match(/fatal: unsupported: -bV/))
        {
                a.severity = -1; // Discard
        }

	/* Deduplicate donor2 messages - see call 56763 */

	if (a.summary.match(/[0-9]+:[0-9]+:[0-9]+.[0-9]+ item \[donor2:ssh.run\[.* became not supported/))
	{
		a.summary=a.summary.replace(/[0-9]+:[0-9]+:[0-9]+.[0-9]+/,"");
	}

        /*  Discard all messages from C4 that contain the strings "String#012" and "MULE_ERROR" */

        if (a.summary.match(/String#012.* .* MULE_ERROR/) && a.node.match(/[df]cr-v-.*/i))
        {
                a.severity = -1; // Discard
        }


        /*  Discard all messages from C4 INT and TEST that do not contain the word "error" or "ERROR" - see OA 56913 */
	/* AB. Removed this rule after discussion with Jeremy - see call 58071
         * if (a.summary.match(/^((?!error).)*$/i) && a.node.match(/fcr-v-esbint01|fcr-v-esbtest01|[fd]cr-v-.*uat01|[fd]cr-v-esblive01/i))
         * {
         *        a.severity = -1; // Discard
         * }
	 */

	/* Call 58095
	 * In channel4 log4j configuration we use LOCAL3 facility for mule messages
	 * Of these we are only interested in those that contain 'c4ms.*ERROR.*CODE='.
	 * We should discard LOCAL3 messages which have any other format
	 */

	if (a.node.match(/fcr-v-esbint01|fcr-v-esbtest01|[fd]cr-v-.*uat01|[fd]cr-v-esblive01/i) && obj.facility.match(/local3/i))
	{
		if (a.summary.match(/^((?!c4ms.*ERROR.*CODE=).)*$/))
		{
			a.severity = -1; // Discard
		}
	}

	/* Call 59539 and 61795
	 * In cqc log4j configuration we use LOCAL3 facility for mule messages
	 * Of these we are only interested in those that contain 'MSG=' or
	 * 'org.mule.exception.DefaultSystemExceptionStrategy'. 
	 * We should discard LOCAL3 messages which have any other format
	 *
	 * Call 64313
	 * Disabled. 
	 */

	/* 
	 *if (a.node.match(/lcqcesb|imsuexpesb/i) && obj.facility.match(/local3/i))
	 *{
	 *	if (a.summary.match(/^((?!MSG=).)*$/) && a.summary.match(/^((?!org.mule.exception.DefaultSystemExceptionStrategy).)*$/))
	 *	{
	 *		a.severity = -1; // Discard
	 *	}
	 *}
	 */


	/* Alert for CQC  connect timed out messages - see call 62212 */
	/* Call 64313
	 * Added ERROR.*org.quartz
	 */

	if (a.summary.match(/ERROR.*org.mule|ERROR.*org.quartz|ERROR.*com.openanswers.*CODE=/) && a.node.match(/lcqcesb|imsuexp/i))
	{
		a.severity = 4; 
	}

	if (a.node.match(/[fd]cr-v-esblive01/i) && a.summary.match(/ERROR [0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+,[0-9]+/))
	{
		a.summary=a.summary.replace(/[0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+,[0-9]+/,"");
	}

        if (a.node.match(/fcr-v-esbint01|fcr-v-esbtest01/i) && a.summary.match(/ERROR [0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+,[0-9]+/))
        {
                a.summary=a.summary.replace(/[0-9]+-[0-9]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+,[0-9]+/,"");
                a.customer = 'C4Test';
                a.owner = 'c4test';
                a.acknowledged = 1;
        }

        /*  Assign all messages from C4 INT and TEST that contain the word "error" to C4Test and owner c4test- see OA 56913 */

        /* if (a.summary.match(/ERROR/) && a.node.match(/fcr-v-esbint01|fcr-v-esbtest01/i)) */

	/* Assign all C4 Int and Test to C4Test, over-riding the above rule - OA call 61162 */

        if ( a.node.match(/fcr-v-esbint01|fcr-v-esbtest01/i)) 
        {
                a.customer = 'C4Test';
                a.owner = 'c4test';
		a.acknowledged = 1;
        }

        /*  Assign all messages from UAT servers to C4Test and owner c4test- see OA 56913 */

        if ( a.node.match(/[fd]cr-v-.*uat01/i))
        {
                a.customer = 'C4Test';
                a.owner = 'c4test';
		a.acknowledged = 1;
        }

        /*  Discard all messages "fatal: Read from socket failed: Connection reset by peer" call 56855  */

        if (a.summary.match(/fatal: Read from socket failed: Connection reset by peer/))
        {
                a.severity = -1; // Discard
        }

        /*  Discard all messages "fatal: Write failed: Connection reset by peer" call 56863  */

        if (a.summary.match(/fatal: Write failed: Connection reset by peer/))
        {
                a.severity = -1; // Discard
        }

        /*  Discard all messages "read_data: read failure for 4 bytes to client" on burton call 56847  */

        if (a.summary.match(/read_data: read failure for 4 bytes to client/))
        {
                a.severity = -1; // Discard
        }

        /* if (a.summary.match(/\[Priority: 2|3\]/) && a.node.match(/hlsnpv01/))
        *{
        *       a.severity = -1; // Set severity to 4
        *}
	*/

        /*  Discard all messages from Atlantis-Palm database servers that do not contain the word "error" - see CR 1584*/

	/* Removed CR2068
        *if (a.summary.match(/^((?!error).)*$/) && a.node.match(/psapdb/i))
        *{
        *        a.severity = -1; // Discard
        *}
	*/

	if (a.summary.match(/\d+: An account failed to log on. Subject: Security ID: .* Failure Reason: Unknown user name or bad password. .*/))
	{
		a.severity = -1; // discard
	}

	/* Remove spurious webscreen messages */

	if (a.summary.match(/pam_ck_connector\(gdm:session\): nox11 mode, ignoring PAM_TTY|GConf-WARNING: Got Disconnected from DBus|Invalid legacy unicast query packet|Received response from host .* with invalid source port|Invalid response packet from host|client-conf-x11.c: xcb_connection_has_error/))
	{
		a.severity = -1; // discard
	}

	/* Removing spurious DNS messages */

	if (a.summary.match(/empty-zones-enable\/disable-empty-zone.* disabling RFC 1918 empty zones/))
	{
		a.severity = -1; // discard
	}

	/* remove burton "lib/util_sock.c:read_data" messages */

	if (a.summary.match(/.* lib\/util_sock\.c:read_data.*/))
	{
		a.severity = -1; // discard
	}

	/* remove superfluous rsync messages */

	if (a.summary.match(/file has vanished: .*/))
	{
		a.severity = -1; // discard
	}

	if (a.summary.match(/Admin PC rsync ran/))
	{
		a.severity = -1; // discard
	}

	if (a.summary.match(/rsync: writefd_unbuffered failed to write/))
	{
		a.severity = -1; // discard
	}

	if (a.summary.match(/rsync error: some files could not be transferred .*/))
	{
		a.severity = -1; // discard
	}

	/* remove webscreem dbus-daemon messages */

	if (a.summary.match(/.* Unable to contact D-Bus: org\.freedesktop\.DBus\.Error.NotSupported: Unable to autolaunch a dbus-daemon .*/))
	{
		a.severity = -1; // discard
	}

	/* remove ignoring max retries messages from blsfpv01/v02 */

	if (a.summary.match(/PAM service\(sshd\) ignoring max retries/))
	{
		a.severity = -1; // discard
	}

	/* remove sequence of chars and digits within [] brackets from beginning of lDAP alerts eg [4a08ec] */
	if (a.summary.match(/\[[a-zA-Z0-9]+\] ldap_result\(\) failed:/))
	{
		a.summary=a.summary.replace(/\[[a-zA-Z0-9]+\]/,"");
	}

	/* remove  dynamic data after the word VALUES in mysql error messages */
	if (a.summary.match(/database: mysql_error: The table .* is full#012SQL=INSERT INTO/))
	{
		a.summary=a.summary.replace(/VALUES \(.*\)/,"VALUES ");
	}

	/* remove psapdb2m An account failed to log on messages */
	if (a.summary.match(/\d+: An account failed to log on. Subject: Security ID: .* Failure Reason: Unknown user name or bad password. .*/))
	{
		a.severity = -1; // discard
	}

	/* Display but clear automatically Monitis alerts of the following type */
	if (a.summary.match(/Monitis Inc.: Monitis Smart Agent/))
	{
		a.severity = 0; // discard
	}

	if (a.summary.match(/^SBS/))
	{
		//a.owner = "joe";
		a.customer = "SBS";
	}

	if(a.summary.match(/^NPL/))
	{
		a.owner = "joe";
		a.customer = "SBS";
	}

	switch(obj.facility) {
		case 'authpriv':
			if (a.severity>3)
				a.severity=3;
	}

	/* 
	 * FORCE SWITCH MESSAGES TO SEVERITY 5 
	 */
	if (a.summary.match(/UPDOWN/))
	{
		a.severity = 5;
	}
	
	if (a.summary.match(/GST LOG: restored log file/))
	{
		a.severity = -1;
	}
        if (a.summary.match(/POST/))
        {
                a.severity = -1;
        }

  	if (a.node.match(/ulpiatgwp0[12]/i) && a.summary.match(/http-in app\/app.* 504 /))
        {
                a.summary=a.summary.replace(/.* app/,"Atlantis load webservice timeout app");
                a.summary=a.summary.replace(/[0-9]+\/.* \"/," 504 \"");
                a.severity = 2;
        }

        /*  De-duplicate SocketProcessor alerts - see call 58076 */

	if (a.summary.match(/WARN.*com.zabbix.gateway.SocketProcessor - error processing request/))
	{
		a.summary=a.summary.replace(/zabbix-java-gateway: .* WARN/,"WARN ");
	}



	/* FIX NODE NAMES CAMELOT AND OAXGS16 */
	
	switch(a.node) {
		/* plfwp001 = 10.51.0.1 */
		case '10.51.0.1':
			a.node = "plfwp001";
			break;

		/* plfwp001 = 192.168.50.2 */
		case '192.168.50.2':
			a.node = "plfwp002";
			break;
		case 'smtp':
			a.node = "oaxgs16";
			break;
		case '192.168.100.103':
			a.node = "oaxgs16";
			break;
		default:
		break;
	}


	logger.debug("received: "+a.node+" "+a.summary); 

	/*
	 * Now we do our message processing.
	 * All messages irrespective where they come from are treated
         * in the same way. 
	 * Further down we will modify things based on node
	 */

	/* REMOVE SHOREWALL MESSAGES */
	switch(true)
	{
		case /Shorewall:\S*:DROP/.test(obj.message):
			a.severity = -1;
			break;

		case /transmit timed out/.test(obj.message):
			a.severity = 5; //red
			break;

		// all other messages we leave as default 
		default:
			break;
	}


	/* REMOVE LAST MESSAGE REPEATED X TIMES WITH INCORRECT HOSTNAME*/
	/*
	 * rsyslog sends last message repeated X times
	 * with the hostname incorrectly set to 'last'
	 * let's just forget it
	 * we could do this in the rsyslog config
	 */
	switch(a.node)
	{
		case 'last':
			a.severity = -1;
			break;
	}
	if(a.summary.match(/Last message repeated.*/))
	{
			a.severity = -1; /* display then auto clear */
	}

	/* REMOVE DDNS messages */
	if( a.summary.match(/Unable to add forward map from/))
	{
		a.severity = -1; /* display and auto clear */
	}
	if ( a.summary.match(/client.*update.*denied/))
	{
		a.severity = -1	; /* display then auto clear */
	}

	/* REMOVE RSYNC NOISE */
	if ( a.summary.match(/rsync: link_stat.*failed:/))
	{
		a.severity = -1	; /* display then auto clear */
	}

	/* REMOVE TEAMPASS USER LOGGED IN */
	if( a.summary.match(/User logged in/))
	{
		a.severity = -1; /* display then auto clear */
	}

	/* REMOVE psapdbx spurious db messages */
	if( a.summary.match(/pgstat wait timeout|connection received:|LOG: duration|connection authorized/))
	{
		a.severity = -1; /* drop */
	}
        /* REMOVE psaplb1 print pc caused message see OA 54911 */
	switch(a.node)
	{
		case 'psaplb1':
        	if( a.summary.match(/UriFormatException/))
        	{
               	 a.severity = -1; /* drop */
        	}
	}



	/* REMOVE IMAP mail.warning message */
	if( a.summary.match(/idle for too long, closing connection/))
	{
		a.severity = -1; /* display then auto clear */
	}

	if( a.summary.match(/error: PAM: User not known to the underlying authentication module for illegal user/))
	{
		a.summary=a.summary.replace(/user .*? from/,"user from");
		a.severity = 3;
		logger.debug( "remove PAM error");
	}

	if( a.summary.match(/pam_access.* (access|Permission) denied for user/))
	{
			a.severity = -1;
	}


	/* pam_unix(sshd:auth): check pass; user unknown */
	if (a.summary.match(/check pass; user unknown/))
	{
		a.severity = -1; 
	}


	/* pam_succeed_if(sshd:auth): error retrieving information about user patrolag */
	if (a.summary.match(/pam_succeed_if\(sshd:auth\): error retrieving information about user/))
	{
		a.severity = -1; 
	}

	/* PAM unable to resolve symbol: pam_sm_acct_mgmt */
	if (a.summary.match(/PAM unable to resolve symbol: pam_sm_acct_mgmt/))
	{
		a.severity = -1; 
	}


	switch(a.node)
	{
		/* GM test machines */
		/* do not ignore at the moment... */
		case 'blgmtv01':
		case 'blgmtv02':
		case 'blgmtv03':
		case 'blgmtv04':
		case 'blgmtv05':
		case 'blgmtv06':
		case 'blgmtv07':
		/*	a.severity = 0; */
		/* display then auto clear */
			break;

		/* 
		 * Park Royal camelot active firewall
		 * plfwp001 and plfwp002 
		 * we let through everything.
		 */
		case '10.51.0.1': 
			a.node_alias = 'Park Royal active firewall';
			break;

		case '192.168.50.1':
			a.node_alias = 'plfwp001';
			break;

		case '192.168.50.2':
			a.node_alias = 'plfwp002';
			break;

		case '10.103.116.209':
			a.node_alias = 'broadsword';
			break;

		case '10.103.116.210':
			a.node_alias = 'dannyboy';
			break;

		case 'imsuexpesb901.ims.gov.uk':
		case 'imsuexpesb901':
			a.node_alias = a.node;
			a.node = 'alcqcdbtv01';
			break;

		case 'imsuexpesb902.ims.gov.uk':
		case 'imsuexpesb902':
			a.node_alias = a.node;
			a.node = 'alcqcesbtv01';
			break;
		
		case 'imsuexpesb903.ims.gov.uk':
		case 'imsuexpesb903':
			a.node_alias = a.node;
			a.node = 'alcqcesbuv01';
			break;

		case 'imsuexpesb904.ims.gov.uk':
		case 'imsuexpesb904':
			a.node_alias = a.node;
			a.node = 'alcqcesbuv02';
			break;

		case 'imsuexpesb905.ims.gov.uk':
		case 'imsuexpesb905':
			a.node_alias = a.node;
			a.node = 'alcqcamquv01';
			break;

		case 'imsuexpesb906.ims.gov.uk':
		case 'imsuexpesb906':
			a.node_alias = a.node;
			a.node = 'alcqcamquv02';
			break;

		case 'imsuexpesb907.ims.gov.uk':
		case 'imsuexpesb907':
			a.node_alias = a.node;
			a.node = 'alcqcdbuv01';
			break;

		case 'imsuexpesb908.ims.gov.uk':
		case 'imsuexpesb908':
			a.node_alias = a.node;
			a.node = 'alcqcdbuv02';
			break;

		case 'imsuexpesb909.ims.gov.uk':
		case 'imsuexpesb909':
			a.node_alias = a.node;
			a.node = 'alcqcesbpv01';
			break;

		case 'imsuexpesb910.ims.gov.uk':
		case 'imsuexpesb910':
			a.node_alias = a.node;
			a.node = 'alcqcesbpv02';
			break;

		case 'imsuexpesb911.ims.gov.uk':
		case 'imsuexpesb911':
			a.node_alias = a.node;
			a.node = 'alcqcamqpv01';
			break;

		case 'imsuexpesb912.ims.gov.uk':
		case 'imsuexpesb912':
			a.node_alias = a.node;
			a.node = 'alcqcamqpv02';
			break;

		case 'imsuexpesb913.ims.gov.uk':
		case 'imsuexpesb913':
			a.node_alias = a.node;
			a.node = 'alcqcdbpv01';
			break;

		case 'imsuexpesb914.ims.gov.uk':
		case 'imsuexpesb914':
			a.node_alias = a.node;
			a.node = 'alcqcdbpv02';
			break;

		case 'imsuexpesb915.ims.gov.uk':
		case 'imsuexpesb915':
			a.node_alias = a.node;
			a.node = 'alcqcmmcpv01';
			break;

		case 'imsuexpols901.ims.gov.uk':
		case 'imsuexpols901':
			a.node_alias = a.node;
			a.node = 'alcqcapppv01';
			break;

		case 'imsuexpols902.ims.gov.uk':
		case 'imsuexpols902':
			a.node_alias = a.node;
			a.node = 'alcqcapppv02';
			break;

		case 'imsuexpols903.ims.gov.uk':
		case 'imsuexpols903':
			a.node_alias = a.node;
			a.node = 'alcqcoampv01';
			break;

		case 'imsuexpols904.ims.gov.uk':
		case 'imsuexpols904':
			a.node_alias = a.node;
			a.node = 'alcqcoampv02';
			break;

		case 'imsuexpols905.ims.gov.uk':
		case 'imsuexpols905':
			a.node_alias = a.node;
			a.node = 'alcqcodjpv01';
			break;

		case 'imsuexpols906.ims.gov.uk':
		case 'imsuexpols906':
			a.node_alias = a.node;
			a.node = 'alcqcodjpv02';
			break;

		case 'imsuexpols907.ims.gov.uk':
		case 'imsuexpols907':
			a.node_alias = a.node;
			a.node = 'alcqcdbpv03';
			break;

		case 'imsuexpols908.ims.gov.uk':
		case 'imsuexpols908':
			a.node_alias = a.node;
			a.node = 'alcqcdbpv04';
			break;

		case 'imsuexpols909.ims.gov.uk':
		case 'imsuexpols909':
			a.node_alias = a.node;
			a.node = 'alcqcappuv01';
			break;

		case 'imsuexpols910.ims.gov.uk':
		case 'imsuexpols910':
			a.node_alias = a.node;
			a.node = 'alcqcappuv02';
			break;

		case 'imsuexpols911.ims.gov.uk':
		case 'imsuexpols911':
			a.node_alias = a.node;
			a.node = 'alcqcoamuv01';
			break;

		case 'imsuexpols912.ims.gov.uk':
		case 'imsuexpols912':
			a.node_alias = a.node;
			a.node = 'alcqcoamuv02';
			break;

		case 'imsuexpols913.ims.gov.uk':
		case 'imsuexpols913':
			a.node_alias = a.node;
			a.node = 'alcqcodjuv01';
			break;

		case 'imsuexpols914.ims.gov.uk':
		case 'imsuexpols914':
			a.node_alias = a.node;
			a.node = 'alcqcodjuv02';
			break;

		case 'imsuexpols915.ims.gov.uk':
		case 'imsuexpols915':
			a.node_alias = a.node;
			a.node = 'alcqcdbuv03';
			break;

		case 'imsuexpols916.ims.gov.uk':
		case 'imsuexpols916':
			a.node_alias = a.node;
			a.node = 'alcqcdbuv04';
			break;

		case 'imsuexpols917.ims.gov.uk':
		case 'imsuexpols917':
			a.node_alias = a.node;
			a.node = 'alcqcapptv01';
			break;

		case 'imsuexpols918.ims.gov.uk':
		case 'imsuexpols918':
			a.node_alias = a.node;
			a.node = 'alcqcdbtv02';
			break;

		/*
		 * All other machines we discard if the obj.severityID is 
		 * 6 or 7. ie. info or debug
		 */
		default:
			switch( obj.severityID )
			{
				case 7:
				case 6:
					/* a.severity = -1; */
					break;
				default:
					break;
			}
			break;
	}
	
	/*
	 * If statement on node again to set customer field
	 */
        if (a.node.match(/accounts-2.*/i))
        {
                a.customer = 'BDB Law';
        }

	else if (a.node.match(/10\.51\.0\.1|192\.168\.50\.1|192\.168\.50\.2|camelot|ctracker/i))
	{
        	a.customer = 'Camelot';
	}
	else if (a.node.match(/xeib|xeldap2prdswn|vitspr/i))
	{
        	a.customer = 'Xerox';
	}
	else if (a.node.match(/[hb]lgmtv0\d/))
	{
        	a.customer = 'GoldMoney';
	}
	else if (a.node.match(/eastwood|burton|hlbkp001|hlmn|hlsfp|hlsq|hlswt|hlvb|hlut|OA_UPS|blmn|blvb|blut|bloapv02|hwm|hwjk|blbkp|plbkp/i))
	{
        	a.customer = 'OA';
	}
	else if (a.node.match(/blfwp|hlfwp|gatekeeper/i))
	{
        	a.customer = 'OA_Firewall';
	}
	else if (a.summary.match(/backup script failed|rsync complete backup for hostname.* failed/i))
	{
        	a.customer = 'OA_Backup';
	}
	else if (a.node.match(/[fd]cr-v-.*live01|mulemmc/i))
	{       
        	a.customer = 'C4';
	}
	else if (a.node.match(/invoice-01|scruttock|psap.*|[zs][lw]pip.*|[zu][lw]piat.*|z[lw]piqa.*/i))
	{       
        	a.customer = 'Picsolve';
	}

        else if ( a.node.match(/gm7v|gm10v|gm11v|gm12v|gm13v|gm14v|gm15v|gm6v|gm9v|gm20v|gm31|gm32|gm33|gm23|gm22|gm2v|gm65/i))
        {
                a.customer = 'GoldMoneyTest';
                a.owner = 'GoldMoneyTest';
		a.severity = 3;
		a.acknowledged = 1;
	}

        else if ( a.node.match(/gm0v|cms3preprod.*|cms3ppdb|gsppapp.*|gsppdb.*/i))
        {
                a.customer = 'GoldMoneyPre-Prod';
		a.acknowledged = 1;
	}

        else if ( a.node.match(/gm89|gm21|cms3prod.*|cms3db.*|gm1v|gm71|gm26|gm27|gm-mta.*|gm16v|gm100.*|gm40|gm87|gm88|gm90|gm91|gm42|gm17|gm68|gm69|gm28|gm-infra.*|(www|secure).goldmoney.com|gmnfs/i))
        {
                a.customer = 'GoldMoneyProd';
	}

	else if (a.node.match(/lcqc.*|cqc-esb|imsuexp|cqc.org.uk/i))
	{       
        	a.customer = 'CQC';
	}

	else if (a.node.match(/zlcsc/i))
	{       
        	a.customer = 'CSC';
	}

	else if (a.node.match(/donor2|dct-sr-solardb|dct2-sr-solardb/i))
	{       
        	a.customer = 'AnthonyNolan';
	}

	else if (a.node.match(/oasbs|blsbs|blsbs|hlsbs|hlss|lftpserver|oaxgs20|sbs-scan|blsid|sbs.nhs.uk|app-dev1|gos-test3|owls-pilot/i))
	{       
        	a.customer = 'Steria';
	}

	else if (a.node.match(/cmapp|cmdb|cmproxy|_bridge/i))
	{       
        	a.customer = 'RoyalC';
	}

	/* else if (a.node.match(/hlsnpv01/))
	* {
        * 	a.customer = 'Security';
	* }
	*/
	



	/*
	 * we set the owner so that any monitoring scripts that check the db
	 * for an owner don't select alerts that are being automatically
	 * cleared
	 */
	if (a.severity == 0)
	{
	  a.owner = "system";
	}
	/*
	 * It is mandatory to set the identifier field. So do so
	 * here just before we return.
	 */
	a.identifier = 
		a.node + ':' +
		a.severity + ':' +
		a.summary
		;
};
