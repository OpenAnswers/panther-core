#
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

debug    = require( 'debug' )( 'oa:test:func:api' )
moment   = require 'moment'

{ expect, supertest } = require '../mocha_helpers'
{ random_string }     = require 'oa-helpers'

# Test setup
app       = null
path      = "/api/event/"
app_up    = require '../mocha_app'



before (done)->
  @timeout 5000
  app_up ( err, result )->
    return done(err) if err
    app = result
    done()


describe 'Event-From API', ->

  describe 'Syslog', ->
    id = null
    syslog_raw = null

    it 'creates an event for an /event-from/syslog/create', ( done ) ->

      str = random_string(8)
      now = moment()

      syslog_raw =
        originalMessage: "<31>#{now.format('MMM ddd H:mm:ss')}Oct 24 22:39:25 mhmbpror.local process[95]: raw syslog event testing #{str}\n"
        prival: 31
        facilityID: 3
        severityID: 4
        facility: 'daemon'
        severity: 'debug'
        type: 'RFC3164'
        #time: now.format('ddd MMM D YYYY, H:mm:ss a')
        time: now.toDate().toString()
        #Sat Oct 24 2015 22:39:25 GMT+0100 (BST)
        host: 'mhmbpror.local'
        message: "process[95]: raw syslog event testing #{str}\n"
      
      supertest(app).post "#{path}/event-from/syslog/create"
      .send syslog_raw
      .end ( err, res )->
        expect( err ).to.equal null
        expect( res.statusCode ).to.eql 200
        expect( res.body ).to.be.a 'object'
        expect( res.body ).to.contain.all.keys ['event','message']
        expect( res.body.message ).to.match /^Saved new alert: .+:raw syslog event/
        expect( res.body.event ).to.contain.all.keys ['id']
        expect( res.body.event.id ).to.be.a 'string'
        expect( res.body.event.id ).to.match /^\w{24}$/
        id = res.body.event.id
        done()


    it 'updates the event for an /event-from/syslog/create', ( done ) ->

      str = random_string(8)
      now = moment()
      
      supertest(app).post "#{path}/event-from/syslog/create"
      .send syslog_raw
      .end ( err, res )->
        expect( err ).to.equal null
        expect( res.statusCode ).to.eql 200
        expect( res.body ).to.be.a 'object'
        expect( res.body ).to.contain.all.keys ['event','message']
        expect( res.body.message ).to.match /^Updated alert: .+:raw syslog event/
        expect( res.body.event ).to.contain.all.keys ['id']
        expect( res.body.event.id ).to.be.a 'string'
        expect( res.body.event.id ).to.match /^\w{24}$/
        id = res.body.event.id
        done()

    it 'recieves the created object for an /event/read/:id', ( done )->
      supertest(app).get "#{path}/read/#{id}"
      .end ( err, res ) ->
        expect( err ).to.equal null
        expect( res.statusCode ).to.eql 200
        expect( res.body ).to.be.an 'object'
        ev = res.body.event
        expect( ev ).to.be.an 'object'
        expect( ev ).to.contain.all.keys ['id','node','severity','summary','identifier']
        expect( ev.summary ).to.match /raw syslog event testing/
        expect( ev.severity ).to.equal 2
        done()

    it 'deletes the created object /event/delete/:id', ( done )->
      supertest(app).delete "#{path}/delete/#{id}"
      .end ( err, res ) ->
        expect( err ).to.equal null
        expect( res.statusCode ).to.eql 200
        expect( res.body ).to.be.an 'object'
        expect( res.body.result ).to.be.an 'object'
        expect( res.body.result ).to.contain.all.keys ['ok','n']
        expect( res.body.result.ok ).to.eql 1
        expect( res.body.result.n ).to.eql 1
        done()


describe 'errors', ->

  xit '400 a bad event id /event', ( done )->
    supertest(app).get "#{path}/read/13413543543151"
    .end ( err, res ) ->
      expect( res.statusCode ).to.eql 400
      expect( res.type ).to.eql 'application/json'
      expect( res.body ).to.be.an 'object'
      expect( res.body ).to.contain.all.keys ['message']
      expect( res.body.message ).to.match /Invalid event id/
      done()