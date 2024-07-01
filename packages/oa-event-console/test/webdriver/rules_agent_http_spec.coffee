# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
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


describe 'Agent - HTTP Rules UI', ->

  it 'changes to the http Agent page', (done) ->
    @timeout 5000
    client
      .url web.url + '/rules/agent/http', done

  it 'checks for the presence of at least one http Rule', (done) ->
    @timeout 6000
    client
      .waitForExist '.card-global-rule', 6000, false, done


# Clean up cookies for the next test/run
after (done) ->
  unless client then done()
  client.end done
