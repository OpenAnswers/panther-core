#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

debug   = require( 'debug' )( 'oa:test:unit:config' )
helpers = require '../mocha_helpers'
expect  = helpers.expect


# Test setup
Config = require('../../lib/config')

before (d) ->
  d()


describe 'Config', ->

  describe 'returns the default instance', ->

    xit '.get_instance', ->
      expect( Config.get_instance() ).to.equal 'yep'
