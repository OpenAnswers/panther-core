/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */


// Logging
var logging = require('oa-logging')('oa:event:monitors:sitescope:groups')
var logger = logging.logger
var debug = logging.debug

var async = require( 'async' );
var fs = require( 'fs' );
var inspect = require( 'util' ).inspect;
var path = require( 'path' );

var Class = require( 'joose' ).Class;
var Treelib = require('treelib');
var WatchTree = require('fl-watch-tree');

var DEFAULT_METAGROUP_DESCRIPTION = "_missing_description_";
var DEFAULT_METAGROUP_PARENT = "_missing_parent_";

var SiteScopeBaseClass = exports.SiteScopeBaseClass = Class({

  has: {
    id:     { is: 'ro', required: true },
    name:   { is: 'ro', required: true } 
  }
});

var ClassSubGroup = exports.ClassSubGroup = Class({
  isa: SiteScopeBaseClass,
  has: {
    group:  { is: 'ro', required: true }
  }
});

var ClassUrlMonitor = exports.ClassUrlMonitor = Class({
  isa: SiteScopeBaseClass,
  has: {
    alertCondition: { is: 'ro' },
    url:            { is: 'ro' },
    frequency:      { is: 'ro' }
  }
});

var ClassUrlContentMonitor = exports.ClassUrlContentMonitor = Class({
  isa: ClassUrlMonitor
});


var ClassScriptMonitor = exports.ClassScriptMonitor = Class ({
  isa: SiteScopeBaseClass,
  has: {
    expression:     { is: 'ro' },
    parameters:     { is: 'ro' }
  }
});



var SiteScopeGroupsDirectory = exports.SiteScopeGroupsDirectory = Class({

  /*
   * my: {} is class static attributes and methods, 
   * think of it as the Singleton
   */
  has: { 
    groupsDirectory:  { is: 'ro', required: true },
    groups:           Joose.I.Object
  },
  methods: {
    scan_directory: function()
    {
      
    },
    watch_directory: function( completed_cb )
    {
      var self = this;
      watcher = WatchTree.watchTree(self.getGroupsDirectory() , { 'sample-rate': 5, match: /.*\.mg$/ });

      /*
       * first of all, collect the filenames
       */

      var files_to_process = new Array();

      watcher.on( 'filePreexisted', function( path )
      {
        logger.info( 'found file: ' + path );
        files_to_process.push( path );
      });

      watcher.on( 'allPreexistingFilesReported', function( )
      {
        /*
         * now go over the list of collected file names and
         * load/parse each one in turn
         */
        var f_load_group = function( path, cb )
        {
          var group = new SiteScopeGroup( { path: path } );
          group.parseFile( function( err ){
            logger.debug( "ParseFile completed", err, group, '' )
            self.groups[ group.getFileName() ] = group;
            cb( null );
          });
        };

        async.forEach( files_to_process, f_load_group, function( err )
        {
          /*
           * all files should be loaded by this point
           */
          logger.debug( "post processing MetaGroup file(s)" );
          for( var group_name in self.groups )
          {
            /*
             * construct the SiteScope group hierarchy
             */
            var group = self.groups[ group_name ];
            group.setGroupPath( self.name_to_path( group_name ) );
          }
          debug( "SELF", self )
          completed_cb( err );
        });

      });
    },
    name_to_path: function( name )
    {
      debug( "name [%s] this.groups:", name, this.groups, '');

      if( this.groups[name] == undefined )
      {
        logger.error( "Missing a referenced parent named: " + name );
        return;
      }

      var parent_name = this.groups[name].getParent();

      if( parent_name == undefined )
      {
        return "/" + name;
      }
      else
      {
        var pathed_name = this.name_to_path( parent_name ) || "";
        debug( "Pathed name", pathed_name )
        return pathed_name + "/" + name;
      }
    }
  }
});

/*
 * SiteScopeGroup
 * represents a thing.mg file in the SiteScope groups directory
 */
var SiteScopeGroup = exports.SiteScopeGroup = Class({

  has: {
    description:  { is: 'rw' },
    "parent":     { is: 'rw' },
    path:         { is: 'ro', required: true },
    name:         { is: 'rw' },
    fileName:     { is: 'rw' },
    groupPath:    { is: 'rw' },
    classes:      Joose.I.Object
  },
  after: {
    initialize: function( props )
    {
      logger.debug( 'SSG INIT', props, '' )
      /*
       * set name to be the files name without the .mg suffix
       */
      this.setFileName( path.basename( props.path, '.mg' ) );
      //this.parseFile();
    }
  },
  methods: {
    getClass: function( id )
    {
      return this.classes[id] || {};
    },
    parseFile: function( completed_cb )
    {
      var self = this;

      logger.debug( "parsing file: " + self.getPath() );
      fs.readFile( self.getPath(), function( err, data )
      {
        if( err )
        {
          logger.error( err );
        }
        else
        {
          var split_lines = data.toString( 'utf-8' ).split( '\n' );
          var hash_counter = 0;
          var header = {};
          var clas = new Object();
          var the_classes = new Array();

          for( var position in split_lines )
          {
            var line = split_lines[position];
            logger.debug( "Processing: " + line );
            /*
             * blocks after the header begin with a '#'
             * last line in file (EOF) will be blank
             */
            if( line.match( /^#/ ) || ( line.length == 0 ) )
            {
              hash_counter++;
              logger.debug( "hash counter: " + hash_counter );

              the_classes.push( clas );
              /*
               * clear the temporary clas for the next itteration
               */
              clas = {};
            }
            else
            {
              debug( "MATCHING link", line )
              var matches = line.match( /^_([a-zA-Z0-9]+)=(.*)$/ );
              if( matches )
              {
                // Strip off the leading underscore from the start of the key

                //var key = matches[1].replace( /^_/, '' );
                var key = matches[1];
                clas[key] = matches[2];
              }
              else
              {
                logger.warn( "Failed match in [%s] line: [%s]", self.getPath(), line );
              }
            }
          }
          // handle the last class in the file
          //the_classes.push( clas );

          /*
           * index zero in the array is the header
           * "pop" this from the front of the array using splice
           */

          var header = the_classes.splice( 0, 1 );
          // the_classes now contains everything except the first entry

          var description = DEFAULT_METAGROUP_DESCRIPTION;
          var the_parent = DEFAULT_METAGROUP_PARENT;

          if( header && header[0] )
          {
            description = header[0].description;
            the_parent = header[0]["parent"];
          }
          self.setDescription( description );
          self.setParent( the_parent );


    
          debug( "var header", header )
          debug( "var the_classes", the_classes )

          the_classes.forEach( function( item )
          {
            switch( item["class"] )
            {
              case "SubGroup":
                self.classes[ item.id ] = new ClassSubGroup( item );
                break;
              case "URLMonitor":
                self.classes[ item.id ] = new ClassUrlMonitor( item );
                break;
              case "URLContentMonitor":
                self.classes[ item.id ] = new ClassUrlContentMonitor( item );
                break;
              case "ScriptMonitor":
                self.classes[ item.id ] = new ClassScriptMonitor( item );
                break;
              default:
                logger.debug( "Unhandled Group class for", item, '' );
            }
          });
          debug( "var self", self )
          completed_cb( null );
        }
      });
    }
  }

});

/*
var sgd = new SiteScopeGroupsDirectory( { groupsDirectory: '/tmp/l' } );
sgd.watch_directory( function( err )
{

});

*/

