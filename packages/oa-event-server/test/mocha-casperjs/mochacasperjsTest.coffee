#
# Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 


system = require 'system'


# needs some more with in ClientUtils (__utils__)
casper.rightClick = ->
  "use strict"
  @checkStarted()
  success = @mouseEvent('mousedown', selector) and
    @mouseEvent('mouseup', selector) and
    @mouseEvent('rightclick', selector)
  @evaluate (selector)->
    element = __utils__.findOne(selector)
    if element then element.focus()
  , selector
  @emit('rightclick', selector)
  success

casper.rightClickLabel = (label, tag)->
  "use strict"
  @checkStarted()
  tag = tag or "*"
  escapedLabel = utils.quoteXPathAttributeString(label)
  selector = selectXPath f('//%s[text()=%s]', tag, escapedLabel)
  @rightClick(selector)



port = system.env.PORT ? 4002
host = system.env.HOST ? 'localhost'
url  = system.env.URL  ? "http://#{host}:#{port}"



describe 'mocha functional testing console', ->

  # Get access to the actual response everywhere.
  # When you make a new request with `thenOpen`
  #  you need to have the call back to overwrite this
  current_response = null

  # Setup a single `start` for all tests to follow on from
  # Bail quickly if doesn't return a 200
  before (done) ->
    casper.start "#{url}/", (response) ->
      current_response = response
      expect( current_response.status ).to.equal 200
      done()
      
      


# Basic response testing
# ======

  describe 'Response', ->

    # Debug
    #console.log "response:", current_response

    it 'should have a content-type', (done)->
      expect( current_response.contentType ).to.equal 'text/html; charset=utf-8'
      done()

    it 'should have headers', (done)->
      expect( current_response.headers ).to.exist
      done()

    it 'should have header get', (done)->
      expect( current_response.headers.get ).to.exist
      done()


    # ### Specific header testing
    describe 'Headers', ->

      it 'should have a content-type header', (done) ->
        expect( current_response.headers.get('Content-Type') )
          .to.equal 'text/html; charset=utf-8'
        done()


    describe 'Socket.io Javascript ', ->

      before (done) ->
        casper.thenOpen "#{url}/socket.io/socket.io.js", (response) ->
          current_response = response
          done()

      it 'should return javascript', (done) ->
        expect( current_response.headers.get('Content-Type') )
          .to.equal 'application/javascript'
        done()


    describe "login page", ->

      before (done) ->
        casper.thenOpen "#{url}/logins", (response) ->
          current_response = response
          done()

      it 'has some forms', (done) ->
        "form[action='logins']".should.exist
        "form input[type='username']".should.exist
        "form input[type='password']".should.exist
        done()

  
  # Anything needing authentication
  # ===============================
  xdescribe 'Logged in', ->

    before (done) ->
      casper.thenOpen "#{url}/logins", (response) ->
        current_response = response

      # Get the login page
      casper.then ->
        casper.currentHTTPStatus.should.equal 200
        "form[action='logins']".should.exist
        auth =
          username: "test"
          password: "test"

        @fill "form[action='logins']", auth, true

      # Make sure auth worked
      # casper.thenOpen "#{url}/extconsoles", (response) ->
      #   current_response = response

      casper.then ->
        @waitForSelector 'body.x-body'

      casper.then ->
        'OAmon Event Console'.should.matchTitle
      
      # Wait for extjs to populate
      casper.then ->
        #@waitForSelector 'div.x-container', ->
        @waitForSelector 'div#gridview-1037', ->
          done()


    describe 'with the default view', ->

      it 'should find the syslogd heartbeat', (done)->
        casper.then ->
          @waitForSelector 'div.x-grid-cell-inner', ->
            'div.x-grid-cell-inner'.should.have.text /Agent syslogd is alive/
            done()


    describe 'javascript ejs (AlertList.js)', ->

      before (done) ->
        casper.thenOpen "#{url}/oaec/view/AlertList.js", (response) ->
          current_response = response
          done()

      it 'should return javascript', (done) ->
        expect( current_response.headers.get('Content-Type') )
          .to.equal 'application/javascript; charset=utf-8'
        done()


    # describe 'severity css', ->

    #   content = ''

    #   # For some reason this always return the previous tests page
    #   # content
    #   before (done) ->
    #     casper.thenOpen "#{url}/css/severity.css", (response) ->
    #       current_response = response
    #     casper.waitForText 'tr.severity', ->
    #       content = @getPageContent()
    #       done()

    #   xit 'should return css content type', (done) ->
    #     expect( current_response.headers.get('Content-Type') )
    #       .to.equal 'text/css; charset=utf-8'
    #     expect( content ).to.match /tr.severity/
    #     done()

