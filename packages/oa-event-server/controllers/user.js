 /*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

Users = require( __dirname + '/../models/user');

module.exports = {

  secure: function( req, res, next )
  {
    next();
  },

  index: function(req, res){
    logger.debug( "incoming users request" );
    Users.find({}, { login:1 }).all( function( users )
    {
      var data = { identifier:'userid', label:'login' };
      var u = [];
      for( var x=0; x < users.length; x++ )
      {
        u[x] = { login:users[x].login, userid:users[x]._id };
      }
      data.items = u;
      res.send( data );
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
        get(id, function(err){
            if (err) return next(err);
            var user = users[id] = req.body.user;
            user.id = id;
            req.flash('info', 'Successfully updated _' + user.name + '_.');
            res.redirect('back');
        });
    }
};
