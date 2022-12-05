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
    ' -h --help   This help'
  process.exit 1

# opt setup
opt.config   = argv.c || argv.config    || path.join( __dirname, '..', 'config.yml' )
opt.name     = argv.n || argv.name || false

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

if opt.name is false
  opt_error.push '--name Name of console required'

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
{ Activities } = require '../lib/activities'

# Connect and do the stuff
Mongoose.connect ->
  logger.info 'Connection open', config.mongodb.uri

  debug 'name', opt.name

  Activities.store_Async( 'provision', 'create', 'system', name: opt.name )
  .then ( res )->
    debug 'res', res
    logger.info 'all done [%s]', opt.name

  .finally ->
    Mongoose.db.close()

