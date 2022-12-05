#!/usr/bin/env coffee
# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
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
    ' -u --user   Username to reset password for'+
    ' -h --help   This help'
  process.exit 1

# opt setup
opt.config   = argv.c || argv.config    || path.join( __dirname, '..', 'config.yml' )
opt.user     = argv.u || argv.user      || opt_error.push '--user required'

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

if opt_error.length > 0
  throw new Error "Problem with command line options.\n "+opt_error.join("\n ")

# OA Config first, before anything else can get a `config` instance
# with nothing populated in it

try
  config = require('../lib/config').load_file opt.config, 'default'
catch error
  logger.error "Failed to load config file [#{opt.config}]:\n#{error}"
  throw error

# require email only after the config files have been processed to ensure we use 
# the correct values
{ send_email_Async } = require '../lib/email'

# Then Load modules which rely on config
{ Mongoose }      = require '../lib/mongoose'
{ User }          = require '../app/model/user'
{ Filters }       = require '../app/model/filters'




Mongoose.connect ->
  logger.debug 'connected'

# Emit connect
Mongoose.db.once 'open', (cb) ->
  logger.info 'Connection open', config.mongodb.uri

  User.findOne username: opt.user
  .then ( user )->
    user.generate_token(1440)
    user.save()

  .then ( user )->
    reset_url = "#{config.app.url}/password/reset/#{user.reset.token}"

    send_email_Async
      to:       user.email
      subject:  "#{config.app.name} - Your password has been reset"
      template:
        name: 'password-reset-admin'
        values:
          token: user.reset.token
          expires: user.reset.expires

  .finally ->
    Mongoose.db.close()

