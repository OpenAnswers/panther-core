 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

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
        res.send( { success: false } );
        return;
      }

      var retfilters = [];
      retfilters.push( { 
        text: 'Shared', 
        id: -1, 
        iconCls: 'filter_icon', 
        chk:false, 
        hidden: false, 
        menu: {
          items: [ {
            text: 'Shared/fallback',
            iconCls: 'filter_icon'
          }] 
        } 
      });

      filters.forEach( function( filter )
      {
        logger.debug( "Found filter._id: " + filter._id );
        retfilters.push( { 
          text: filter.name, 
          id: filter._id, 
          iconCls: 'filter_icon', 
          chk: false, 
          hidden: false, 
          handler_name: 'filter_' + filter.name
        });
      });

      var retobj = new Object();
      res.header('Content-Type', 'text/plain');
      res.send( { success: true, filters: retfilters || [] } );

    });
  }

};
