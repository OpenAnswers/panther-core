
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
