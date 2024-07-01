#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

debug    = require( 'debug' )( 'oa:test:func:event_rules' )

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

describe 'Event Rules socketio messages', ->

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
      session_id = Web.cookie_to_session_id( 'this_is_the_test_secret', 'panther.sid', web.option('jar') )
      expect(session_id).to.not.be.falsey
      expect(session_id).to.be.a 'string'
      expect(session_id).to.not.match /^s:/

      debug 'session_id', session_id
      socket = io.connect "#{web.url}", { query: "session_id=#{session_id}", forceNew: true }

      debug 'socket.connected'
      expect( socket.connected ).to.equal true
      done()

      socket.on 'error', ( error )->
        debug 'socket error'
        done( error )

    it 'should emit and recieve the test', ( done )->
      socket.on 'test_response', ( data )->
        expect( data ).to.have.property 'request'
        expect( data.request ).to.eql 'gimme'
        #socket.removeListener message
        socket.off 'test_response'
        done()
      socket.emit 'test_request', 'gimme'


  describe 'socketio messages', ->

    describe 'globals', ->
 
      default_msg = { type: 'server', sub_type:'globals' }

      beforeEach ->
        # This needed to be added as somehow mocha block subsequent emits on the socket
        # If an assesrtion error was thrown 
        socket = io.connect "#{web.url}", { query: "session_id=#{session_id}", 'force new connection': true }

      xit 'seems to block when an assertion is thrown mid callback on a reused socket', ( done )->
        socket.removeListener 'test_response'
        socket.emit 'testingasdfds'
        socket.on 'test_response', ( dat )->
          expect( true ).to.equal false
          done()
        socket.emit 'test_request', 'gimme'

      it 'can retrieve the server rules', ( done )->
        socket.emit 'event_rules::read', default_msg, ( err, res )->
          if err then return done(new Error err)
          expect( res ).to.have.keys 'globals', 'groups', 'hash', 'metadata'
          expect( res.globals ).to.have.keys 'rules'
          expect( res.globals.rule ).to.be.an.array
          done()

      it 'can check the edited status', ( done )->
        socket.emit 'event_rules::edited', default_msg, ( err, res )->
          if err
            console.log err
            return done(new Error err)
          expect( res ).to.have.keys 'edited'
          expect( res.edited ).to.equal false
          done()

      it 'updates an existing global rule', ( done )->
        data =
          index: 0
          rule:
            name: 'update'
            field_exists: 'update'
            set: update: 'update'
        msg = _.defaults { data: data }, default_msg
        socket.emit 'event_rules::rule::update', msg, ( err, res )->
          if err
            console.error err
            return done(new Error err)
          expect( res ).to.contain.keys 'message', 'status', 'sub_type', 'type'
          expect( res.status ).to.equal 'success'
          expect( config.rules.server.globals.rules[0].yaml ).to.eql data.rule
          done()

      it 'can discard a change back to file defaults', ( done )->
        socket.emit 'event_rules::discard_changes', default_msg, ( err, res )->
          if err
            console.error err
            return done(new Error err)
          expect( res ).to.contain.keys 'message', 'status', 'sub_type', 'type'
          expect( res.status ).to.equal 'success'
          expect( config.rules.server.globals.rules[0].yaml.name ).to.eql '1 Testing Rule'
          done()
 
# event_rules::rule::create
      it 'can create a global rule', ( done )->
        data =
          rule:
            name: 'test'
            less_than:
              severity: 4
            discard: true
        msg = _.defaults data:data, default_msg
        
        socket.emit 'event_rules::rule::create', msg, ( err, res )->
          if err then return done(new Error err)
          expect( res ).to.contain.keys 'status','message','type','sub_type'
          #,'index','hash'
          expect( res.status ).to.equal 'success'
          done()

# event_rules::rule::delete
      it 'can delete a global rule', ( done )->
        msg = _.defaults { data: index: 0 }, default_msg
        socket.emit 'event_rules::rule::delete', msg, ( err, res )->
          if err then return done(new Error err)
          expect( res ).to.contain.keys 'index', 'status'
          expect( res.status ).to.equal 'success'
          expect( res.index ).to.equal 0
          done()


# event_rules::rule::update

      it 'can update a global rule', ( done )->
        data =
          index: 4
          rule:
            name: 'test4'
            less_than:
              severity: 44
            discard: true
        msg = _.defaults data:data, default_msg
        socket.emit 'event_rules::rule::update', msg, ( err, res )->
          if err then return done(new Error err)
          expect( res ).to.contain.keys 'status' #, 'index'
          expect( res.status ).to.equal 'success'
          done()

#event_rules::save

#event_rules::agent::update
    describe 'groups', ->
   
      default_msg = { type: 'server', sub_type: 'groups' }
      groups_obj = null
 
      it 'can retrieve the server > groups rules', ( done )->
        socket.emit 'event_rules::read', default_msg, ( err, res )->
          if err then return done(new Error err)
          expect( res ).to.have.keys 'globals', 'groups', 'hash', 'metadata'
          expect( res.groups ).to.have.keys 'Matt', 'Security', 'TestGroup', 'TestUpdateSelect', '_order'
          done()

      it 'can update a group_name', ( done )->
        data = previous_name: 'TestGroup', new_name: 'what'
        msg = _.defaults { data: data }, default_msg
        socket.emit 'event_rules::group::update_name', msg, ( err, res )->
          if err
            return done(err)
          expect( res ).to.contain.keys ['message', 'status','data']
          expect( res.status ).to.equal 'success'
          expect( res.data ).to.have.keys 'Matt', 'Security', 'what', 'TestUpdateSelect', '_order'
          done()

      it 'can update a group select', ( done )->
        rule =
          name: 'Dont pick me up'
          match:
            yesyes: 'yepyep'
          set:
            nono: 'nopenope'
        update_msg =
          group: 'TestUpdateSelect'
          data:
            index: 0
            rule: rule
        msg = _.defaults update_msg, default_msg
        socket.emit 'event_rules::group::update_select', msg, ( err, res )->
          if err
            return done(err)
          expect( res ).to.contain.keys ['message', 'status','data']
          expect( res.status ).to.equal 'success'
          expect( res.data ).to.have.keys 'rules', 'select'
          expect( res.data.select ).to.eql match: yesyes: 'yepyep'
          done()


      it 'can delete a group name', ( done )->
        data = name: 'what'
        msg = _.defaults { group: 'what', data: data }, default_msg
        socket.emit 'event_rules::group::delete', msg, ( err, res )->
          if err
            return done(err)
          expect( res ).to.contain.keys ['message', 'status','data']
          expect( res.status ).to.equal 'success'
          expect( res.data ).to.have.keys 'Matt', 'Security', 'TestUpdateSelect', '_order'
          done()


      it 'can discard a change back to file defaults', ( done )->
        socket.emit 'event_rules::discard_changes', default_msg, ( err, res )->
          if err
            console.error err
            return done(new Error err)
          expect( res ).to.contain.keys 'message', 'status', 'sub_type', 'type'
          expect( res.status ).to.equal 'success'
 
          groups_obj = config.rules.server.groups
          #expect( groups_obj.store ).to.eql {}
          expect( groups_obj.get 'TestGroup' ).to.be.ok
          expect( groups_obj.get 'what' ).to.not.be.ok
          done()

