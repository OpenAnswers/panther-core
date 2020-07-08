#!/usr/bin/env coffee
# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# This script sets up a user, password and email via passport
# It's used by the ansible signup playbook to initilize admin users

# log modules
{ logger, debug } = require('oa-logging')('oa:event:app')
{ Promise }       = require 'bluebird'
Promise.longStackTraces()
path              = require 'path'
fs                = require 'fs'

# ### Process command line argument options
argv = require('minimist')(process.argv.slice(2))
opt={}
opt_error=[]

# opt help
opt.help     = argv.h || argv.help || false
if opt.help
  console.log ' -c --config Event Console config file (including db connection details)'+
    ' -u --user   Username to setup/modify'+
    ' -p --pass   Password to set'+
    ' -e --email  Email address to set'+
    ' -g --group  Group (defaults "user")'+
    ' -h --help   This help'
  process.exit 1

# opt setup
opt.config   = argv.c || argv.config    || path.join( __dirname, '..', 'config.yml' )
opt.user     = argv.u || argv.user      || opt_error.push '--user required'
opt.password = argv.p || argv.password  || opt_error.push '--password required'
opt.email    = argv.e || argv.email     || opt_error.push '--email required'
opt.group    = argv.g || argv.group     || 'user'

# opt error handling
try
  conf_stat = fs.statSync(opt.config)
catch e
  if e.code is 'ENOENT'
    conf_stat = false
  else
    throw e


if opt.config is true or opt.config is false or not conf_stat
  opt_error.push '--config requires a file that exists'

if opt.user is true or opt.user is false
  opt_error.push '--user requires a value'

if opt.password is true or opt.password is false
  opt_error.push '--password requires a value'

if opt.email is true or opt.email is false
  opt_error.push '--email requires a value'

if opt.group is true or opt.group is false
  opt_error.push '--group requires a value'

if opt_error.length > 0
  throw new Error "Problem with command line options.\n "+opt_error.join("\n ")

# OA Config first, before anything else can get a `config` instance
# with nothing populated in it

try
  config = require('../lib/config').load_file opt.config, 'default'
catch error
  logger.error "Failed to load config file [#{opt.config}]:\n#{error}"
  throw error


# Then Load modules which rely on config
{ Mongoose }      = require '../lib/mongoose'
{ User }          = require '../app/model/user'
{ Filters }       = require '../app/model/filters'

# setupAsync

setup_Async = ( details )->
  debug 'setup details', details
  new Promise (resolve, reject)->
    user = new User details
    password = details.password
    delete details.password
    newuser = null

    User.registerAsync user, password
    .then ( res_newuser )->
      newuser = res_newuser
      console.log 'setup user', details.username, newuser.created
      
      Filters.setup_initial_views_Async res_newuser.username
    .then ( results )->
      logger.info 'viewMine setup', results.mine._id
      logger.info 'viewAll setup', results.all._id
      logger.info 'viewUnack setup', results.unack._id

      resolve newuser

    .catch ( error )->
      reject error


setup_filters = ->
  # nothing


# Get the mongoose User, set the passport password
# and then any user deyails
password_Async = ( details )->
  debug 'pass details', details
  new Promise (resolve, reject)->
    User.findOneAsync username: details.username
    .then ( user )->
      user.setPasswordAsync details.password

    .then ( user )->
      user.email = details.email
      user.group = details.group if argv.group or argv.g
      user.saveAsync()

    .then ( res )->
      logger.info 'user password saved'
      debug 'res', res.ops
      resolve res

    .catch (error)->
      reject error




Mongoose.connect ->
  logger.debug 'connected'

# Emit connect
Mongoose.db.once 'open', (cb) ->
  logger.info 'Connection open', config.mongodb.uri

  details =
    username: opt.user
    password: opt.password
    email: opt.email
    group: opt.group

  debug 'details', details

  User.collection.findOneAsync( username: details.username )
  .then ( res )->
    if res
      password_Async details
    else
      setup_Async details

  .then ( res )->
    debug 'res', res
    logger.info 'all done [%s]', res.username

  .finally ->
    Mongoose.db.close()

