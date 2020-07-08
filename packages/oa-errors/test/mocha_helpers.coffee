# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


mocha   = require 'mocha'
expect  = require( 'chai' ).expect
sinon   = require 'sinon'


# Source maps for development
require('source-map-support').install()

debug = require( 'debug' )( 'oa:mocha:helpers' )


module.exports =
  mocha:    mocha
  expect:   expect
  sinon:    sinon
  debug:    debug
