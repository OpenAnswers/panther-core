#
# Copyright (C) 2015, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 

mocha   = require 'mocha'
expect  = require( 'chai' ).expect
debug   = require('debug') 'oa:test:tinycache:tinycacheitem'

{TinyCacheItem} = require '../../lib/tiny_cache'


describe 'TinyCacheItem', ->

  describe 'simple instance', ->

    cache = null
    now = null

    before ->
      now = Date.now()
      cache = new TinyCacheItem( 'that' )

    it 'should the _value property', ->
      expect( cache._value ).to.eql 'that'

    it 'should be created after now', ->
      expect( cache.created ).to.be.gte now

    it 'should have the same accessed and created times', ->
      expect( cache.accessed ).to.eql cache.created

    it 'should have the value', ->
      expect( cache.value() ).to.eql 'that'

    it 'should default to a timeout of 60', ->
      expect( cache.timeout ).to.eql 60

    it 'should have an expirey time 60s in the future', ->
      expect( cache.expires ).to.be.gte now+(60*1000)

    it 'shouldnt be expired', ->
      expect( cache.expired() ).to.eql false

  xdescribe 'expiry update', ->

    cache = null
    now = null
    accessed = null
    expires = null

    before ->
      now = Date.now()
      cache = new TinyCacheItem( 'that' )
      accessed = cache.accessed
      expires = cache.expires

    it 'updates the expires value', ->
      accessed = cache.accessed
      expires = cache.expires
      new TinyCacheItem('what',60) for i in [1..5000]
      expect( cache.value_expirey() ).to.eql 'that'
      expect( cache.accessed ).to.be.gt accessed
      expect( cache.expires ).to.be.gt expires

