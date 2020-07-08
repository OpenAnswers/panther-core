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
    ' -u apikey owner'+
    ' -o --once '+
    ' -h --help   This help'
  process.exit 1

# opt setup
opt.config   = argv.c || argv.config    || path.join( __dirname, '..', 'config.yml' )
opt.owner    = argv.u
opt.once     = argv.o || argv.once

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

if opt.owner is false
  opt_error.push '-u <username> required'

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
{ Mongoose } = require '../lib/mongoose'
{ ApiKey } = require '../app/model/apikey'

# Connect and do the stuff
Mongoose.connect ->
  logger.info 'Connection open', config.mongodb.uri

  debug 'owner', opt.owner

  ApiKey.findOneAsync username: opt.owner
  .then (result)->
    if opt.once
      unless result
        apiKey = new ApiKey()
        apiKey.username = opt.owner
        apiKey.created = new Date
        apiKey.saveAsync()
    else
      apiKey = new ApiKey()
      apiKey.username = opt.owner
      apiKey.created = new Date
      apiKey.saveAsync()
  .then ( res )->
    debug 'res', res
    if res
      logger.info 'added ApiKey [%s] for [%s]', res.apikey, opt.owner
    else
      logger.info 'ApiKey for [%s] already exists', opt.owner

  .finally ->
    Mongoose.db.close()

