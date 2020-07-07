 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

// Logging 
var logging = require('oa-logging')('oa:event:server:controllers:alert')
var logger = logging.logger
var debug = logging.debug

Filters = require( __dirname + '/../models/filter');

var util = require('util');
var inspect = util.inspect;

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

function handleQuerySort( query )
{
  console.log( "Query Q  = " + inspect( query ) );
  for( var prop in query )
  {
    logger.debug( "PROP: " + query[prop] );
    var result = undefined;
    if( result = prop.match( /sort\(([\ \-\+]?)(\w+)\)/ ) )
    {
      logger.debug( "Query has sort in it" );
      logger.debug( "result = " + inspect( result ) );
      var ord = ( result[1] == ' ')  ? 1 : -1 ;
      var column = result[2];
      /*
       * special case for first_occurrence:
       * the value for this is taken as being the first array value
       * in the upsert_timestamps sub-document on the alert, so 
       * we must override the column name specified by the GET
       */
      if( result[2] == "first_occurrence" )
      {
        column = "upsert_timestamps.0";
      }
      return new Array( column, ord );
    }
  }
};


module.exports = {

  secure: true,

  /*
   * note, req.is only seems to be in the trunk git version of express
   * simply installing with "npm install express" will not, at present 
   * get you a fully working express install
   *
   * solution:
   * $ git clone https://github.com/visionmedia/express.git
   * $ npm install ./express/
   */

  index: function(req, res, next ){

    /*
     * limit finding filter to this user
     */
    var filterfind = {};
    if( req.query.f == 'fallback' )
    {
      logger.debug( "Using fallback filter" );
      filterfind.name = 'fallback';
      filterfind.user = null;
      filterfind.system = true;
    }
    else
    {
      filterfind.user = req.session.user;
      filterfind.name = req.query.f == undefined ? 'default' : req.query.f;
    }

    debug( "req.query", req.query )

    var sorter = undefined;
    if( req.query == undefined )
    {
      logger.debug( "Query has no options" );
    }
    else
    {
      sorter = handleQuerySort( req.query );
      logger.debug( "Sorter = " + inspect( sorter ) );
    }

    /*
     * get users default filter
     */

    var uf = { };
    Filters.findOne( filterfind, function(err, filter)
    {
      if( err )
      {
        throw( err );
        return;
      }

      if( !filter )
      {
        res.send( "ERROR: filter" );
        return;
      }
      if( typeof filter.f != "object" )
      {
        throw( new Error( "Filter is not an object" ) );
        return;
      }


      debug( "FILTER:", filter.f )
      var the_filter = filter.f;

      var alerts_to_send = [];
      var alert_ids_sent = [];

      /*
       * find the alerts for this users filter
       */
      logger.debug( "finding Alerts with query: " + typeof the_filter + " / " + inspect( the_filter, true, 4  ) );

      var time_before_alerts_retrieved = new Date();

      var finder = Alerts.find( the_filter, { notes:0, history:0 } );
      if( sorter != undefined )
      {
        finder.sort( sorter[0], sorter[1] );
      }
      /*
       * add on an extra sort to ensure sorting is consistant
       */ 

      finder.sort( "_id", 1 );

      finder.execFind( function( err, docs )
      {
        if( err )
        {
          logger.error( 'execFind : ' + err );
          res.send( 404 );
          throw new Error( err );
        }

        logger.debug( "found " + docs.length + " alerts" );

        docs.forEach( function( lert )
        {
          /* 
           * we now need to munge the alerts retrieved from the database
           * ever so slightly, to ensure that the timestamps are picked out correctly
           */
          var l = lert.toClient();
          alerts_to_send.push( l );
          //alert_ids_sent.push( l._id );
        });

        /*
         * send the list of alerts to the client
         */

        res.send( alerts_to_send );

        /*
         * inform the oafserver that a new set of alerts has been sent
         * to the client/browser and it should not starting sending
         * deltas from the point in time demarcated by time_before_alerts_retrieved
         */

        debug( "SESSION:", req.session )
        debug( "SESSION_ID:", req.sessionID )


        /*
         * populate a delatas object with the initial set of
         * alert.id values.
         * this is so the server knows which ids the client 
         * currently has
         */
    /* WiP 
        var deltas = new DeltaManager( { 
          ids: alert_ids_sent, 
          session_id: req.sessionID,
          filter: filter,
          time_sent: time_before_alerts_retrieved.getTime()
        } );

        oafserver.events.emit( 'new_delta', deltas );

        oafserver.events.emit( 'sentalerts', { 
          session_id: req.sessionID,
          filter: filter, 
          time_from: time_before_alerts_retrieved.getTime() } );
    end WiP */
      });
    });

  },

  // /alerts/:id
  show: function(req, res, next){
    Alerts.findOne( { _id:req.params.id }, function( err, a )
    {
      res.send( a );
    });
  },

  // /alerts/:id/edit
  edit: function(req, res, next){
    get(req.params.id, function(err, user){
      if (err) return next(err);
      res.render(user);
    });
  },


  // PUT /alerts/:id
  update: function(req, res, next){
    logger.debug( "updating alert...." + req.params.id );
    Alerts.findById(req.params.id, function(err, data) {

      if( err )
      {
        logger.error( "Failed to find alert: " + err );
        res.send( {} );
        return;
      }

      if( !data || data.length == 0 )
      {
        logger.debug( "Could not find alert with id: " + req.params.id );
        res.send( 404 );
        return;
      }
      else
      {
        debug( "update updating 1", data )

        var h = { timestamp: new Date() };
        var message = "";
        if( req.session.user )
          h.user = req.session.user;

        if( req.body.owner != undefined )
        {
          logger.info( "CURRENT owner = " + data.owner );
          if( data.owner != undefined && data.owner != '' )
          {
            message = "Owner changed " + data.owner + " -> " + req.body.owner;
          }
          else
          {
            message = "Owner set to: " + req.body.owner;
          }

          data.owner = req.body.owner;
          h.msg = message;
          logger.debug( "Owner set to: " + req.body.owner );
        }

        if( req.body.acknowledged != data.acknowledged )
        {
          if( req.body.acknowledged === true )
            h.msg = "De-Acknowleded";
          else
          {
            /*
             * assign user when acknowledging
             */
            h.msg = "Acknowleded";
            data.owner = req.session.user;
          }
          data.acknowledged = req.body.acknowledged;
        }
        if( req.body.severity != data.severity )
        {
          message = "Severity changed: " + data.severity + " -> " + req.body.severity;
          h.msg = message;
          data.severity = req.body.severity;
          logger.debug( "Changing severity to: " + req.body.severity );
        }

        data.history.push( h );

        var commit_function = function()
        {
          /*
           * we can send back via items:[] the updated item, which means we can do
           * do stuff up above, and cause the client side alert to be updated...
           */

          data.save( function( err )
          {
            logger.info( "Saving alert id: " + req.params.id );
            //debug( "commit_function saved", data )
            if( err )
            {
              logger.error( "Failed to save alert: " + req.params.id + " " + err );
              throw( err );
            }

            var alert_data = data.toClient();
            debug( "Saved alert.toClient", alert_data )

            res.send( { totalCount: 1, items:  [ alert_data ] } );

            oafserver.events.emit( "updated", { id: req.params.id, identifier: data.identifier } );

          });
        };

        if( req.body.external_class != data.external_class )
        {
          ExternalCommands.update_alert( req.body.external_class, data.toShellEnv(), function( err, updates )
          {
            if( err )
            {
              logger.error( "update_alert failed: " + err );
            }
            else
            {
              for( var k in updates )
              {
                logger.debug( "updating alert[" + k + "] to: " + updates[k] );
                data[k] = updates[k];
              }
              commit_function();
            }
          });
        }
        else
        {
          commit_function();
        }
      }
    }, null );
  },

  destroy: function(req, res, next){
    Alerts.findById(req.params.id, function(err, data) {
      debug( "destroy found data", data )
      if( data !== null )
      {
        logger.info( "Removing row" );
        oafserver.events.emit( "deleted", { id: req.params.id, identifier: data.identifier } );
        data.remove();
      }
      res.send( { totalCount: 1, items: "blah" }  );
    });
  }

};
