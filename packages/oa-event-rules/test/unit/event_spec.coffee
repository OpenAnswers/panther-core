
# logging
debug      = require( 'debug' )( 'oa:test:unit:rules:action' )

# helpers
{ expect } = require '../mocha_helpers'

# Test setup
{ Event } = require '../../lib/event'




describe 'Event', ->

  it 'can instantiate an object', ->
    ev = new Event
    expect( ev ).to.be.an.instanceof Event


  describe 'Instance', ->

    ev = new Event

    it 'can set a value', ->
      ev.set 'summary', 'value'
      expect( ev.copy.summary ).to.equal 'value'

    it 'can get a value', ->
      summary = ev.get 'summary'
      expect( summary ).to.equal 'value'

    it 'checks a field exists', ->
      summmary_existence = ev.exists 'summary'
      expect( summmary_existence ).to.equal true

    it 'sets the event to discard', ->
      discard = ev.discard()
      expect( ev.discard_id ).to.equal true

    it 'generates a string representation', ->
      expect( "#{ev}" ).to.equal 'value'

    it 'add a match object', ->
      match_res = ev.match "test".match(/test/)
      expect( ev._match ).to.eql match_res

    it 'retrieve a match object', ->
      expect( ev.match() ).to.eql "test".match(/test/)

    it 'can set an input value', ->
      ev.set_input 'summary', 'value'
      expect( ev.input.summary ).to.eql 'value'

    it 'can get an input value', ->
      summary = ev.get_input 'summary'
      expect( summary ).to.equal 'value'

    describe 'identifier', ->

      describe 'from constructor', ->

        beforeEach ->
          ev = new Event
          ev.set 'summary', 'value'

        it 'should fall back to the default identifier', ->
          ev.populate_identifier()
          expect( ev.get 'identifier' ).to.equal '17232047023865718785'

        it 'should user input when available', ->
          ev.set_input 'identifier', 'w-{summary}-w'
          ev.populate_identifier()
          expect( ev.get 'identifier' ).to.equal '16886348280168576260'

        it 'should always use the set value in copy', ->
          ev.set 'identifier', 'wakkawakka-{summary}'
          ev.populate_identifier()
          expect( ev.get 'identifier' ).to.equal '9508471824931390859'

      describe 'from .generate', ->

        beforeEach ->
          ev = Event.generate { summary: 'value' }

        it 'should fall back to the default', ->
          ev.populate_identifier()
          expect( ev.get 'identifier' ).to.equal '17232047023865718785'

        it 'should user input when available', ->
          ev.set_input 'identifier', 'w-{summary}-w'
          ev.populate_identifier()
          expect( ev.get 'identifier' ).to.equal '16886348280168576260'

        it 'should always use the set value in copy', ->
          ev.set 'identifier', 'wakkawakka-{summary}'
          ev.populate_identifier()
          expect( ev.get 'identifier' ).to.equal '9508471824931390859'


  describe 'generate', ->

    it 'can generate an object', ->
      ev = Event.generate 
        summary: 'test'
      expect( ev ).to.be.an.instanceof Event
