# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

debug    = require( 'debug' )( 'oa:test:func:dashboard' )
{ _, expect, Web } = require '../mocha_helpers'
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


describe 'Dashboard', ->

  it 'changes to the Dashboard page', (done) ->
    @timeout 5000
    client.url web.url + '/dashboard', done


  describe 'Name', ->
    
    it 'should populate the console name', (done)->
      client.getText '#console-name'
      .then ( name_text )->
        expect( name_text ).to.equal 'test'
        done()
    

  describe 'Event Metrics', ->

    it 'should have a Critical event count above 0', (done) ->
      div_selector = '.dashboard-metric-critical .number-critical'
      client
      .waitUntil ->
        WebDriver.waitForText this, div_selector, ( text )->
          text isnt "NaN" and text isnt "" and text isnt "0"
      .getText div_selector
      .then ( number )->
        expect( number ).to.not.equal "0"
        expect( number ).to.not.equal ""
        expect( number ).to.not.equal "NaN"
        expect( parseInt(number) ).to.be.gt 0
        done()
 
    it 'should have a Major event count above 0', (done) ->
      div_selector = '.dashboard-metric-critical .number-critical'
      client
      .waitUntil ->
        WebDriver.waitForText this, div_selector, ( text )->
          text isnt "NaN" and text isnt "" and text isnt "0"
      .getText div_selector
      .then ( number )->
        expect( parseInt(number) ).to.be.gt 0
        done()

    it 'should have a Minor event count above 0', (done) ->
      div_selector = '.dashboard-metric-critical .number-critical'
      client
      .waitUntil ->
        WebDriver.waitForText this, div_selector, ( text )->
          text isnt "NaN" and text isnt "" and text isnt "0"
      .getText div_selector
      .then ( number )->
        expect( parseInt(number) ).to.be.gt 0
        done()


  describe 'Activity', ->

    'User matt logged in'


  describe 'Group Metrics', ->



# Clean up cookies for the next test/run
after (done) ->
  return done() unless client
  client.end done
