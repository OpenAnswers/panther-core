#
# Copyright (C) 2015, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 

# logging
debug      = require( 'debug' )( 'oa:helpers:test:objhash' )

# Test setup
mocha   = require 'mocha'
expect  = require( 'chai' ).expect
objectHash = require '../src/objhash'



# This needs something to test collisions.


describe 'ObjHash', ->


  describe 'boolean', ->

    it 'creates two equal bools', (done)->
      expect( objectHash( true ) ).to.equal objectHash( true )
      done()

    it 'creates two unequal bools', (done)->
      expect( objectHash( true ) ).to.not.equal objectHash( false )
      done()


  describe 'null', ->

    it 'creates two equal null', (done)->
      expect( objectHash( null ) ).to.equal objectHash( null )
      done()

    it 'doesnt match something else', (done)->
      expect( objectHash( null ) ).to.not.equal objectHash( undefined )
      done()


  describe 'numbers', ->

    it 'matches two equal numbers', (done)->
      expect( objectHash( 1 ) ).to.equal objectHash( 1 )
      done()

    it 'doesn\'t match different numbers', (done)->
      expect( objectHash( 1 ) ).to.not.equal objectHash( 2 )
      done()


  describe 'regexp', ->

    it 'matches two equal regexps', (done)->
      expect( objectHash( /a/ ) ).to.equal objectHash( /a/ )
      done()

    it 'doesn\'t match different regexps', (done)->
      expect( objectHash( /a/ ) ).to.not.equal objectHash( /a/i )
      done()

    it 'doesn\'t match different regexps', (done)->
      expect( objectHash( /^a/ ) ).to.not.equal objectHash( /a/ )
      done()


  describe 'date', ->

    it 'matches two equal dates', (done)->
      ts = Date.now()
      first  = objectHash( new Date(ts) )
      second = objectHash( new Date(ts) )
      expect( first ).to.equal second
      done()

    it 'doesn\'t match two unequal dates', (done)->
      first  = new Date( Date.now() )
      second = new Date( Date.now()-1 )
      expect( first ).to.not.equal second
      expect( objectHash first ).to.not.equal objectHash(second)
      done()


  describe 'string', ->

    it 'matches two equal strings', (done)->
      first  = objectHash( 'string' )
      second = objectHash( 'string' )
      expect( first ).to.equal second
      done()

    it 'doesn\'t match two unequal string', (done)->
      first  = objectHash( 'string' )
      second = objectHash( 'sstring' )
      expect( first ).to.not.equal second
      done()


  describe 'function', ->

    it 'creates two equal functions', (done)->
      first = -> 'yep'
      second = -> 'yep'
      expect( objectHash(first) ).to.equal objectHash(second)
      done()

    it 'creates two unequal functiond', (done)->
      first = -> 'yep'
      second = -> 'nope'
      expect( objectHash(first) ).to.not.equal objectHash(second)
      done()


  describe 'arrays', ->

    it 'matches two simple array', (done)->
      first = [1]
      second = [1]
      expect( objectHash(first) ).to.equal objectHash(second)
      done()

    it 'doesn\'t match two simple arrays', (done)->
      first = [1]
      second = [2]
      expect( objectHash(first) ).to.not.equal objectHash(second)
      done()

    it 'matches two more complex objects', (done)->
      first  = objectHash [ 1, 2, 3 ]
      second = objectHash [ 1, 2, 3 ]
      expect( first ).to.equal second
      done()
 
    it 'matches to nested arrays', ( done )->
      first = objectHash [ 1, [], 3]
      second = objectHash [1, [], 3]
      expect( first ).to.equal second
      done()

    it 'doesn\'t matches to nested arrays', ( done )->
      first = objectHash [ 1, [], 3]
      second = objectHash [1, 3, []]
      expect( first ).to.not.equal second
      done()



  describe 'objects', ->

    it 'matches two simple objects', (done)->
      expect( objectHash( set: 1 ) ).to.equal objectHash( set: 1 )
      done()

    it 'doesn\'t match two simeple objects', (done)->
      expect( objectHash( set: 1 ) ).to.not.equal objectHash( set: 2 )
      done()

    it 'matches two more complex objects', (done)->
      first  = objectHash { set:1, met:2 }
      second = objectHash { met:2, set:1 }
      expect( first ).to.equal second
      done()


  describe 'complex', ->

    it 'matches two ordered objects', (done)->
      first  = { field: '$set': { field: 1, other: null, undef: undefined } }
      second = { field: '$set': { field: 1, other: null, undef: undefined } }
      expect( objectHash(first) ).to.equal objectHash(second)
      done()

    it 'matches two unordered objects', (done)->
      first  =
        field: '$set': { field: 1, other: 'two' }
        mope:  '$set': { field: 1, other: 'two' }
      second =
        mope:  '$set': { other: 'two', field: 1 }
        field: '$set': { field: 1,     other: 'two' }
      expect( objectHash(first) ).to.equal objectHash(second)
      done()

    it 'doesn\t match two nested unequal objects', (done)->
      first  =
        field: '$set': { field: 'one', other: [ null, 5, undefined ] }
      second =
        field: '$set': { field: 'one', other: [ null, 4, undefined ] }
      expect( objectHash(first) ).to.not.equal objectHash(second)
      done()
 

  describe  'consistancy', ->
    
    it 'matches a previously generated hash', ->
      test = objectHash({one:1,two:"two",three:{3:3},four:null,five:[1,2,"3"],six:true})
      expect( test ).to.equal "b5fc6d6f7fd6739b5e985d598ed318f76cee87a5"

