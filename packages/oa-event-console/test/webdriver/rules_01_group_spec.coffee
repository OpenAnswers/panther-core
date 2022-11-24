# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

debug    = require( 'debug' )( 'oa:test:webdriver:rules_group' )
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
  WebDriver.fetch_authenticated_client web, ( err, res )->
    client = res
    done(err)


describe 'Group Rules UI', ->

  it 'changes to the Group Rules page', (done) ->
    @timeout 6000
    client.url web.url + '/rules/groups', done

  it 'should have at least one Group', (done) ->
    client.waitForExist '#event-rules .rule-group', 1000, false, done

  it 'should have at least one Group Rule', (done) ->
    client.waitForExist '#event-rules .card-global-rule', 1000, false, done


  describe "Groups", ( done )->

    it 'should have four groups', ( done )->
      client.elements '.rule-group-name'
      .then ( elements )->
        expect( elements.value.length ).to.equal 4
        done()


  describe "Group: TestGroup",->

    it 'should have a title', ( done )->
      client.getText '.rule-group-name'
      .then ( text )->
        expect( text[2] ).to.equal 'TestGroup'
        done()


# Clean up cookies for the next test/run
after (done) ->
  return done() unless client
  client.end done
