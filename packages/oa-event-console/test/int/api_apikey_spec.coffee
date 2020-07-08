#
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

debug    = require( 'debug' )( 'oa:test:func:api:events' )

{ expect, supertest } = require '../mocha_helpers'
{ random_string }     = require 'oa-helpers'

# Test setup
app       = null
path      = "/api/apikey"
app_up    = require '../mocha_app'


before (done)->
  @timeout 20000
  app_up ( err, result )->
    return done(err) if err
    app = result
    done()


describe 'ApiKey API', ->

  key = null

  it 'reads all keys', ( done )->
    supertest(app).get "#{path}/read"
    .end ( err, res )->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 200
      expect( res.body ).to.be.a 'object'
      expect( res.body ).to.contain.all.keys ['results','data']
      expect( res.body.results ).to.be.gt 0
      expect( res.body.data ).to.be.an 'array'
      key = res.body.data[0]
      done()


  it 'reads one of the keys', ( done )->
    supertest(app).get "#{path}/read/#{key.apikey}"
    .end ( err, res )->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 200
      expect( res.body ).to.be.a 'object'
      expect( res.body ).to.contain.all.keys ['results','data']
      expect( res.body.results ).to.eql 1
      expect( res.body.data ).to.be.an 'array'
      expect( res.body.data[0].apikey ).to.eql key.apikey
      done()

  it 'returns a 404 for a missing key', ( done )->
    supertest(app).get "#{path}/read/#{key.apikey}asdf"
    .end ( err, res )->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 404
      expect( res.body ).to.be.a 'object'
      expect( res.body ).to.contain.keys ['message']
      done()

  it 'finds one of the keys', ( done )->
    supertest(app).get "#{path}/exists/#{key.apikey}"
    .end ( err, res )->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 200
      expect( res.body ).to.be.a 'object'
      expect( res.body ).to.contain.all.keys ['found']
      expect( res.body.found ).to.eql true
      done()

  it 'doesnt find a fake key', ( done )->
    supertest(app).get "#{path}/exists/#{key.apikey}asdf"
    .end ( err, res )->
      expect( err ).to.equal null
      expect( res.statusCode ).to.eql 200
      expect( res.body ).to.be.a 'object'
      expect( res.body ).to.contain.all.keys ['found']
      expect( res.body.found ).to.eql false
      done()
