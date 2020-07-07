 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

// Logging 
var logging = require('oa-logging')('oa:event:server:controllers:extconsole')
var logger = logging.logger
var debug = logging.debug

async = require( 'async' );
var inspect = require( 'util' ).inspect;

module.exports = {
  secure: true, 
  index: function(req, res)
  {
    logger.debug( "Called console.index" );

    async.parallel( {
      fetch_users: function( cb )
      {
        Users.find( {}, { login:1 }, cb );
      },
      fetch_external_classes: function( cb )
      {
        ExternalClasses.find( {}, { class_name: 1, trigger_name: 1 }, cb );
      },
      fetch_severities: function( cb )
      {
        Severity.getLabelLookup( function( err, sevs )
        {
          if( err ) return cb( err );
          var sev_obj = new Object();
          sevs.forEach( function( sev )
          {
            sev_obj[sev.value] = { label: sev.label };
          });

          cb( null, sev_obj );
        });
      }
    },
    function( err, results )
    {
      if( err )
      {
        logger.error( "console failed: " + err );
        res.render( 'console', { locals: {} } );
      }
      else
      {
        var users_list = results.fetch_users.map( function( user )
        {
          return( user.login );
        });

        /*
         * set up the locals that can be accessed directory from within
         * the ejs view code
         */

        var locals = {};
        // an array of usernames for such things as assigning ownership
        locals.users = users_list;

        /* 
         * external_classes allow us to run scripts on the backend
         * and have the alert updated with the results of that script
         * which then propopgates back to the console
         */
        locals.external_classes = results.fetch_external_classes;

        locals.severities = results.fetch_severities;

        debug( "CONSOLE locals", locals )
        res.render( 'extconsole', { locals: locals, layout: 'layouts/ext' } );
      }
    });
  }
};
