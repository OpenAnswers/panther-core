#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

io = require('socket.io-client')
debug = require('debug')('oa:event:montiors:test')
moment = require('moment')
socket = null
{ expect } = require '../mocha_helpers'

before ( done )->
  debug 'connecting socket'
  socket = io.connect 'http://localhost:1503',
    transports: [ 'websocket' ],
    'connect timeout': 20
    'try multiple transports': false
    reconnect: true
    reconnectionDelay: 1000
    'reconnection limit': 5 * 1000
    reconnectionAttempts: 0

  socket.on 'connect', ->
    debug 'sio connected'
    done()

  socket.on 'connect_error', ( err )->
    console.error 'sio connect_error', err
    done(err)
  
  socket.on 'connect_timeout', ( err )-> 
    console.error 'sio connect_timeout', err
    done(err)
  
  socket.on 'event', ( data )->
    debug 'sio got server event', data
  
  #socket.on 'disconnect', ()-> 
  #  console.log 'sio oh no'


describe 'Socket Events', ->

  now = moment()

  syslog_raw =
    originalMessage: "<31>#{now.format('MMM ddd H:mm:ss')}Oct 24 22:39:25 mhmbpror.local process[95]: raw syslog event testing\n"
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
    message: 'process[95]: raw syslog event testinga\n'

  xit 'Sends an event and gets a callback response', ( done )->
    socket.emit 'raw_event', syslog_raw, ( err, result )->
      return done(err) if err
      debug 'result', result
      expect( result ).to.be.a 'object'
      expect( result.message ).to.be.a 'string'
      expect( result.event ).to.be.a 'object'
      expect( result.event.id ).to.be.a 'string'
      done()

  xit 'Sends an event and gets a callback response', ( done )->
    socket.emit 'raw_event', syslog_raw, ( err, result )->
      return done(err) if err
      debug 'result', result
      expect( result ).to.be.a 'object'
      expect( result.message ).to.be.a 'string'
      expect( result.event ).to.be.a 'object'
      expect( result.event.id ).to.be.a 'string'
      done()

  xit 'Sends an event and gets a callback response', ( done )->
    socket.emit 'raw_event', syslog_raw, ( err, result )->
      return done(err) if err
      debug 'result', result
      expect( result ).to.be.a 'object'
      expect( result.message ).to.be.a 'string'
      expect( result.event ).to.be.a 'object'
      expect( result.event.id ).to.be.a 'string'
      done()


after ->
  socket.disconnect()