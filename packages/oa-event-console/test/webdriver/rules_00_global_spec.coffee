# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

debug    = require( 'debug' )( 'oa:test:webdriver:rules_global' )
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


describe 'Rules UI', ->

  cookie = null

  it 'changes to the Global Rules page', (done) ->
    @timeout 5000
    client
      .url web.url + '/rules/globals', done

  it 'checks for the presence of at least one Global Rule', (done) ->
    @timeout 6000
    client
      .waitForExist '#rules-container .card-global-rule', 6000, false, done


  describe 'the third rule', ->

    rule_selector = '.card-global-rule-li[data-id="2"]'

    it 'should have a title of 3 local stuff home', ( done )->
      client
      .getText "#{rule_selector} .rule-name", ( error, title )->
        if error then done(error)
        expect( error ).to.not.be.ok
        expect( title ).to.equal '3 local stuff home'
        done()

    it 'should exand via icon', ( done )->
      client
      .click "#{rule_selector}  .button-collapse"
      .waitForVisible "#{rule_selector} .select-entry", 1000, false
      .waitForVisible "#{rule_selector} .action-entry", 1000, false, ->
        done()

    it 'should enter edit mode via icon', ( done )->
      client
        .click "#{rule_selector} .button-edit-normal"
        .waitForVisible "#{rule_selector} .button-delete", 1000, false, ->
          done()

    it 'should exit edit mode via icon', ( done )->
      client
        .click "#{rule_selector} .button-edit-active"
        .waitForVisible "#{rule_selector} .button-delete", 1000, true, ->
          done()

    it 'should re enter edit mode via icon', ( done )->
      client
        .click "#{rule_selector} .button-edit-normal"
        .waitForVisible "#{rule_selector} .button-delete", 1000, false, ( error )->
          return done(error) if error
          done()

    it 'should delete the rule', ( done )->
      client.click "#{rule_selector} .button-delete", done

    xit 'click something random to work around ECONNRESET', ( done )->
      client.click "body", done

    it 'should refresh the rule set after delete', ( done )->
      client
        .getText "#{rule_selector} .rule-name", ( error, title )->
          return done(error) if error
          expect( title ).to.equal '4 If statement on node again to set customer field'
          #expect( title ).to.equal '3 local stuff home'
          done()

    it 'should show warning after delete', ( done )->
      client.waitForVisible ".card-rules-warning", 2000, false, ( error, res )->
        return done(error) if error
        expect( res ).to.equal true
        done()



  
# Clean up cookies for the next test/run
after (done) ->
  return done() unless client
  client.end done
