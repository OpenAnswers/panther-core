#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

debug   = require( 'debug' )( 'oa:test:unit:path' )
helpers = require '../mocha_helpers'
nock    = require "nock"

# Test setup
{NewsRequest} = require '../../app/controller/news'

console.log 'NewsRequest', NewsRequest


describe 'Unit::EventConsole::News', ->

  describe 'bad feed', ->

    before ->
      nfail = nock 'https://openanswersblog.wordpress.com'
        .get '/feed/'
        .reply 200, 'wat'

    xit 'should fail on bad content', (done)->
      NewsRequest.fetch('https://openanswersblog.wordpress.com/feed/')
      .then (res)-> done('bad content should not succeed. '+res)
      .catch ( error )->
        expect( error ).to.be.an 'error'
        expect( error.message ).to.match /Not a feed/
        done()

    xit 'should fail on http error response', (done)->
      nfail = nock 'https://openanswersblog.wordpress.com'
        .get '/feed/'
        .replyWithError new Error('wat')

      NewsRequest.fetch('https://openanswersblog.wordpress.com/feed/')
      .then (res)-> done('http error should not succeed. '+res)
      .catch ( error )->
        expect( error ).to.be.an 'error'
        expect( error.message ).to.match /wat/
        done()


  describe 'http feed', ->

    xit 'should get a fresh news item', (done)->
      nok = nock 'https://openanswersblog.wordpress.com'
        .get '/feed/'
        .replyWithFile 200, __dirname + '/../fixture/news-feed.xml'

      NewsRequest.fetch('https://openanswersblog.wordpress.com/feed/')
      .then (res)->
        expect( res ).to.be.an 'array'
        expect( res[0] ).to.be.an 'object'
        expect( res[0] ).to.contain.keys 'title', 'link', 'description', 'date'
        expect( res[1] ).to.be.an 'object'
        expect( res[1] ).to.contain.keys 'title', 'link', 'description', 'date'
        done()
      .catch done


  describe 'cached feed', ->

    xit 'should return the cached news item', (done)->
      NewsRequest.fetch('https://openanswersblog.wordpress.com/feed/')
      .then (res)->
        expect( res ).to.be.an 'array'
        expect( res[0] ).to.be.an 'object'
        expect( res[0] ).to.contain.keys 'title', 'link', 'description', 'date'
        expect( res[1] ).to.be.an 'object'
        expect( res[1] ).to.contain.keys 'title', 'link', 'description', 'date'
        done()
      .catch done


