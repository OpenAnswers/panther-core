
debug = require( 'debug' )( 'oa:test:unit:agents' )
{ expect } = require '../mocha_helpers'

# npm
path = require 'path'

# oa

# Test setup
{Agents} = require '../../src'
{Event} = require '../../src'

# Onto the tests

# Test event setup
test_messages =
  simple1:
    severity: 3
    node: 'thahost'
    summary: 'themessage\n'
    tag: 'thedaemon'


describe 'Agents', ->

  it 'has a types object', ->
    expect( Agents.types ).to.be.an 'object'

  it 'has all the types', ->
    expect( Agents.types.graylog ).to.be.an 'function'
    expect( Agents.types.syslogd ).to.be.an 'function'
    expect( Agents.types.generic ).to.be.an 'function'
    expect( Agents.types.http ).to.be.an 'function'


  describe 'Generates', ->

    # Use the same rules instance for all the tests
    the_agent = null

    before ->
      # Load the rules from the yaml
      the_agent = Agents.generate {
        type: 'generic'
        field_map:
          whatever: 'whatever'
        field_transform:
          a_field_name: 'to_upper_case'
        identifier: "{node}:{severity}:{summary}"
        rules: [
            name: 1
            match:
              a_field: 'testing'
            discard: true
          ,
            name: 2
            equals:
              b_field: 'exact'
            set:
              c_field: 'someothervalue'
          ]
      }

    it 'has a field map', ->
      expect( the_agent.field_map() ).to.be.a 'object'

    it 'has a identifier map', ->
      expect( the_agent.identifier() ).to.be.a 'string'

    it 'has a field_transform map', ->
      expect( the_agent.field_transform() ).to.be.a 'object'

    it 'can run', ->
      ev = new Event
      ev.input = test_messages.simple1
      new_ev = the_agent.run ev

      expect( new_ev.get 'severity' ).to.equal 3
