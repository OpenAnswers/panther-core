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
#    ' --node     Node to set'+
#    ' --tag      Tag to set'+
#    ' --summary  Summary to set'+
#    ' --severity Severity to set'+
    ' -j --json     JSON blob to insert'+
    ' -h --help     This help'
  process.exit 1

# opt setup
opt.config   = argv.c || argv.config    || path.join( __dirname, '..', 'config.yml' )
opt.json  = argv.j || argv.json    || throw new Error "--json option required"

# opt error handling
try
  conf_stat = fs.statSync(opt.config)
catch e
  if e.code is 'ENOENT'
    conf_stat = false
  else
    throw e

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

Mongoose.connect ->
  logger.debug 'connected'

# Emit connect
Mongoose.db.once 'open', (cb) ->
  logger.info 'Connection open', config.mongodb.uri
  
  debug 'json details', opt.json
  json = JSON.parse opt.json

  unless Array.isArray json
    json = [json]
  inserts = []

  for event in json
    now = new Date
    event.first_occurrence ?= now
    event.last_occurrence ?= now
    event.state_change = now
    event.severity ?= 1
    event.node ?= 'localhost'
    event.summary ?= 'default'
    event.acknowledged = !!event.acknowledged
    unless event.identifier
      event.identifier = "#{event.node}:#{event.severity}:#{event.tag}:#{event.summary}"

    debug 'event details', event

    inserts.push Mongoose.alerts.update( event, $set:event, {upsert:true, multi:true })
  
  Promise.all( inserts )
  .then ( res )->
    debug 'res', res
    logger.info 'all done [%s]', res

  .finally ->
    Mongoose.db.close()

