# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Routing Index

# This is the main entry point for express http routes.
# Most routes are required from other files and mounted on a path.

# Logging
{ debug, logger } = require('oa-logging')('oa:event:route:index')

# NPM modules
fs              = require 'fs'
router          = require('express').Router()
passport        = require 'passport'
mongoose        = require 'mongoose'

# OA modules
{ User }        = require '../model/user'
{ Activities }  = require '../../lib/activities'

config          = require('../../lib/config').get_instance()

# Create a passport authentication stategy from the model
passport.use User.createStrategy()
passport.serializeUser User.serializeUser()
passport.deserializeUser User.deserializeUser()

# We create a `route` function that is the main
# export for `express` to require and run.
route = (app) ->

  # The `status` route is a special case which populates some info on
  # app.locals. Need a better way to pass it `app` or do this
  # setup elsewhere.
  require('./status').setup(app)

  
  app.use '/status',    require('./status').router
  app.use '/api',         require './api'


  app.use '/apiconsole',  require './apiconsole'
  app.use '/admin',       require './admin'
  app.use '/console',     require './console'
  app.use '/dashboard',   require './dashboard'
  app.use '/debug',       require './debug'
  app.use '/password',    require './password'
  app.use '/rules',       require './rules'
  app.use '/settings',    require './settings'
  app.use '/views',       require './views'
  app.use '/help',        require './help'
  if process.env.DEBUG or not app.get('is_production')
    app.use '/test',        require './test'
  

  # Landing page
  app.get '/', ( req, res ) ->
    redirectUrl = req.query?.redirectUrl
    if req.user?.username
      res.render 'dashboard', {
        title: 'Dashboard'
        user: req.user
      }
    else
      res.render 'index', {
        title: 'Login'
        redirectUrl: redirectUrl
      }

  app.use '/', ( req, res, next ) ->
    if mongoose.connection.readyState != 1
      err = new Error "Database connection is not ready", mongoose.connection.readyState
      err.code = mongoose.connection.readyState
      err.status = 503
      return next(err)
    next()

  # Not needed
  app.get '/login', ( req, res ) ->
    res.render 'index', {
      title: 'Login'
    }

  # Passport can produce non intuitive errors here.
  # Probably need to setup a custom callback to handle
  # errors (like form fields missing:400)
  app.post '/login', ( req, res, next ) ->
    debug '/login auth', req.body
    #res.redirect '/dashboard'

    # Note passport.authenticate creates a function that is
    # called with ( req, res, next)
    passport.authenticate( 'local', (err, user, info) ->
      logger.info 'Passport Authenticate err[%s] info[%s] req.body.user[%s]', err, info, req.body.username
      if err
        logger.error 'Authentication passport error for user[%s]', user, err, ''
        return next(err)
      if info
        logger.warn "Authentication failure [%s]", info 
        if info.name is 'TooManyAttemptsError'
          return res.redirect '/?account-locked'
        if info.name is 'AttemptTooSoonError'
          return res.redirect '/?account-locked-temporarily'
      unless user
        logger.error 'Authentication failed for user[%s] info[%s]', user, info
        return res.redirect '/?failed-login'
      req.logIn user, ( err ) ->
        if err
          logger.error 'Authentication logIn error for user [%s]', user, err, ''
          return next(err)
        Activities.store 'user', 'login', user.username, { username: user.username }
        logger.info 'Login UserID [%s]', user.id
        redirectUrl = if req.body.redirectUrl? and req.body.redirectUrl.length > 0 then req.body.redirectUrl else '/dashboard'
        return res.redirect redirectUrl
    )( req, res, next)


  # Logout the session
  app.all '/logout', ( req, res ) ->
    if req.user
      Activities.store 'user', 'logout', req.user.username, { username: req.user.username }
      logger.info 'Logout UserID [%s]', req.user.id
    req.logout()
    # ensure session data is purged from the database
    req.session.destroy (err) ->
      if err
        logger.error "Failed to destroy session: ", err
    res.redirect '/'

  if config.app.swagger_docs and config.app.swagger_json
    swaggerUi = require 'swagger-ui-express'
    try
      logger.info "Loading swagger document from " + config.app.swagger_json
      swaggerDocument = JSON.parse fs.readFileSync( config.app.swagger_json )
      app.use '/api-docs', ( req, res, next) ->
        if req.user
          next()
        else
          logger.error 'Client tried to API-DOCS without authenticating'
          res.redirect '/'
      , swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true })

      app.get '/swagger.json', ( req, res, next) ->
        if req.user
          return res.json swaggerDocument
        else
          logger.error 'Client tried to get swagger.json without authenticating'
          res.status( 401 )
          res.json { name: 'error', message: 'Not Permitted' }
        
    catch error
      logger.error 'No `swagger.json` was found', error

  # Not needed
  app.get '/ping', ( req, res ) ->
    res.status(200).send('pong!')


module.exports = {
  route: route
}
