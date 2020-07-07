 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

Users = require( __dirname + '/../models/user');

module.exports = {

  secure: function( req, res, next )
  {
    if( req.session.is_admin == true ) next();
    else res.send( { success: false } );
  },

  index: function(req, res){
    logger.debug( "incoming users request" );
    Users.find({}, { login:1, group:1 }, function( err, users )
    {
      if( err )
      {
        logger.error( err );
        return res.send( { success: false } );
      }

      var u = [];
      var view_id = 1;
      users.forEach( function( user )
      {
        u.push( { id: view_id++, login: user.login, group: user.group, password: '******',_id: user._id } );
      });

      res.send( { success: !err, data: u } );
    });

    //res.render(users);
  },

  // /users/:id

  show: function(req, res, next){
    get(req.params.id, function(err, user){
        if (err) return next(err);
        res.render(user);
    });
  },

  // /users/:id/edit

  edit: function(req, res, next){
    get(req.params.id, function(err, user){
        if (err) return next(err);
        res.render(user);
    });
  },

  // PUT /users/:id

  update: function(req, res, next){
    var id = req.params.id;

    res.send( { success: true } );
  }
};
