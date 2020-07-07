 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

// Logging 
var logging = require('oa-logging')('oa:event:server:controllers:login')
var logger = logging.logger
var debug = logging.debug


var Users = require('../models/user');
var inspect = require('util').inspect;

function authenticate( name, pass, fn )
{
  Users.findOne({ login:name }, function( err, user )
  {
    logger.info( "found user " + inspect( user ) );
    if( !user )
    {
      logger.info( "no user: " + name );
      return fn(new Error('no such user') );
    } 
    else if( user.validatePassword( pass ) )
    {
      logger.info( "user: " + name + " OK");
      return fn(null, user );
    }
    else
    {
      logger.warn( "invalid password" );
      fn( new Error( 'invalid password' ));
    }
  });
}

module.exports = {
  
  secure: false, // allow login page without security checking
  index: function( req, res ){
    logger.debug( "incoming login start" );
    if( req.session.user )
    {
      req.session.success = 'Authenticated';
      res.redirect( '/extconsoles' );
    }
    else res.render('login', { layout:'simple' });
  },
  create: function( req, res, next )
  {
    authenticate( req.body.username, req.body.password, function( err, user )
    {
      if( user ){
        logger.info( 'User: ' + user + " has been authenticated" );
        req.session.user = user.login;
        req.session.group = user.group;
        req.session.is_admin = user.isAdministrator();

        /*
         * redirect the user to the console
         */
      
        res.redirect('/extconsoles');
      }
      else
      {
        res.redirect('back');
      }
    });
  },
  destroy: function( req, res, next )
  {
    logger.info( 'User: ' + req.session.user + ' logging out' );
    debug( 'Session', req.session )
    req.session.destroy();
    res.redirect( '/logins', 200 );
  }
};
