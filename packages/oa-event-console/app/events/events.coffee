# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# Logging module
{ logger, debug}  = require('oa-logging')('oa:event:events:events')

# node modules
util              = require 'util'

# npm modules
Promise           = require 'bluebird'
Promise.longStackTraces() if process.env.NODE_ENV is 'development'

# OA modules
lib_path = "../../lib"
{ Path }          = require lib_path + "/path"
{ SocketIO }      = require lib_path + "/socketio"
{ MongoPollers }  = require lib_path + "/mongopollers"
{ server_event }  = require lib_path + "/eventemitter"
{ _
  objhash
  throw_error }   = require 'oa-helpers'

Errors = require lib_path + '/errors'

config            = require(lib_path + "/config").get_instance()




# ### Event 'oa::events::deleted'

# Event to emit when an event is deleted

server_event.on 'oa::events::deleted', ( msg )->
  # send deletes out to users
  SocketIO.io.emit 'deletes',
    data: msg.ids
    source: 'oa::events::deleted'

server_event.on 'oa::events::deleted::all', (msg)->
  SocketIO.io.emit 'deletes-all',
    data: []
    source: 'oa::events::deleted::all'


# ### Event 'oa::events::updated'

server_event.on "oa::events::updated", ( msg )->

  # Trigger the view/pollers list os current id's message to go out
  # If it hasn't been sent recently

  # circular deps - socketio, mongopoller, evsocket =/
  { MongoPollers } = require(lib_path+'/mongopollers')
  
  MongoPollers.emit_current_ids()
  .then (pollResults)->
    debug "event oa::events::updated emit_current_ids", msg, pollResults
    true
  
  if msg and msg.type and msg.type is 'clear' # and it is 0 # which is clear
    setTimeout ->
      res = MongoPollers.emit_current_ids(type:msg.type)
      debug "event timeout oa::events::updated emit_current_ids", msg, res
    , 21000

  # send updates out to users
  # SocketIO.io.emit 'updates',
  #   type: 'updates'
  #   data: msg.ids
  #   source: 'oa::events::updated'