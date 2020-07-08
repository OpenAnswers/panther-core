# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

debug    = require( 'debug' )( 'oa:test:func:api' )
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


describe 'Agent - Graylog Rules UI', ->

  @timeout 5000

  it 'changes to the graylog agent rules page', (done) ->
    client.url web.url + '/rules/agent/graylog', done

  it 'checks for the presence of at least one Global Rule', (done) ->
    client.waitForExist '.card-global-rule', 5000, false, done



# Clean up cookies for the next test/run
after (done) ->
  return done() unless client
  client.end done
