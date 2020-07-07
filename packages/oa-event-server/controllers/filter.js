 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

// Logging 
var logging = require('oa-logging')('oa:event:server:controllers:filter')
var logger = logging.logger
var debug = logging.debug

Filters = require( __dirname + '/../models/filter');
var inspect = require( 'util' ).inspect;


module.exports = {


  secure: true,

  index: function(req, res){
    logger.debug( "incoming filter index request" )
    var u = req.session.user;
    Filters.find({ $or: [ { user: null, system: true, name:'fallback' }, { user:u } ] }, { name:1, f:1 }, function( err, filters )
    {

      if( filters.length <= 0 )
      {
        logger.warn( "No filters found for user: " + u + " not even a fallback one" );
        res.send( { error:'ENOENT', message:'No filters available' } );
        return;
      }

      var retfilters = [];
      for( var i = 0; i < filters.length; i++ )
      {
        retfilters.push( { _id:filters[i]._id, name:filters[i].name, f:filters[i].f } );
      }

      res.send( retfilters );

    });
  },

  show: function(req, res, next){

    var filterquery = {};
    if( req.params.id != 'fallback' )
    {
      filterquery.user = req.session.user;
      filterquery.name = req.params.id;
    }
    else
    {
      filterquery.user = null;
      filterquery.system = true;
      filterquery.name = 'fallback';
    }
    debug( "filter/show()", filterquery )

    Filters.findOne( filterquery, { name:1, f:1 }, function( err, filter )
    {
      res.send( { name:filter.name, f:filter.f } );
    });
  },

  edit: function(req, res, next)
  {
    logger.debug( "filter edit request" );
  },

  create: function( req, res, next )
  {
    debug( "Creating filter: ", req.body.f )
    var f = new Filters();
    f.user = req.session.user;
    f.name = req.body.name;
//    f.f = JSON.stringify( req.body.f );
    f.f = req.body.f;

    debug( "SAVING this filter", f )
    f.save( function()
    {
      res.send( { totalCount: 1, items:  ["blah"] } );
    });

  },

  update: function(req, res, next){
    var id = req.params.id;
    logger.debug( "filter update request" );
  },

  destroy: function( req, res, next )
  {
    var filtername = req.params.id;
    var filterquery = {};
    filterquery.user = req.session.user;
    filterquery.name = filtername;

    logger.debug( "Looking for filter: " + filtername );

    Filters.findOne( filterquery,  function(err, data) {
      if( data == undefined || data == null )
      {
        logger.error( "unable to delete filter: " + filtername + " for user " + req.session.user );
        res.send( { error:'ENOENT', message:'unable to delete your filter named: ' + filtername } );
        return;
      }

      logger.debug( "removing filter: " + filtername );
      data.remove();
      res.send( { error:'OK', message:'deleted filter: ' + filtername } );

    });
  }
};
