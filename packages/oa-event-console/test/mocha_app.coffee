# # Mocha App Instance

# An express app loaded, so all mocha tests can startup and use the single
# Express app. Still needs a mongodb instance

debug   = require( 'debug' )( 'oa:event:mocha:app' )
fs      = require 'fs'
Promise = require 'bluebird'
{copy_rules_Async} = require './mocha_helpers'

# Get a config
config  = require('../lib/config').load_file './test/fixture/config.test.yml', 'default'
debug 'config', config

# Set test so logging is silenced
process.env.NODE_ENV = 'test'

app = null
connected_status = false
express = null

# Mongoose and connected status
{ SocketIO }    = require '../lib/socketio'
{ Mongoose }    = require '../lib/mongoose'
{ ExpressApp }  = require '../lib/express'


is_connected = ->
  connected_status


get_app = ->
  express.app


app_up = ( cb )->
  if connected_status
    return cb null, app
  debug 'connecting'

  copy_rules_Async().then ( results )->
    debug 'files copied'
    Mongoose.connect ( err, res )->
      if err
        console.error(err)
        cb err if cb
        return throw err
      debug 'connected to mongoose'
      connected_status = true

      # Setup the app
      express = new ExpressApp config: config
      sio = SocketIO.create express
      app = express.app
      debug 'express app setup for testing'
      cb null, app

  .catch ( error )->
    cb error
    
# And allow everyone to access the instance
module.exports = app_up

