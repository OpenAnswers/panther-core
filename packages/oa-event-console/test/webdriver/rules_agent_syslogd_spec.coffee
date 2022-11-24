# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
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
  @timeout 18000
  WebDriver.fetch_authenticated_client web, (err, res)->
    client = res
    done(err)


describe 'Agent - Syslog Rules UI', ->

  @timeout 6000

  it 'changes to the Syslogd Rules page', (done) ->
    client.url web.url + '/rules/agent/syslogd', done

  it 'checks for the presence of at least one Syslog Rule', (done) ->
    client.waitForExist '.card-global-rule', 6000, false, done


  describe 'Create a Rule', ->

    # Horrible loop is to select one of the two visible items.
    # Don't know of a css selector to do this directly
    it 'shows the create ui', (done)->
      visible_button = null
      client
      .elements '.btn-rules-global-create-rule', ( err, create_buttons )->
        create_buttons.value.forEach ( button )->
          debug 'button', button 
          client.elementIdDisplayed button.ELEMENT
          .then ( res )->
            debug 'res', res
            if res.value is true
              client.elementIdClick button.ELEMENT
              .then ( click )->
                debug 'click', click
      .waitForVisible '.card-global-rule-new', 2000, done

    it 'sets the name', ( done )->
      client.setValue '.card-global-rule-new .rule-name-edit > input', 'a node', done

    # Loop is the find the menu item by the text, no ids are added
    # Again, css can't select by text
    it 'adds a select', (done)->
      client
      .setValue '.card-global-rule-new .select-operator > input', 'equal'
      .waitForVisible '.card-global-rule-new .select-operator > .dropdown-menu', 1000
      .click ".card-global-rule-new .select-operator > .dropdown-menu > li > a"
      # .then ( links )->
      #   debug 'links', links
      #   links.value.forEach ( link )->
      #     debug 'link', link
      #     client.elementIdText(link.ELEMENT)
      #     .then ( text )->
      #       debug 'text', text.value
      #       if text.value is "equals" then return client.elementIdClick link.ELEMENT
      .then -> done()

    # Note the missing letter from the end of setvalue.
    # You can either set the whole thing and not include the typeahead click
    # Or set 1 less character and the typeahead stays to be clicked
    it 'sets the select field', ( done )->
      client
      .waitForExist '.card-global-rule-new  .input-verb-select-equals-field'
      .click '.card-global-rule-new  .input-verb-select-equals-field'
      .setValue '.card-global-rule-new .input-verb-select-equals-field', 'nod'
      .waitForVisible '.card-global-rule-new .select-field > .dropdown-menu', 1000
      .click ".card-global-rule-new .select-field > .dropdown-menu > li > a"
      .then -> done()

    it 'sets the select value', ( done )->
      client
      .waitForExist '.card-global-rule-new .input-verb-select-equals-values'
      .setValue '.card-global-rule-new .input-verb-select-equals-values', 'a node equals this'
      .then -> done()

    it 'adds an action', ( done )->
      client
      .waitForExist '.card-global-rule-new .action-operator > input'
      .click '.card-global-rule-new .action-operator > input'
      .setValue '.card-global-rule-new .action-operator > input', 'se'
      .waitForVisible '.card-global-rule-new .action-operator > .dropdown-menu', 1000
      .click ".card-global-rule-new .action-operator > .dropdown-menu > li > a"
      .then -> done()

    it 'sets the set value', ( done )->
      client
      .waitForExist '.card-global-rule-new .action-field'
      .setValue '.card-global-rule-new .action-field > input', 'node'
      .then -> done()

    it 'sets the set value', ( done )->
      client
      .waitForExist '.card-global-rule-new .input-verb-select-equals-values'
      .setValue '.card-global-rule-new .action-value > input', 'a node equals this'
      .then -> done()

    it 'saves the new rule', ( done )->
      client.click '.card-global-rule-new .button-save'
      .waitUntil ->
        this.elements 'ul.rule-set .card-global-rule'
        .then ( rules )->
          debug 'rules', rules.value.length
          rules.value.length is 5
      , 2020, 100
      .then -> done()


  describe 'Deploy Rule', ->

    it 'shows the deploy ui', ( done )->
      client
      .waitForVisible '.card-rules-not-saved'
      .elements '.card-rules-not-saved'
      .then ( deploys )->
        deploys.value.forEach ( deploy )->
          debug 'deploy', deploy
          client.elementIdDisplayed deploy.ELEMENT
          .then ( res )->
            debug 'res', res
            if res.value is true
              client.elementIdClick deploy.ELEMENT
              .then ( click )->
                debug 'click', click
      .then done

    xit 'hides the deploy ui', ->
      client.isVisible '.card-rules-not-saved .btn-success'
      .then ( visible )->
        expect( visible ).to.equal false
        done()

    xit 'refreshed the same', ->
      client.waitUntil ->
        this.elements 'ul.rule-set .card-global-rule'
        .then ( rules )->
          rules.value.length is 5
      , 2020, 100
      .then -> done()


  xdescribe 'Delete Rule', ->

    it 'shows the context menu', ->

    it 'deletes the rules', ->

    it 'removes the rule', ->

    it 'stays gone on refresh', ->

    it 'deplots the delete', ->

    it 'rule stays gone', ->

    it 'stays gone on refresh'


# Clean up cookies for the next test/run
after (done) ->
  return done() unless client
  client.end done
