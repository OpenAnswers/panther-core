#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 

mocha   = require 'mocha'
expect  = require( 'chai' ).expect
debug   = require('debug') 'oa:test:tinycache:tinycache'

#{TinyCache} = require '../../lib/tiny_cache'
TinyCache = require('../../lib/tiny_cache').TinyCache


describe 'TinyCache', ->

  it 'should set, get and del a value', ->
    cache = new TinyCache()
    expect( cache.set 'what', 'that' ).to.eql 'that'
    expect( cache.get 'what' ).to.eql 'that'
    expect( cache.del 'what' ).to.eql true
    expect( cache.get 'what' ).to.eql false

  it 'doesnt set a falsey value', ->
    cache = new TinyCache()
    fn = ->
      cache.set 'what', false
    expect( fn ).to.throw /Can't store falsey values/
  
  it 'deletes an entry', ->
    cache = new TinyCache()
    cache.set 'what', 1
    expect( cache.del 'what' ).to.eql true

  it 'can\'t delete a non existant entry', ->
    cache = new TinyCache()
    expect( cache.del 'what' ).to.eql false

  it 'expires entries in a non background expire cache', (done)->
    cache = new TinyCache timeout: 0.1
    expect( cache.set 'what', 'that' ).to.eql 'that'
    expect( cache.get 'what' ).to.eql 'that'
    setTimeout ->
      expect( cache.get 'what' ).to.eql false
      done()
    , 150

  describe 'does expire entries in a non background expire cache', ->
    
    cache = null

    before ->
      cache = new TinyCache timeout: 0.1, limit: 4
      for i in [1..4]
        cache.set "what#{i}", "that#{i}"
      
    it 'has what1', ->
      expect( cache.get 'what4' ).to.eql 'that4'

    it 'expires', ( done )->
      setTimeout ->
        expect( cache.get 'what1' ).to.be.false
        cache.expire()
        done()
      , 150

    it 'has no entries', ->
      expect( Array.from(cache.store.entries()) ).to.eql []

    it 'has a size of 0', ->
      expect( cache.store.size ).to.equal 0

    it 'has a total of 0', ->
      expect( cache.total() ).to.equal 0
    

  it 'should run the expirey_cb callback function during expire', (done)->
    cache = new TinyCache timeout: 0.1, limit: 5, bg_expire: 0.15, expirey_cb:(err)->
      expect(err).to.be.null
      cache.cleanup()
      done()
    cache.set "what1", "that1"
    cache.set "what2", "that2"
    cache.set "what3", "that3"

  it 'should run the force_expirey callback when force expire runs', (done)->
    cache = new TinyCache timeout: 10, limit: 1, force_expirey_cb:(err)->
      expect(err).to.be.null
      done()
    cache.set "what1", "that1"
    cache.set "what2", "that2"
    cache.set "what3", "that3"

  it 'should run a background expire when defined', (done)->
    cache = new TinyCache timeout: 0.05, limit: 2, bg_expire: 0.1
    for i in [1..3]
      cache.set "what#{i}", "that#{i}"
    setTimeout ->
      expect( cache.total() ).to.equal 0
      cache.cleanup()
      done()
    , 150

  it 'should force an expire', (done)->
    cache = new TinyCache timeout: 1, limit: 5
    for i in [1..8]
      cache.set "what#{i}", "that#{i}"
    cache.expire_force()
    expect( cache.total() ).to.equal 4
    done()

  it 'drops the cache', ->
    cache = new TinyCache timeout: 100, limit: 100
    cache.set "what", "that"
    expect( cache.get 'what' ).to.eql 'that'
    cache.drop()
    expect( cache.get 'what' ).to.eql false
