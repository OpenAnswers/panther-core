#!/usr/bin/env coffee
# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# Populate the severities collection with some default data when nothing exists
# To be use on initial setup of systems

# logging
{logger, debug} = require('oa-logging')('oa:event:setup_severity')

Promise  = require 'bluebird'
_        = require 'lodash'


default_severity_data = [
  {
    value: 0
    label: 'Clear'
    background: '#AAFFAA'
    foreground: '#333333'
    system: true
  }
,
  {
    value: 1
    label: 'Indeterminate'
    background: '#DBA7D9'
    foreground: '#333333'
    system: true
  }
,
  {
    value: 2
    label: 'Warning'
    background: '#8CC2FF'
    foreground: '#333333'
    system: true
  }
,
  {
    value: 3
    label: 'Minor'
    background: '#FFF6A5'
    foreground: '#333333'
    system: true
  }
,
  {
    value: 4
    label: 'Major'
    background: '#FFB689'
    foreground: '#333333'
    system: true
  }
,
  {
    value: 5
    label: 'Critical'
    background: '#FF7A7A'
    foreground: '#333333'
    system: true
  }
]

# ### Process command line argument options
argv = require('minimist')(process.argv.slice(2))
opt  = {}
opt_error = []

# opt help
opt.help     = argv.h || argv.help || false
if opt.help
  console.log ' -c --config  Event Console config file'+
    ' -r --reset  Remove current system severities'
    ' -h --help   This help'
  process.exit 1

# opt setup
opt.config   = argv.c || argv.config || '../config.yml'
opt.reset    = argv.r || argv.reset  || false

# opt error handling
if opt.config is true or opt.config is false
  opt_error.push '--config argument requires a file'

if opt.reset is not true and opt.reset is not false
  opt_error.push '--reset is a boolean flag, takes no arguments'

if opt_error.length > 0
  throw new Error "Problem with command line options.\n "+opt_error.join("\n ")

# OA Config first, before anything else can get a `config` instance
# with nothing populated in it

try
  config = require('../lib/config').load_file opt.config, 'default'
catch error
  logger.error "Failed to load #{opt.config}:\n#{error}"
  throw error


# Now for the setup

{ Mongoose }  = require '../lib/mongoose'
{ Severity }  = require '../app/model/severity'


Mongoose.connect ->
  logger.debug 'Connected'


Mongoose.db.once 'open', (cb) ->
  logger.info 'Script connection open', config.mongodb.uri

  # See if we have any severities
  Severity.findAsync system: true
  .then ( docs )->
    if docs.length > 0
      logger.warn 'We already have severities [%s], no need to setup', docs.length
      process.exit 0 unless opt.reset

    # In case we needed a remove, this is a bit of a hack to Promisify around 
    # the if. `false` will be returned if `docs.length` is 0
    logger.warn 'Removing system severities', docs.length
    Severity.removeAsync system: true
  .then ( nothing )->

    logger.info 'Setting up default severities in database'

    # Now setup all the severity promises in an object
    severity_saves = {}
    for severity_data in default_severity_data
      logger.info 'Starting on severity [%s]', severity_data.label
      db_sev = new Severity severity_data
      severity_saves[severity_data.label] = db_sev.saveAsync()
  
    # And run severity inserts
    Promise.props( severity_saves )
  .then ( results )->
    logger.info 'Severities saved to db'
    for severity_data in default_severity_data
      debug "results",results
      logger.info 'Saved %s, result: %s', severity_data.label, results[severity_data.label]._id, ''

  # Allow the connection to close so we can naturally exit, as this is a script
  .finally ->
    Mongoose.db.close()
