/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */


// Logging
var logging = require('oa-logging')('oa:event:monitors:imap')
var logger = logging.logger
var debug = logging.debug

var ImapConnection = require('imap').ImapConnection;
var EventEmitter = require('events').EventEmitter;
var async = require( 'async' );
var inspect = require( 'util' ).inspect;
var path = require("path");
var fs = require("fs");

var Class = require( 'joose' ).Class;
var AgentRole = require( '../utils/agent_role' ).Role;

var DEFAULT_POLLING_INTERVAL = 10 * 1000;
var DEFAULT_UID_FILE = "/tmp/imap.uid";

var ImapAgent = exports.Agent = Class(
{
  my: {
    has: {
      properties: { is: 'ro', init: [ "username", "password", "hostname", "folder", "interval", "uid_file" ] }
    }
  },

  does: [ AgentRole ],

  has: {
    imapConnection:   { is: 'rw' },
    topUid:           { is: 'rw', init: 1 },
    uidFile:          { is: 'rw' },
    pollingInterval:  { is: 'rw' },
    timer:            { is: 'rw' }
  },

  methods: {
    start: function( started_cb )
    {
      var self = this;
      var imap = new ImapConnection({
        username:   self.getProps().username,
        password:   self.getProps().password,
        host:       self.getProps().hostname } );

      imap.on( 'alert', function( err )
      {
        logger.error( 'IMAP alerted ' + err );
      });
      imap.on( 'error', function( err )
      {
        logger.error( 'IMAP raised ' + err );
      });

      
      self.setImapConnection( imap );
      self.setPollingInterval( self.getProps().interval || DEFAULT_POLLING_INTERVAL );
      self.setUidFile( self.getProps().uid_file || DEFAULT_UID_FILE );

      self.initiate( function( err )
      {
        if( err )
          logger.error( err );
        else
        {
          self.begin_polling( self.getTopUid(), self );
        }

        started_cb( err );
      });
    },
    initiate: function( initiated_cb )
    {
      var self = this;
      /*
       * in order:
       * 1: connect to IMAP server
       * 2: open folder
       * 3: find last read UID
       */

      async.series({
        connect: function( callback )
        {
          self.getImapConnection().connect( function( err )
          {
            if( err )
              logger.fatal( "IMAP connection failed: " + err + "\n" );
            callback( err );
          });
        },
        open: function( callback )
        {
          self.getImapConnection().openBox( self.getProps().folder, true, function( err, results )
          {
            callback( err, results );
          });
        },
        getlastuid: function( getuid_callback )
        {
          async.waterfall([
            function( callback )
            {
              var msg_base = "UID file [" + self.getUidFile() + "]";
              path.exists( self.getUidFile(), function( exists )
              {
                if( exists )
                {
                  logger.debug( msg_base + " exists" );
                  callback( null );
                }
                else
                  callback( msg_base + " missing" );
              });
            },
            function( callback )
            {
              logger.debug( "Reading UID file" );
              fs.readFile( self.getUidFile(), function( err, data )
              {
                logger.debug( "UID file read", err, data, '' );
                callback( err, data );
              });
            },
            function( contents, callback )
            {
              var num = undefined;
              if( num = parseInt( contents ) )
              {
                /*
                 * this will be the last UID that the system handled,
                 * we'll want to start reading from the next one, 
                 */
                self.setTopUid( num );
                callback( null );
              }
              else
                callback( "Failed to parse an integer from " + self.getUidFile() );
            }
          ],
          function( err )
          {
            /*
             * if there was an error, then default to using a starting UID of 1
             * otherwise take the last read UID from disk and increment by one 
             * which'll be the next UID we are interested in
             */
            if( err )
            {
              logger.info( "Failed to read UID file " + err + " - will be starting with UID 1" );
              self.setTopUid( 1 );
              getuid_callback( null, self.getTopUid() );
            }
            else
            {
              getuid_callback( null, self.getTopUid() );
            }
          });

        }
      }, //async.series
      function( err, results )
      {
        if( err )
        {
          logger.error( "Failed to initiate IMAP probe" );
          initiated_cb( "Failed to start IMAP probe" );
        }
        else
        {
          debug( "intitiate got back", results );
          logger.info( "IMAP probe initiated" );
          //self.events.emit( 'imap.probe.initiated' );
          initiated_cb( null );
        }
      });
    }, //initiate

    write_uid: function()
    {
      var self = this;
      fs.writeFile( self.getUidFile(), "" + self.getTopUid(), function( err )
      {
        if( err )
          logger.error( "Failed to write IMAP uid (" + self.getTopUid() + ") to file: " + self.getUidFile() );
        else
          logger.debug( "Written IMAP uid (" + self.getTopUid() + ")" );
            
      });
    },
    wait_and_poll_again: function()
    {
      var self = this;
      self.write_uid();
      self.setTimer( setTimeout( self.begin_polling, self.getPollingInterval(), self.getTopUid() + 1, self ) );
    },
    begin_polling: function( starting_uid, self )
    {
      /*
       * maybe FIXME, passing self as an argument may cause a memory leak here
       */
      //var self = this;

      var uid_search = "" + starting_uid + ":*";
      self.getImapConnection().search( [ [ 'UID', "" + uid_search ] ], function( error, results )
      {
        if( error ) throw new Error( error );

        logger.debug( "Found " + results.length + " messages on the IMAP server" );
        debug( "last UID", results[0] )
        if( results.length > 0 && results[0] < starting_uid )
        {
          logger.info( "Finished IMAP poll" );
          self.wait_and_poll_again();
        }
        else
        {
          self.fetch( results );
        }
      });
    },
    fetch: function( uid_list )
    {
      var self = this;
      logger.debug( "Starting IMAP fetch for UID's [" + uid_list.join( ',' ) + "]" );

      async.forEachSeries( uid_list, function( uid, series_cb )
      {
        logger.info( "Fetching IMAP uid [" + uid + "]" );
        async.parallel({
          headers: function( cb )
          {
            var fetch = self.getImapConnection().fetch( uid, { request: { body:false, headers: ['from', 'to', 'subject', 'date'] } } );
            fetch.on( 'message', function( msg )
            {
              msg.on( 'end', function()
              {
                cb( null, msg.headers );
              });
            });
          },
          bodies: function( cb )
          {
            var fetch = self.getImapConnection().fetch( uid, { request: { headers: false, body: true } } );
            fetch.on( 'message', function( msg )
            {
              msg.on( 'data', function( chunk )
              {
                if( chunk == undefined )
                {
                  logger.error( "UNDEFINED CHUNK" );
                  cb( 'UNDEFINED CHUNK' );
                }
                else cb( null, chunk.toString() );
              });
            });
          }
        }, // async.parallel
        function( err, results )
        {
          if( err )
          {
            logger.error( "Failed to get UIDs: " + err );
          }
          else
          {
            var parsed_date = new Date( results.headers["date"][0] );
            self.getEventCB()({
              imap_id: uid,
              from: results.headers["from"][0],
              to: results.headers["to"][0],
              subject: results.headers["subject"][0],
              date_obj: parsed_date,
              date_raw: results.headers["date"][0],
              body: results.bodies
            });
          }
          /*
           * signal to get and fetch the next UID from the list
           */
          self.setTopUid( uid );
          series_cb( err );
        });
      }, 
      function( series_err ) {
        if( series_err )
        {
          logger.error( series_err );
        }
        else
        {
          logger.debug( 'Finished fetching ' + uid_list.length + ' IMAP messages');
          self.wait_and_poll_again();
        }
      });
    } // fetch
  } // methods

}); //Class


