# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

debug    = require( 'debug' )( 'oa:test:func:api' )
{ expect, Web } = require '../mocha_helpers'
{ WebDriver } = require '../mocha_helpers_webdriver'

client = null

# Test setup (from ENV)
web = Web.from_env_or_default()


# Boot the app
before (done) ->
  @timeout 10000
  app = Web.boot_complete_app(done)

# Setup the client before anything else
before ( done )->
  @timeout 10000
  WebDriver.fetch_authenticated_client web, (err, res)->
    client = res
    done(err)


describe 'API Console', ->

  describe 'page load', ->

    it 'changes to the API Console page', (done) ->
      @timeout 5000
      client.url web.url + '/apiconsole', done

    it 'should have a Send button', (done) ->
      client.waitForExist '#btn-send', 1000, false, done

    it 'should populate the url', (done) ->
      client.waitUntil ->
        WebDriver.waitForValue this, '#output-url', ( text )->
          text != 'Loading...'
      , 1000, 50
      .getValue '#output-url'
      .then ( url )->
        expect( url ).to.eql 'http://localhost:5901/api/event/create'
        done()

    it 'should populate the drop down', (done) ->
      client.waitUntil ->
        WebDriver.waitForValue this, '#input-apikey option', ( text )->
          text != 'Loading...'
      , 1000, 50
      .getValue '#input-apikey option'
      .then ( apikey )->
        expect( apikey ).to.eql '7IkTMlrHyZ0MeiKUcnKYvXqZdY1UThq4'
        done()


  describe 'fields', ->

    it 'should add data to the json body', ( done )->
      client.setValue '#input-node', 'some-test-node-value'
      .getValue '#output-body'
      .then ( json_str )->
        json = null
        fn = ->
          json = JSON.parse(json_str)
        expect( fn ).to.not.throw Error
        expect( json ).to.have.property 'event'
        expect( json.event )
          .to.have.property 'node'
          .and.to.equal 'some-test-node-value'
        done()

    it 'should add data to the curl command', ( done )->
      client.setValue '#input-tag', 'some-test-tag-value'
      .getValue '#output-curl'
      .then ( curl_cmd )->
        expect( curl_cmd ).to.match /^curl -X.+,"tag":"some-test-tag-value",/
        done()



# Clean up cookies for the next test/run
after (done) ->
  return done() unless client
  client.end done
