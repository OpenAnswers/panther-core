/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging 
var logging = require('oa-logging')('oa:event:monitors')
var logger = logging.logger
var debug = logging.debug

var inspect = require('util').inspect
var async   = require('async')
var util    = require('util')
var fs      = require('fs')
var events  = require('events')
var os      = require('os')
var path    = require('path')
var _       = require('lodash')
var Promise = require('bluebird')
var Errors  = require('oa-errors')

var yaml    = require('js-yaml')
var rules   = require('oa-event-rules')
var EventRules = rules.EventRules
var Event      = rules.Event

var nconf   = require('nconf')

var OAmonHome = require( './OAmonHome' ).OAmonHome
var oamonhome = new OAmonHome()

var DEFAULT_MONITOR_HEARTBEAT_PERIOD_SECONDS = 60;
var MINIMUM_MONITOR_HEARTBEAT_PERIOD_SECONDS = 1;
var DEFAULT_LOG_LEVEL = "info";
var DEFAULT_SERVER = "http://localhost:4003";

function OaMon() {
  events.EventEmitter.call(this);
  this.agent = undefined; // specific of this agent
  this.config_file = undefined;
  this.state = require( './state' );
};
util.inherits(OaMon, events.EventEmitter);

OaMon.prototype.start = function( oamon_cb ) 
{
  var self = this;

  async.series({

    // stage one
    nconf:  function( cb ){ self.setupNconf( cb ) },
    three:  function( cb ){ self.connectToServer( cb ) },
    four:   function( cb ){ self.registerSignalHandlers( cb ) },
    five:   function( cb ){ self.loadAgent( cb ) },
    six:    function( cb ){ self.loadRules( cb ) },
    sevent: function( cb ){ self.readyAlerts( cb ) },
    eight:  function( cb ){ self.startHeartbeat( cb ) },
    nine:   function( cb ){ self.startAgent( cb ) },
    hlisten: function( cb ){ self.httpListen( cb )},
    slisten: function( cb ){ self.socketListen( cb )}
  },
    function( err, results )
    {
      logger.debug( "stages completed - checking for errors" );
      if( err )
      {
        logger.error( err );
        if( self.monitor != undefined )
        {
          self.monitor.sendAlert( { summary: err, node: 'local', priority: 4, tag: 'PantherAgent', identifier: 'local:4:'+err } );
        }
        process.exit( 1 );
      }
      else
      {
        debug( 'results', results );
        oamon_cb( null );
      }
    });
};

OaMon.prototype.setupNconf = function( callback )
{
  /*
   * purpose here is to parse any command line options and the config file
   * if we are run with --configfile, load values from there, otherwise
   * look for a default config file
   * 
   * setup logging based upon the config settings
   * check the required core fields are defined
   */
  var self = this;
  var monitor_name = undefined;

  nconf.env().argv();
	
  /*
   * monitor_name is used to deduce the default filename for
   * the configuration file and the monitors rules file
   * at may come from a shell envrionment variable or as 
   * a command line argument
   */
  monitor_name = nconf.get( 'OAMON_NAME' ) || nconf.get( 'name' );
  if( monitor_name == undefined )
  {
    console.error( "No agent name has been defined" );
    process.exit(2);
  }

  /*
   * the shell wrapper script under monitors/bin
   * should setup the following two envvars
   */

  // work on Windows so use path.join()
  var default_config_file = path.join( 
      oamonhome.getMonitorEtcDir(), monitor_name + '.ini' );

  var config_file = nconf.get( 'configfile' ) || default_config_file;

  if( path.extname( config_file ) == '.ini' )
  {
    nconf.use( 'file', { format: nconf.formats.ini, file: config_file } );
  }
  else
    nconf.use( 'file', { file: config_file } );

  nconf.defaults({
    oneshot:    false,
    loglevel:   DEFAULT_LOG_LEVEL,
    logfile:    undefined,
    rawlog:     undefined,
    agent: {
      type:     undefined,
      rules:    undefined,
      server:   DEFAULT_SERVER
    }
  });

 
  logger.set_level( nconf.get('loglevel') )

  if( nconf.get( 'version' ) != undefined )
  {
    console.log( 'API: version 0.01' );
    process.exit( 0 );
  }
  else
  {
    if( ! nconf.get( 'agent:server' ) ) {
      callback( new Error('No server defined in agent.server') );
    }
    else if( ! nconf.get( 'agent:type' ) ){
      callback( new Error("No agent type defined") );
    }
    else if( ! nconf.get( 'agent:rules' ) ){
      callback( new Error("No rules file provided for agent") );
    }

    // Setup the path to the rules, use absolute path if given
    // or relative to monitors/etc otherwise

    if( nconf.get( 'agent:rules' ).charAt( 0 ) == '/' )
      self.agent_rules_file = nconf.get( 'agent:rules' );
    else
      self.agent_rules_file = path.join( oamonhome.getMonitorEtcDir(), nconf.get( 'agent:rules' ) );

    callback( null );
  }
};

/*
  if( opts.get( 'rawlog' ) )
  {
    debug( "Using RawLog: " + opts.get( 'rawlog' ) );
    var RawLog = require( './rawlog' );

    this.rawlog = new RawLog( { filename: opts.get( 'rawlog' ) }, function( err )
    {
      if( err )
      {
        logger.fatal( 'unable to start rawlogging' );
        process.exit( 1 );
      }
      else debug( "RawLog created" ); 
    });
    debug( "rawlog = " + inspect( self.rawlog ) );
  }

*/



OaMon.prototype.connectToServer = function( callback )
{
  var self = this;

  this.state.init({ node: os.hostname(), agent_type: nconf.get( 'agent:type' ) })

  var agents_server = nconf.get( 'agent:server' );

  logger.info( "Event monitors version: " + oamonhome.getVersion() );
  logger.debug( 'connecting to server: ' + agents_server );

  var MonitorClient = require( './monitor_client' ).MonitorClient;
  var monitor_args = { endpoint : nconf.get( 'agent:server' ) };
  if( nconf.get( 'agent:buffering' ) )
    monitor_args['buffering'] = nconf.get( 'agent:buffering' ) * 1000;

  self.monitor = new MonitorClient( monitor_args );

  self.monitor.start( function( err )
  {
    if( err ){
      logger.error( "Error starting MonitorClient" );
      logger.error( err );
      callback( err );
    }
    logger.info( "MonitorClient started" );

    if( nconf.get( 'oneshot' ) == false ) 
      self.monitor.sendAlert( self.state.established() );

    logger.info( "Monitor is connected to server" );
    callback( null );
  });

  /*
   * call the callback to signal we have started once a connection has been established
   */

};

OaMon.prototype.registerSignalHandlers = function( callback )
{
  var self = this;

  logger.debug( "Registering signal handlers" );

  process.on( 'SIGINT', function()
  {
    logger.warn( "Shutting down on signal" );
    self.monitor.sendAlert( self.state.stop() );

    self.emit( 'shutdown' );
    setTimeout( function(){ process.exit( 0 );}, 2000 );
  });

  process.on( 'SIGUSR1', function()
  {
    logger.info( "Re-reading rules files" )
    if ( self.agent_rules_file.match(/\.ya?ml/) ) {
      self.loadYamlRules( callback )
      self.monitor.sendAlert( self.state.rules_reloaded() )
      logger.info( "rules reloaded" )
    } else {
      logger.warn( "Can't reload a js rules file without some chicanery")
    }
    
  });

  callback( null );
};


OaMon.prototype.httpListen = function( callback )
{
  var self = this

  if (!self.agent.getHttpport){
    logger.warn("No http port setup on this agent")
    return callback()
  }

  var express = require('express')
  var bodyParser = require('body-parser')
  var app = express()
  app.use( bodyParser.json() )

  var incoming_message = function(message){
    return new Promise(function(resolve, reject){
      if (!message) reject( new Errors.HttpError400("message missing") )

      var str_utf8 = (new Buffer(message, 'base64')).toString('utf8', 0)

      self.agent.parse( str_utf8, function(err, message){
        if(err) reject( err )
        
        self.agent.getEventCB()( message, null, null, function( err, res ){
          if(err) reject( err )
          
          logger.info("successful http request", message.summary)  
          resolve("queued")
        })
      })
    })
  }

  app.post('/api/event-from/syslog', function( req, res ){
    incoming_message( req.body.message )
    .then( function(result){
      res.json({message: result})
    })
    .catch( Errors.HttpError400, function(error){
      res.status(400).json({ error: error.toString })
    })
    .catch( function(error){
      res.status(500).json({ error: error.toString })
    })
  })

  app.listen( self.agent.getHttpport() )
  logger.info( 'HTTP listening on [%s]', self.agent.getHttpport() )

}

OaMon.prototype.socketListen = function( callback )
{
  var self = this

  if (!self.agent.getWsport){
    logger.warn("No socket port setup on this agent")
    return callback()
  }

  var Server = require('socket.io')
  var io = new Server(self.agent.getWsport(), {
    pingTimeout: 25000,
    pingInterval: 10000,
    maxHttpBufferSize: 1000000, // 1MB
    transports: ['websocket']
  })
  logger.info('Socket.io listening on ['+self.agent.getWsport()+']')

  io.on('connection', function(socket){
    logger.info('socket connection from', socket.conn.remoteAddress, socket.id )
    socket.on('raw_event',  function( data, cb, qcb ){
      debug( 'Incoming socket event', data );
      logger.debug( 'Incoming socket event', _.keys(data) )
      //this.monitor.sendAlert( 'Started socket listener' )
      self.agent.getEventCB()( data, cb, qcb )
    })
    socket.on('disconnect', function(error){
      logger.warn('Client disconnected',error)
    })
  })

  io.on('close', function( info, obj ){ 
    logger.info( 'socket closed',info)
  })

  io.on('error', function( error ){
    logger.error( 'socket error', error )
  })
//  io.on('message',  function( data ){} )
//  io.on('flush',    function( buff ){} )
//  io.on('drain',    function(){} )
//  io.on('packet',   function( type, data ){} )
//  io.on('packetCreate',function( type, data ){} )
}


OaMon.prototype.loadAgent = function( callback )
{
  var self = this;

  /*
   * load up the specific agent
   */
  var agent_file_path = path.join( oamonhome.getMonitorLibDir(), nconf.get( 'agent:type' ) );
  debug( "Creating agent from:", agent_file_path );
  try
  {
    logger.info( "Loading agent code...." )
    var agent_include = require( agent_file_path )
    if( agent_include.Agent == undefined )
      throw new Error( "Missing Agent export in : [" + agent_file_path + "]" );
    self.Agent = agent_include.Agent;
    logger.info( "Agents supported props[]", self.Agent.getProperties(), '')
  }
  catch( err ){
    logger.error( "Agent load failed", err, err.stack )
    callback( err )
  }

  callback( null );
};


OaMon.prototype.loadRules = function( callback ){
  var self = this
  logger.debug( "Processing rules file: " + self.agent_rules_file )

  if( fs.statSync( self.agent_rules_file ) === 'undefined' )
    return callback( 'Unable to find the rules file: ' + self.agent_rules_file );

  // Rules convert a raw incoming events into a structured event
  // to add to the database
  if ( self.agent_rules_file.match(/\.ya?ml/) ) {
    self.loadYamlRules()
  } else {
    self.loadJsRules()
  }
  logger.debug( "rules loaded" )
  callback( null, "rules loaded" )
}

OaMon.prototype.loadYamlRules = function(){
  this.agent_rules = new EventRules({ path: this.agent_rules_file, agent: true })
}

// Please note that a `require` is cached. You have to do some cache busting 
// skull duggery for this to run a second time
OaMon.prototype.loadJsRules = function(){
  this.agent_rules = require( this.agent_rules_file )
}

OaMon.prototype.readyAlerts = function( callback )
{
  var self = this;
  // Register an event handler for when a new alert arrives, call the rules() 
  // method in the rules file and pass it the raw event data
  this.on( 'newalert', function( obj, cb, qcb, lcb )
  {
    /*
     * create an empty object to populate with the events fields
     */
    var new_event = new Event

    var e = {
      agent: nconf.get( 'agent:type' )
    }

    // process raw event data via rules file
    logger.debug( "Alert fields", obj, '' )
    self.agent_rules.rules( e, obj );
    logger.debug( "Event fields", e, '' )


    // check any conditions which will discard the event
    if( e.severity < 0 )
    {
      logger.info( "Discarding alert from rules file with identifier [" + e._pre_identifier || e.identifier || 'unknown' );
      // Store this somewhere, somehow. 
      // Emit via ZMQ to the webserver for inspection?
      if (lcb) lcb(null, { status: 'discarded', message: 'Event discarded' })
      return;
    }

    if( typeof e.identifier === 'null' || typeof e.identifier === 'undefined' ){
      logger.error( "Dropping Event: identifier wasn't set in event", e, '' )
      // Store this somewhere, somehow. 
      // Emit via socketio to the webserver for inspection?
      if (lcb) lcb(null, { status: 'discarded', message: 'Event missing indentifier' })
      return;
    }


    // Do these in the rule processing somehow
    if( typeof e.identifier !== 'string' ){
      logger.warn( "identifier wasn't a string, now is [" + e.identifier + ']');
      e.identifier = e.identifier.toString();
    }

    // Do these in the rule processing somehow
    if( e.identifier.length > 1024 ){
      logger.warn( "identifier greater than 1024 chars, truncating " + e.identifier.substring(0,48) + "...");
      e.identifier = e.identifier.substring(0,1012);
      logger.debug( "[" + e.identifier  + ']');
    }

    /*
     * capture raw event information
     */
    if( self.rawlog )
    {
      debug( "Storing raw event information for identifier", e.identifier );
      var rl = { timestamp: tnow, identifier: e.identifier, rawevent: obj };
      self.rawlog.log( inspect( rl ) );
    }
    //else debug( "RawLog capture disabled" );

    if( nconf.get( 'oneshot' ) )
      self.monitor.sendOneAlert( e, cb, qcb );
    else
      self.monitor.sendAlert( e, cb, qcb );

    if (qcb) qcb( null, { status: 'queued' })
  })

  callback( null );
};

OaMon.prototype.startHeartbeat = function( callback )
{
  var self = this;
  this.emit( 'heartbeating' );

  var heartbeat = function()
  {
    logger.debug( 'sending heartbeat' );
    self.emit( 'heartbeat' );
    self.monitor.sendAlert( self.state.amalive() );
  }

  /*
   * start the heartbeating from the monitor
   */
  if (nconf.get("oneshot") == false && nconf.get("agent:heartbeating") >= MINIMUM_MONITOR_HEARTBEAT_PERIOD_SECONDS) {
    var interval = nconf.get("agent:heartbeating") * 1000;
    logger.info("Agent will heartbeat every " + interval + "ms");
    this.heartbeat_interval = setInterval(heartbeat, interval);
  } else {
    logger.warn("heartbeating is disabled");
  }
  callback(null);
};
      
OaMon.prototype.startAgent = function( callback )
{
  var self = this;
  /*
   * send an initial "i'm alive message"
   */
  if( nconf.get( 'oneshot' ) == false )
    this.monitor.sendAlert( self.state.start() );

  /*
   * agent will now get started, giving it a function to use once an alert happens
   */
  logger.debug( "Starting agent" );
  var f_newalert = function( obj, cb, qcb, lcb ){
    self.emit( 'newalert', obj, cb, qcb, lcb )
  };

  debug( "Agent:", self.Agent );

  /*
   * construct the props for the agent, based upon what has been allowed
   * via the Agent.getProperties 
   * anything else specified in the props[] section of the ini file is ignored
   */

  var props = {};
  self.Agent.getProperties().forEach( function( prop )
  {
    props[prop] = nconf.get( 'props:' + prop );
  });

  logger.info( "Properties",props,'');

  /*
   * startup the actual agent and give it the function to execute when it gets 
   * a new alert
   */


  var agent = new self.Agent( { props: props, eventCB: f_newalert } );
  debug( "agent", agent );
  self.agent = agent;
  logger.info( 'Starting agent');
  self.agent.start( callback );
};

module.exports = OaMon;

