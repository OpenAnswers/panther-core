#
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

debug    = require( 'debug' )( 'oa:test:func:events' )

{ expect, request, Web, _ } = require '../mocha_helpers'

# Test setup
io  = require './socketio'

# Create a web instance
web = Web.from_env_or_default()

# Give it a cookie jar
web.add_jar()



# Make things like logging know we are just testing
process.env.NODE_ENV = 'test'

# This doesn't mix with boot_complete_app, one or the other
#app_up    = require '../mocha_app'

describe 'Events console messages', ->

  # Allow all the tests to use the connection
  socket = null
  session_id = null
  config = null
  app = null

  before ( done )->
    @timeout 9000
    app = Web.boot_complete_app ->
      config = require('../../lib/config').get_instance()
      done()

  describe 'Authentication and Socket', (done) ->
   
    it 'should succesfully authenticate', (done)->
      @timeout 4000
      web.option 'followRedirect', false
      formdata =
        username: 'test'
        password: 'test'
      web.post_code "/login", 302, formdata, done, ( response, body )->
        expect( response.statusCode ).to.equal 302
        done()
  
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
      session_id = Web.cookie_to_session_id 'this_is_the_test_secret',
        'panther.sid', web.option('jar')
      expect(session_id).to.not.be.falsey
      expect(session_id).to.be.a 'string'
      expect(session_id).to.not.match /^s:/

      debug 'session_id', session_id
      socket = io.connect "#{web.url}", { query: "session_id=#{session_id}", forceNew: true }

      debug 'socket.connected'
      expect( socket.connected ).to.equal true
      done()

      socket.on 'disconnect', -> done('disconnected')
      socket.on 'error', ( error )-> done( error )
      socket.on 'reconnect', ( n )-> debug 'reconnect', n
      socket.on 'reconnecting', ( n )-> done 'reconnecting', n


    it 'should emit and recieve the test', ( done )->
      socket.on 'test_response', ( data )->
        expect( data ).to.have.property 'request'
        expect( data.request ).to.eql 'gimme'
        socket.off 'test_response'
        done()
      socket.emit 'test_request', 'gimme'


  describe 'socketio messages', ->

    describe 'events', ->

      before ->
        # Somehow mocha blocks subsequent emits on the socket if an
        # assertion error is thrown
        socket = io.connect "#{web.url}",
          query: "session_id=#{session_id}"
          'force new connection': true
 
      xit 'can retrieve the events', ( done )->
        socket.emit 'events::read', {}, ( err, res )->
          done(err) if err
          expect( res ).to.have.keys 'globals'
          expect( res.groups ).to.have.keys 'Matt'
          done()

      xit 'can create an event for testing', ( done )->
        socket.emit 'event::create', {}, ( err, res )->
          done(err) if err
          expect( res ).to.have.keys 'globals'
          expect( res.groups ).to.have.keys 'Matt'
          done()

      it 'can retieve a single events details', ( done )->
        data =
          id: '56d19fd8fd087bda5b3f877a'
        socket.emit 'event::details', data, ( err, res )->
          done(err) if err
          expect( res ).to.contain.keys '_id', 'summary', 'node', 'severity'
          done()

      it 'can assign an event to the test1 user', ( done )->
        data =
          user: 'test1'
          ids: [ '56d19fd8fd087bda5b3f877a']
        socket.emit 'events::assign', data, ( err, res )->
          done(err) if err
          expect( res ).to.have.keys 'data', 'status' #, 'hash'
          expect( res.data ).to.have.keys 'owner', 'ids'
          done()
