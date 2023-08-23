/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:util:file_watcher');
var logger = logging.logger;
var debug = logging.debug;

var syslog = require('../lib/syslog/parser');

exports.rules = function (a, syslog_line) {
  var $sys = undefined;

  try {
    $sys = new syslog.parse(syslog_line);
    debug('sylsog line', $sys);

    a.summary = $sys.message;
    a.agent = 'IMAP:Syslog';
    a.alert_group = 'Syslog';
    a.node = $sys.hostname;

    var ident2 = 'MONTH:' + $sys.month + ':DOM:' + $sys.dom + ':TIME:' + $sys.time + $sys.message;
    var $msg_match;

    a.agent += ':' + $sys.daemon;

    switch ($sys.daemon) {
      case 'named':
        if (
          ($msg_match = $sys.message.match(/unexpected RCODE \((\w+)\) resolving (.*)\/(.*)\/(.*):(\S+) (\d+:\d+)/))
        ) {
          ident2 = $msg_match[1] + ':' + $msg_match[2] + ':' + $msg_match[5];
          switch ($msg_match[1]) {
            case 'SERVFAIL':
              a.summary = 'DNS Failure resolving: ' + $msg_match[1];
              break;
          }
        } else if (($msg_match = $sys.message.match(/^zone (\S+)\/IN: Transfer started/))) {
          a.summary = 'zone transfer starting ' + $msg_match[1];
          a.alert_key = $msg_match[1];
          ident2 = 'startzonetrans:' + $msg_match[1];
        } else if (($msg_match = $sys.message.match(/transfer of (\w+)\/IN from (.*)#\d+: (.*)/))) {
          a.summary = 'zone transfer ended ' + $msg_match[1];
          a.alert_key = $msg_match[1];
          ident2 = 'endzonetrans:' + $msg_match[1];
        } else if (($msg_match = $sys.message.match(/^FORMERR resolving (\S+)\/(\S+)\/(\S+): (\S+)#\d+/))) {
          a.summary = 'DNS error for' + $msg_match[1];
          a.alert_key = $msg_match[1];
          ident2 = 'dnserror:' + $msg_match[1];
        } else if (($msg_match = $sys.message.match(/^zone (.*)\/IN: transferred serial (\d+)/))) {
          a.summary = 'zone transferred serial ' + $msg_match[1];
          a.alert_key = $msg_match[1];
          a.type = 'down';
          ident2 = 'dnszoneserial:' + $msg_match[1];
        } else if (($msg_match = $sys.message.match(/^zone (.*)\/IN: sending notifies \(serial (\d+)\)/))) {
          a.summary = 'zone sending notifies ' + $msg_match[1];
          a.alert_key = $msg_match[1];
          a.type = 'up';
          ident2 = 'dnssendnotif:' + $msg_match[1];
        } else if (
          ($msg_match = $sys.message.match(/^transfer of (\S+)\/IN from (\S+)#\d+: failed to connect: (.*) \d+:\d+$/))
        ) {
          a.severity = 5;
          a.summary = 'transfer of ' + $msg_match[1] + ' failed ' + $msg_match[3];
          ident2 = 'transfailed:' + $msg_match[1] + ':' + $msg_match[3];
        }

        // we discard named messages for now
        a.severity = -1;

        break;

      case 'ntpd':
        if (($msg_match = $sys.message.match(/synchronized to (.*), stratum (\d+) (\d+:\d+)/))) {
          a.summary = 'NTP synchronization to ' + $msg_match[1];
          a.severity = 1;
          ident2 = 'ntpsync:' + $msg_match[1];
        }
        break;

      case 'rsyncd':
        break;

      case 'rmclomv':
      case 'rmclomv:':
        if (($msg_match = $sys.message.match(/CPU_FAN @ (\S+) has FAILED/))) {
          a.severity = 5;
          a.summary = 'CPU FAN FAILURE';
          a.alert_key = $msg_match[1];
          ident2 = 'cpu_fan:' + a.alert_key;
        }
        break;

      case 'SC Alert':
        if (($msg_match = $sys.message.match(/SYS_FAN at (\S+) has FAILED/))) {
          a.severity = 5;
          a.summary = 'CPU FAN FAILURE';
          a.alert_key = $msg_match[1];
          ident2 = 'cpu_fan:' + a.alert_key;
        }
        break;

      case 'xinetd':
        if (($msg_match = $sys.message.match(/(START|EXIT): amanda pid=(\d+) from=(\S+)/))) {
          a.agent += 'amanda';
          a.node_alias = $msg_match[3];
          a.alert_key = $msg_match[2];
          ident2 = 'amanda:' + $msg_match[1] + ':' + $msg_match[3];
          a.summary = 'Amanda ' + $msg_match[1] + ' ' + $msg_match[3];
        }
        break;

      case 'root':
        if (($msg_match = $sys.message.match(/Shorewall (\w+) (.*)/))) {
          a.alert_group = 'firewall';
          ident2 = ':' + a.agent + ':' + $msg_match[1];
          a.summary = 'Shorewall restarted';
        }

        break;

      case 'raid':
        a.alert_group = 'disk';
        a.severity = 3;
        break;

      case 'sshd':
        // assume ssh events are relativly important
        a.severity = 4;
        if (a.node == 'libadu') a.severity = -1;
        break;

      case 'FrontGateService.exe':
        a.severity = 2;
        if (($msg_match = $sys.message.match(/^INFO.*/))) {
          a.severity = -1;
        }
        break;

      case 'DtfService.exe':
        if (($msg_match = $sys.message.match(/(\w+)[\ ]+: (.*)/))) {
          switch ($msg_match[1]) {
            case 'ERROR':
              a.severity = 5;
              break;
            case 'WARN':
              a.severity = 4;
              break;
            case 'INFO':
              a.severity = 2;
              break;
            default:
              a.severity = 1;
              break;
          }
          ident2 = ':' + a.agent + ':' + a.severity;

          a.summary = $msg_match[2];
          if ($msg_match[2].match(/Failed to connect to the database server/)) {
            a.summary = 'Failed to connect to the database server';
            a.alert_group = 'Database';
            ident2 += ':DBconnection';
          } else if ($msg_match[2].match(/DBNotAvail/)) {
            a.summary = 'Database not available';
            a.alert_group = 'Database';
            ident2 += ':DBavailability';
          }
        }
        break;

      case 'HVM42':
        if (($msg_match = $sys.message.match(/Time offset set\ (.*)/))) {
          ident2 = ':time_offset';
        }
        break;

      case 'SafaricomEtuService.exe':
      case 'SdAuthService.exe':
      case 'VmsService.exe':
        if (($msg_match = $sys.message.match(/(\w+)[\ ]+:\ \[(\d+)\]\ (.*)\ (\d+):(\d+)/))) {
          a.summary = $msg_match[3];
          var $msg_tail = undefined;

          switch ($msg_match[1]) {
            case 'WARN':
              a.severity = 4;
              break;

            default:
              a.severity = 1;
              break;
          }

          if ($msg_match[3] == 'Out of pin stock') {
            a.summary = $msg_match[3];
            ident2 = ':outofpinstock';
          } else if ($msg_match[3].match(/Processing\ message\ failed:\ (\d+)/)) {
            a.summary = 'Processing message failed';
            ident2 = ':procmsgfail';
          } else if ($msg_match[3].match(/Sending\ response\ failed:\ (\d+)/)) {
            ident2 = ':sndrespfail';
          } else if (($msg_tail = $msg_match[3].match(/ExtError, (\d+)\ (.*)/))) {
            ident2 = ':exterror';
            a.summary = $msg_tail[1];
          }
        }
        break;

      // I think this is for Firewall-1 messages -vince
      case 'WebUI':
        if (($msg_match = $sys.message.match(/^(\w+): (.*)/))) {
          /*
           * username = $msg_match[1]
           * rest of message = $msg_match[2]
           */

          a.agent = 'firewall';
          a.summary = $msg_match[2];
          a.alert_key = $msg_match[1];
        }
        break;

      case 'kernel':
        /*
         * messages seems to look like:
         * audit(1316786202.087:79): dev=Lan2 prom=256 old_prom=0 auid=4294967295 ses=4294967295  14:02
         * audit(1316787693.214:83): dev=External prom=0 old_prom=256 auid=4294967295 ses=4294967295  14:27
         */
        if (($msg_match = $sys.message.match(/^audit\((\w+)\): (.*)/))) {
          var tokens = $msg_match[2].split(/\ /);
        } else if (($msg_match = $sys.message.match(/^FW-1: (.*)/))) {
          a.agent = 'firewall';
          a.summary = $msg_match[1];
        }
        // discard for now
        a.severity = -1;
        break;

      case 'shell':
        if (($msg_match = $sys.message.match(/cmd by (\w+): (.*)/))) {
          a.severity = 2;
          a.alert_key = $msg_match[1];
          a.summary = $msg_match[2];
        }
        break;

      case 'racoon':
        a.alert_group = 'VPN';
        if (($msg_match = $sys.message.match(/(\w+): racoon: (.*) (\d\d:\d\d)$/))) {
          switch ($msg_match[1]) {
            case 'ERROR':
              a.severity = 5;
              break;
            default:
              a.severity = 1;
              break;
          }
          a.summary = $msg_match[2];
          ident2 = ':racoon:' + a.summary;
        }
        break;

      case 'ipop3d':
        if (($msg_match = $sys.message.match(/Login failed/))) {
          a.severity = 3;
          a.summary = 'Login failure';
          a.alert_group = 'Auth';
          ident2 = ':login:fail';
          if (($msg_match = $sys.message.match(/user=(\w+) auth=(\w+)/))) {
            a.alert_key = $msg_match[1] + '/' + $msg_match[2];
            a.summary += ' for ' + $msg_match[1];
            ident2 += ':' + $msg_match[1];
          }
        }

        break;

      default:
        a.type = 'Unhandled syslog daemon';
        break;
    }

    if ($sys.message.match(/(: rsync | rsync: | rsync )/)) {
      if (($msg_match = $sys.message.match(/(START|EXIT): rsync/))) {
        ident2 = ':rsync:' + $msg_match[1];
        a.agent += ident2;

        var $pid;
        if (($pid = $sys.message.match(/pid=(\d+)/))) {
          a.alert_key = $sys.pid[1];
          ident2 += ':' + $sys.pid[1];
        }

        var $rc;
        if (($rc = $sys.message.match(/status=(\d+)/))) {
          if (parseInt($rc[1]) != 0) a.severity = 3;
          else a.severity = 1;
        }
      } else if ($sys.message.match(/link_stat/)) {
      } else if ($sys.message.match(/on remote machine: /)) {
        // [ID 702911 daemon.warning] rsync: on remote machine: -nX: unknown option 10:54
      } else if (($msg_match = $sys.message.match(/rsync error: (.*)/))) {
        var $mm2;
        if (($mm2 = $msg_match[1].match(/some files could not be transferred \(code \d+\) /))) {
          //[ID 702911 daemon.warning] rsync error: some files could not be transferred (code 23) at main.c(442) 10:54
          a.severity = 4;
        } else if ($msg_match[1].match(/requested action not supported/)) {
          //[ID 702911 daemon.warning] rsync error: requested action not supported (code 4) at clientserver.c(473) 10:54
        } else if ($msg_match[1].match(/error in rsync protocol data stream/)) {
          //[ID 702911 daemon.warning] rsync error: error in rsync protocol data stream (code 12) at io.c(909) 10:54
          a.severity = 4;
        } else if ($msg_match[1].match(/timeout in data send\/receive/)) {
          //[ID 702911 daemon.warning] rsync error: timeout in data send/receive (code 30) at io.c(153) 01:18
          a.severity = 3;
        } else {
          logger.warn('fixme');
        }
      } else {
        a.summary = $sys.message;
      }
    } else if (($msg_match = $sys.message.match(/(.*) on remote machine: (.*)/))) {
      a.severity = 1;
    } else if (($msg_match = $sys.message.match(/Unauthorized access attempt (.*)/))) {
      a.severity = 5;
    } else {
      logger.warn('object a', a, '');
      logger.warn('fixme 1');
    }
    a.identifier += ident2;
  } catch (err) {
    logger.error('Failed to parse a syslog message from: ' + syslog_line);
  }
};
