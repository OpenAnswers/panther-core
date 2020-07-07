 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

var Severity = require( __dirname + '/../lib/severity' ).Model;

var util = require('util');
var inspect = util.inspect;
var ObjectId = require('mongoose').Types.ObjectId;
var bus = require( '../lib/ipcbus' ).internal_bus;

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
    logger.warn( 'attempt to access index on details' );
    Severity.getUsers( req.session.user, function( err, sevs ) 
    {
      if( err ) return res.send( { success: false } );
      
      res.send( { success: true, data: sevs.map( function( sev )
      { 
        return { label: sev.label, value: sev.value, foreground: sev.foreground, background: sev.background }; 
      } ) } );

    });
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

      res.send( { success: true, data: lert.toDetails().timestamps } );
    });
  },

  update: function( req, res, next ) {
    var severity = req.params.id;
    var query = { value: severity, system: false, owner: req.session.user };
    var setwith = {
      $set: { 
        value: req.body.value, 
        label: req.body.label, 
        foreground: req.body.foreground, 
        background: req.body.background,
        owner: req.session.user
      } };
    Severity.update( query, setwith, { upsert: true }, function( err ) 
    {
      logger.debug( 'updated user severity ' + err );
      bus.emit( 'Severity.' + req.session.user );
      res.send( { success: !err } );
    });
  }

};
