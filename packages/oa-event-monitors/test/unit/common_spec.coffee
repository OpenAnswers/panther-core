#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

{ expect } = require '../mocha_helpers'

OaMon = require '../../common'

describe 'common', ->

  it 'provides an OaMon instance', ->
    oamon = new OaMon()
    expect( oamon ).to.be.a 'object'
