{ expect } = require '../mocha_helpers'

OaMon = require '../../common'

describe 'common', ->

  it 'provides an OaMon instance', ->
    oamon = new OaMon()
    expect( oamon ).to.be.a 'object'
