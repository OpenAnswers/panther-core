# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Event Console

# Entry point for the event console web app

# Logging
{ logger, debug } = require('oa-logging')('oa:event:app')

# Get command line args
argv = require('minimist')(process.argv.slice(2))
debug 'process.argv', process.argv
config_file = argv.c if argv.c
config_file = argv.config if argv.config
config_file ?= 'config.yml'
debug 'config_file from argv', config_file

# Load OA Config first, before anything else can setup a `config` instance
# with nothing populated in it
try
  config = require('../lib/config').load_file config_file, 'default'
catch error
  logger.error "Failed to load config file [#{config_file}]:\n#{error}"
  throw error


# Modules

{ Path }          = require '../lib/path'
{ ExpressApp }    = require '../lib/express'
{ EventRules
  Agents }        = require 'oa-event-rules'
{ SocketIO }      = require '../lib/socketio'
{ Mongoose }      = require '../lib/mongoose'
#{ Zmq }         = require '../lib/zmq'
{ server_event }  = require '../lib/eventemitter'
{ _ }             = require 'oa-helpers'

# Node modules
{ statSync }      = require 'fs'
mkdirp            = require 'mkdirp'
listEndpoints     = require 'express-list-endpoints'


# Logging to file
#EventLogger.add_file Path.logs + '/all.log'

start = (startup_cb) ->
  # Load the rules (move this into a helper)
  try
    # The types array should be the basis for the rules loads
    #config.rules.types = Agents.types_array()

    config.rules.server = new EventRules
      path:   config.rules_path 'server'
      server: true
    # Allow legacy rules setup to still work FIXME
    config.rules.set = config.rules.server

    # Load each agents individual rules
    _.forEach config.rules.agents, (agentName) ->
      config.rules[agentName] = new EventRules
        path: config.rules_path agentName
        agent: true



  catch error
    logger.error "Failed to load rules:\n#{error}"
    throw error

  # create uploads directory if required
  upload_directory = _.get config, "app.upload.directory", null
    
  try
    mkdirp.sync upload_directory
  catch error
    logger.error "Failed configuration for upload.directory:\n #{error}"
    throw error

  # Include all the server events
  require './events'

  # Create a db connection
  Mongoose.connect (error) ->
    if error
      return startup_cb(error)

    # Setup the app and add socketio
    express = new ExpressApp config: config
    sio = SocketIO.create express
    
    # Rules changes should emit reloads out to socket clients
    # Again, the types array should be the basis for this
    config.rules.server.reload_cb = ->
      logger.debug 'Emit rules reloaded message to socket clients'
      SocketIO.io.emit 'event_rules::reloaded', { type: 'server' }

    
    _.forEach config.rules.agents, (agentName) ->
      config.rules[agentName].reload_cb = ->
        logger.debug 'Emit rules reloaded message to socket clients'
        SocketIO.io.emit 'event_rules::reloaded', { type: 'agent', sub_type: agentName }

    # Then startup the server
    express.serve (error, data) ->
      if error
        logger.error 'server failed', error.stack
        process.exit 1
      logger.info 'All setup and running'

      # Optionally log all endpoints
      if process.env.NODE_ENV is 'development'
        endpoints = listEndpoints( express.app )

        debug 'ENDPOINTS: ', endpoints
        _.forEach endpoints, (endpoint) ->
          logger.info 'ENDPOINT ' + endpoint.path + ' ' + endpoint.methods.join(',')


      module.exports.app = express.app
      startup_cb(error, express.app) if startup_cb


module.exports.start = start
module.exports.app
