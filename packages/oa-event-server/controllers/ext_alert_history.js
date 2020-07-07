 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

Filters = require( __dirname + '/../models/filter');

var util = require('util');
var inspect = util.inspect;
var ObjectId = require('mongoose').Types.ObjectId;

function get(id, fn) {
    if (users[id]) {
        fn(null, users[id]);
    } else {
        fn(new Error('User ' + id + ' does not exist'));
    }
}

function oNotAuthorised( msg )
{
  logger.debug( "f() NotAuthorised" );
  this.name = "NotAuthorised";
  Error.call( this, msg );
  Error.captureStackTrace(this, arguments.callee);
}

module.exports = {

  secure: true,

  index: function( req, res, next ) {
    logger.warn( 'attempt to access index on history' );
    res.send( { success: false } );
  },

  // /alerts/:id
  show: function(req, res, next){

    Alerts.findOne( { _id:req.params.id }, function( err, lert )
    {
      if( err )
      {
        logger.error( err );
        return res.send( { success: false } );
      }
      if( !lert ) return res.send( { success: false } );

      res.send( { success: true, data: lert.toDetails().history } );
    });
  },

};
