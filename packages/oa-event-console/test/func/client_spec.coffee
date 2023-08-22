#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# Functional Client tests

# Makes real requsts to an internally  booted application
# Requires a user and severities to be setup in the test database first

#    bin/setup_user.coffee --config test/fixture/config.test.yml \
#      --user test --password test --group admin \
#      --email test@openanswer.co.uk

#    bin/setup_user.coffee --config test/fixture/config.test.yml \
#      --user testuser --password testuser \
#      --email test@openanswer.co.uk
   
#    bin/setup_severity.coffee --config test/fixture/config.test.yml


debug    = require( 'debug' )( 'oa:test:func:client' )

{ expect, request, Web, _ } = require '../mocha_helpers'

# Test setup
io  = require './socketio'
web = Web.from_env_or_default()
process.env.NODE_ENV = 'test'


describe 'Client request to', ->

  app = null

  before ( done )->
    @timeout 9000
    app = Web.boot_complete_app ->
      config = require('../../lib/config').get_instance()
      done()


  describe 'the status module', ->

    it 'should return a "start" time', (done) ->
      web.get_json "/status/time/start", done, (res, json) ->
        expect( json )
        .to.have.property( 'start' )
        .and.to.be.a( 'number' )
        .and.to.match( /\d{8,}/ )
        done()

    it 'should return an "update" time', (done) ->
      web.get_json "/status/time/update", done, (res, json) ->
        expect( json )
        .to.have.property( 'update' )
        .and.to.be.a( 'number' )
        .and.to.match( /\d{8,}/ )
        done()

    it 'should return a "now" time', (done) ->
      web.get_json "/status/time/now", done, (res, json) ->
        expect( json )
        .to.have.property( 'now' )
        .and.to.be.a( 'number' )
        .and.to.match( /\d{8,}/ )
        done()


  describe 'the generic site', (done) ->

    it 'should get the initial page /', (done) ->
      @timeout 8000
      request web.url, done, ( response, body) ->
        expect( error ).to.be.null
        expect( response.statusCode ).to.equal 200
        done()

    it 'should get the initial page /', (done) ->
      @timeout 8000
      request web.url, done, ( response, body) ->
        expect( error ).to.be.null
        expect( response.statusCode ).to.equal 200
        done()

    it 'should render the global css', (done) ->
      web.get "/assets/css/global.css", done, ( response, body) ->
        expect( body ).to.match  /\.input-group-rules/
        expect( body ).to.match  /@media print \{/
        done()

    it 'should render the global css', (done) ->
      web.get "/assets/css/global.css", done, ( response, body) ->
        expect( body ).to.match  /\.input-group-rules/
        expect( body ).to.match  /@media print \{/
        done()


  describe 'authentication', (done) ->

    it 'should succesfully authenticate', (done)->
      @timeout 4000
      web.option 'followRedirect', false
      formdata =
        username: 'test'
        password: 'test'
      web.post_code "/login", 302, formdata, done, ( response, body )->
        expect( response.statusCode ).to.equal 302
        done()


  describe 'the authenticated pages', (done)->

    # Authenicate once for all of them
    before (done)->
      @timeout 4000
      web.option 'followRedirect', true
      debug 'creating cookie jar', web.add_jar()
      formdata =
        username: 'test'
        password: 'test'
      web.post_code "/login", 302, formdata, done, ( response, body )->
        expect( response.statusCode ).to.equal 302
        done()


    describe '/admin', (done) ->

      it 'should return an admin page', (done) ->
        web.get "/admin", done, ( response, body) ->
          expect( body ).to.match /admin/
          done()


    describe '/rules', (done) ->

      it 'should return a rules page', (done) ->
        web.get "/rules", done, ( response, body) ->
          expect( body ).to.match /Rules/
          done()

      it '/globals should return a global rules page', (done) ->
        @timeout 5000
        web.get "/rules/globals", done, ( response, body) ->
          expect( body ).to.match /event-rules/
          done()

      it '/globals should return a global rules page', (done) ->
        @timeout 5000
        web.get "/rules/globals", done, ( response, body) ->
          expect( body ).to.match /event-rules/
          done()

      it '/groups should return a group rules page', (done) ->
        web.get "/rules/groups", done, ( response, body) ->
          expect( body ).to.match /Group Rules/
          done()


    describe '/console', (done) ->

      it 'should return a w2ui grid div', (done) ->
        web.get "/console/", done, ( response, body) ->
          expect( body ).to.match /div id="event_grid"/
          done()

      it 'should render the console css asset', (done) ->
        web.get "/assets/css/console.css", done, ( res, body) ->
          expect( body ).to.match /.unacknowledged\s*\{/
          expect( body ).to.match /.acknowledged\s*\{/
          done()


  describe 'socketio', ->

    socket = null

    it 'should get the /socket.io/ mount', ( done )->
      request_opts =
        url: "#{web.url}/socket.io/"
        jar: web.option('jar')
      request.get request_opts, ( error, response, body ) ->
        expect( error ).to.be.null
        expect( response.statusCode ).to.equal 400
        expect( body ).to.equal '{"code":0,"message":"Transport unknown"}'
        done()

    # Can't test an auth sesion with cookies
    # Need to do some token auth
    # or provide seperate auth and unauth namespaces

    it 'should connect', ( done )->
      debug 'cookies', web.option('jar')
      session_id = Web.cookie_to_session_id( 'this_is_the_test_secret', 'panther.sid', web.option('jar') )
      expect(session_id).to.not.be.falsey
      expect(session_id).to.be.a 'string'
      expect(session_id).to.not.match /^s:/

      debug 'session_id', session_id
      socket = io.connect "#{web.url}", { query: "session_id=#{session_id}" }
      
      socket.on 'error', ( error )->
        debug 'socket error'
        done( error )
      
      debug 'socket.connected'
      expect( socket.connected ).to.equal true
      done()

    it 'should emit and recieve the test', ( done )->
      socket.on 'test_response', ( data )->
        expect( data ).to.have.property 'request'
        expect( data.request ).to.eql 'gimme'
        #socket.removeListener message
        socket.off 'test_response'
        done()
      socket.emit 'test_request', 'gimme'

      


      
