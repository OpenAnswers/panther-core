# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

debug    = require( 'debug' )( 'oa:test:func:views' )
{ expect, Web } = require '../mocha_helpers'
{ WebDriver } = require '../mocha_helpers_webdriver'

client = null

# Test setup (from ENV)
web = Web.from_env_or_default()


# Boot the app
before (done) ->
  @timeout 20000
  app = Web.boot_complete_app(done)

# Setup the client before anything else
before ( done )->
  @timeout 20000
  WebDriver.fetch_authenticated_client web, (err, res)->
    client = res
    done(err)


describe 'Views Manager', ->

  describe 'page load', ->

    it 'changes to the API Console page', (done) ->
      @timeout 5000
      client.url web.url + '/views', done

    it 'should have a Ok button', ( done ) ->
      client
        .waitForExist '.btn-success', 1000
        .then -> done()


  describe 'user views', ->

    it 'should add views to the list', ( done )->
      client.waitForExist '.views-row'
      .pause 20
      .elements '.views-row'
      .then ( rows )->
        expect( rows.value.length ).to.be.gte 3
        done()

    xit 'should add a new view', ( done )->
    
    xit 'should disable add button while adding', ( done )->

    xit 'shouldn\'t allow an empty name', ( done )->

    xit 'should edit a view name', ( done )->

    xit 'should edit a view field', ( done )->
 
    xit 'should edit a view value', ( done )->
   
    xit 'should set a default view', ( done )->

    xit 'should delete a view', ( done )->

    xit 'should cancel a view edit', ( done )->

    xit 'should cancel a view edit via escape key', ( done )->

    xit 'should cancel a view edit on new edit', ( done )->

    xit 'should warn when cancelling an edit with changes', ( done )->

   

# Clean up cookies for the next test/run
after (done) ->
  return done() unless client
  client.end done
