
# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Routes - rules

# logging modules
{logger, debug} = require('oa-logging')('oa:event:controller:status')

# node modules
fs    = require 'fs'
path  = require 'path'

# oa modules
{Path}      = require '../../lib/path'
{Config}    = require '../../lib/config'
{SocketIO}  = require '../../lib/socketio'


debug 'status setup'

isDirectorySync = (path) ->
  stat = fs.statSync path
  stat and stat.isDirectory()

walk = (dir) ->
  debug 'walking directory sync', dir
  results = []
  entries = fs.readdirSync(dir)
  
  entries.forEach (entry) ->
    entry = path.join dir, entry
    if isDirectorySync entry
      debug 'walk sync found directory'
      results.push entry
      results = results.concat walk(entry)
  
  results


# Not in use yet
isDirectory = (path, cb) ->
  stat = fs.stat path, (err, cb) ->
    cb err if err
    cb null, path if stat and stat.isDirectory()

walkDirectory = (dir, cb) ->
  debug 'walking directory async', dir
  results = []
  fs.readdir dir, (err, entries) ->
    entries.forEach (entry) ->
      entry = path.join dir, entry
      isDirectory entry, (err, path) ->
        debug 'walk async found directory', path
        cb path



# We need `app` to set the app local variables.
# There's probably a better way to do this
module.exports = (app) ->

  return if process.env.NODE_ENV is 'production'

  dirs = [ Path.views, Path.assets ]
  watch_dirs = dirs

  for dir in dirs
    watch_dirs = watch_dirs.concat walk(dir)

  #dirs = for dir in fs.readdirSync(Path.views) when
  logger.debug 'watching dirs for changes', watch_dirs


  for dir in watch_dirs

    fs.watch dir, (event, filename) ->
      debug 'event is: ' + event
      app.locals.update_time = Date.now()
      SocketIO.io.emit 'time_update',
        time: Date.now()
        event: event

      if filename
        debug 'filename provided: ' + filename
      else
        debug 'filename not provided'
