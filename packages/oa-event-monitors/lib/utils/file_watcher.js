/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */


// Logging
var logging = require('oa-logging')('oa:event:monitors:util:file_watcher')
var logger = logging.logger
var debug = logging.debug

var fs = require( 'fs' );
var EventEmitter = require('events').EventEmitter;

var Class = require( 'joose' ).Class;


var FileWatcher = exports.FileWatcher = Class( {

  meta : Joose.Meta.Class,
  isa : EventEmitter,

  has: {
    filePath:    { is: 'rw', required: true },
    interval:    { is: 'ro', init: 500 }
  },

  methods: {

    check_file_exists: function( )
    {
      var self = this;
      logger.info( "Checking file exists: " + self.getFilePath() );
      return fs.statSync( self.getFilePath() );
    },
    watch: function( byte_offset )
    {
      var self = this;
      var filename = self.getFilePath();

      /*
       * watch the file in question
       */
      logger.debug( "watching file... " + filename + " from offset: " + byte_offset );
      fs.watchFile( 
        self.getFilePath(), { persistent: true, interval: self.getInterval() }, function(curr, prev )
      {
        if(prev.size > curr.size)
        {
          logger.debug( "returning clear" );
          return {clear:true};
        }

        /*
         * read from the file and split into an array of items delimited by CR's
         */
        logger.debug( 'creating read stream curr.size = ' + curr.size + ', prev.size = ' + prev.size );
        var stream = fs.createReadStream(self.getFilePath(), { start: prev.size, end: curr.size });
        stream.addListener( 'data', function( lines ) 
        {
          var split_lines = lines.toString('utf-8').split("\n");
          for( var line in split_lines )
          {
            /*
             * discard any empty lines by ensuring that only lines
             * with at least one character are emitted
             */
            if( split_lines[line].length > 0 )
            {
              self.rawline( split_lines[line] );
            }
          }
          /*
           * once all lines have been read, inform via emit that its completed
           * this is useful to know when it happens as it provides a good
           * opportunity for the LogTailer to write out some progress 
           * information of where we have read() upto in the file
           * which can be used in situations where we need to restart from the 
           * the last line read
           */
          self.read_upto( curr );
        });
      });
    },

    /*
     * rawline and read_upto
     * both emit on the object, but could be overridden if inherting FileWatcher
     * as a base class
     *
     */
    rawline: function( line ) 
    {
      this.emit( 'rawline', line );
    },

    read_upto: function( stat )
    {
      this.emit( 'read_upto', stat );
    },

    _start: function( )
    {
      var self = this;
      logger.debug( "Starting LogfileMonitor" );
      if( self.check_file_exists() )
      {
        logger.debug( 'Starting watch()' );
        self.watch();
      }
    }
  }
});

/*
var test_logfile = new MonitorLogFile( { logfilePath: '/tmp/1.log' } );
test_logfile.on( 'rawline', function( ev, line )
{
  logger.debug( 'GOT LINE', arguments )
});

test_logfile._start();

*/
