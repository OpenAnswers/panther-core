
#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# logging modules
{debug, logger} = require('oa-logging')('oa:express:path')

# node modules
path            = require 'path'


# ### Path

# Store a set of paths for an Express web app in a singleton
# Avaialbe anywhere you include Path
# Should be added to Config.
#
# base   - base app dir
# view   - app views
# public - public web dir
# assets - js/css compiled assets
# bower  - bower assets

class Path

  @p: path

  # Give people access to node join
  @resolve: (paths...) ->
    path.resolve paths...

  # Give people access to node join
  @join: (paths...) ->
    path.join paths...

  # Create paths from the local base for this nodejs app
  @local: (paths...) ->
    debug 'args', @base, paths
    path.join @base, paths...

  # based on ./lib/, something different for node_modules!?
  @base:      path.join __dirname, ".."

  # Set some defaults
  @app:       path.join @base,    "app"
  @views:     path.join @app,     "view"
  @routes:    path.join @app,     "route"
  @assets:    path.join @app,     "assets"
  @socketio:  path.join @app,     "socketio"
  @emails:    path.join @app,     "emails"

  @public:    path.join @base,    "public"

  @bower:     path.join @assets,  "bower"
  @bower_src: path.join @base,    "bower_components"


  @add: ( name, value ) ->
    throw new Error "property already exists [#{name}]" if Path.path
    Path[name] = value

  @add_local: ( name, value ) ->
    value ?= name
    @add name, Path.local(value)


# Export the useful bits
module.exports =
  Path: Path