 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

Preferences = require( __dirname + '/../models/preference');
var inspect = require( 'util' ).inspect;
var bus = require( '../lib/ipcbus' ).internal_bus;

module.exports = {

  create: function( req, res, next )
  {
    var q = { username: req.session.user };
    var set_with = { $set: { 
      username: req.session.user, 
      delta_interval: req.body.delta_interval,
      chart_interval: req.body.chart_interval } };
    Preferences.update( q, set_with, { upsert: true }, function( err )
    {
      bus.emit( 'Preferences.' + req.session.user, { 
        delta_interval: req.body.delta_interval,
        chart_interval: req.body.chart_interval } );

      res.send( { success: !err } );
    });
  },
  index: function( req, res, next )
  {
    Preferences.findOne( { username: req.session.user }, function( err, result )
    {
      if( err ) return res.send( { success: false } );
      var response = { success: true };
      if( result == null )
      {
        response.delta_interval = 23;
        response.chart_interval = 23;
      }
      else
      {
        response.delta_interval = result.delta_interval;
        response.chart_interval = result.chart_interval;
      }

      res.send( { success: true, data: response } );
    });
  }

};
