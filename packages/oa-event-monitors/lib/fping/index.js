/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:fping')
var logger = logging.logger
var debug = logging.debug

var events = require('events');
var fs = require('fs');
var inspect = require('util').inspect;
var util = require('util');
var path = require('path');

var DEFAULT_FPING_PATH='/usr/bin/fping';
var DEFAULT_FILENAME='/tmp/ping.list';
var DEFAULT_INTERVAL = 5000;

var FpingMonitor = function FpingMonitor( args )
{
  var self = this;
  events.EventEmitter.call( this );

  var a = args || {};

  this.fping_path = a.fping_path || DEFAULT_FPING_PATH;
  this.filename = DEFAULT_FILENAME;
  this.hosts = {};
  this.interval = a.interval || DEFAULT_INTERVAL;

};
util.inherits(FpingMonitor, events.EventEmitter);

FpingMonitor.prototype.start = function( props, f_newalert, oamon_cb )
{
  var self = this;
  this.newalert = f_newalert;

  debug( 'props', props );
  if( props.filename != undefined )
    this.filename = props.filename;

  if( props.interval != undefined )
    this.interval = props.interval;

  this.readPingList();

  self.on( 'pinglist', self.startPinging );
  self.on( 'fping_output', self.parseLine );

  oamon_cb( null );
};


FpingMonitor.prototype.readPingList = function()
{
  var self = this;

  path.exists( self.filename, function( exists )
  {
    if( !exists )
    {
      logger.error( "Ping list does not exist at: " + self.filename );
      process.exit( 1 );
    }

    fs.readFile( self.filename, function( err, data )
    {
      if( err )
      {
        logger.error( err );
        process.exit( 1 );
      }

      var lines = data.toString( 'utf-8' ).split( "\n" );
      debug( "data lines", lines );

      var index;
      for( index in lines )
      {
        var hostname = lines[index];
        self.hosts[hostname] = { counter: 0 };
      }

      debug( "configured hosts", self.hosts );

      self.emit( 'pinglist', lines );
    });

  });

};

FpingMonitor.prototype.startPinging = function( pinglist )
{
  var self = this;
  self.pinglist = pinglist;
  var spawn = require( 'child_process' ).spawn;

  var fping_args = [ '-l', '-i', self.interval ];
  var args = fping_args.concat( pinglist );

  var cmd = spawn( self.fping_path, args );


  cmd.stdout.on( 'data', function( data )
  {
    var line = "" + data.toString( 'utf-8' ).split( "\n" );
    logger.debug( "stdout:", line );
    self.emit( 'fping_output', line );

  });

  cmd.stderr.on( 'data', function( data )
  {
    var line = "" + data.toString( 'utf-8' ).split( "\n" );
    logger.debug( "stderr:", line );
    self.emit( 'fping_output', line );

  });


};

FpingMonitor.prototype.parseLine = function( line )
{
  var self = this;
  var matches;
  if( matches = line.match( /(\w+)[\ ]+:\ \[(\d+)\], (\d+)\ bytes, (\d+)\.(\d+)\ ms (.*)/ ) )
  {
    var hostname = matches[1];
    var counter = matches[2];
    var bytes = matches[3];
    var seconds = matches[4];
    var mili_seconds = matches[5];

    var trip_time = seconds * 1000;
    trip_time += mili_seconds;

    var therest = matches[6];
    logger.debug( "Matched " + hostname );

    var ev = {};
    if( self.hosts[hostname] && self.hosts[hostname].counter != counter )
    {
      ev.missed = self.hosts[hostname].counter - counter;
    }
    self.hosts[hostname].counter = counter;

    ev.hostname = hostname;
    ev.triptime = trip_time;
    ev.state = 'alive';

    self.newalert( ev );
  }
  else if( matches = line.match( /ICMP Host Unreachable from (\S+) for ICMP Echo sent to (\S+) \((\S+)\)/ ) )
  {
    debug( "MATCHES", matches )
    var hostname = matches[2];

    var ev = {};
    ev.hostname = hostname;
    ev.host_ip = matches[3];
    ev.state = 'unreachable';

    logger.error( "host " + hostname + " unreachable" );

    self.newalert( ev );
  }
  else
  {
    logger.warn( 'unmatched: ' + line );
  }
};

agent = module.exports = new FpingMonitor();
