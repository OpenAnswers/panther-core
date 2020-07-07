
debug   = require( 'debug' )( 'oa:test:unit:agent' )
{ expect } = require '../mocha_helpers'

# npm
path    = require 'path'

# oa

# Test setup
{ AgentGeneric }      = require '../../lib/agent_generic'
{ Event }       = require '../../lib/event'
{ RuleSet }     = require '../../lib/rule_set'


# Test event setup
test_messages =

  simple1:
    severity: 3
    node: 'thahost'
    summary: 'themessage\n'
    tag: 'thedaemon'

  real1:
    severity: 2
    node: 'matt-laptop1-wifi.openans.co.uk'
    summary: 'no system signature for unsigned /usr/local/Cellar/node/0.12.2_1/bin/node[96271]\n'
    daemon: 'taskgated'
    daemon_pid: '94'


# Onto the tests

describe 'AgentGeneric', ->


  it 'loads rules into AgentGeneric', ->
    the_agent = new AgentGeneric
      path: path.join __dirname, 'agent_generic_sample.yml'

    expect( the_agent ).to.be.an.instanceof AgentGeneric


  describe 'Loaded YAML', ->

    # Use the same rules instance for all the tests
    the_agent = null

    generic_event = new Event
    generic_event.input =
      severity: 1
      fieldname_that_goes_lower: 'TESTSHOULDBELOWER'
      fieldname_that_goes_upper: 'testshouldbeupper'
      facility: 'wakka'
      message: 'message!!!!!!'

    before ->
      # Load the rules from the yaml
      the_agent = new AgentGeneric
        path: path.join __dirname, 'agent_generic_sample.yml'

    it 'has a field map', ->
      expect( the_agent.field_map() ).to.be.an 'object'

    it 'has a identifier map', ->
      expect( the_agent.identifier() ).to.be.a 'string'

    it 'has a field_transform map', ->
      expect( the_agent.field_transform() ).to.be.a 'object'

    it 'doesnt map a severity, passes it through', ->
      ev = the_agent.run( generic_event )
      expect( generic_event.get 'severity' ).to.equal 1

    it 'maps a field', ->
      ev = the_agent.run( generic_event )
      expect( generic_event.get 'summary' ).to.equal generic_event.message

    it 'attached an identifier', ->
      ev = the_agent.run( generic_event )
      expect( generic_event.get 'identifier' ).to.equal '{node}:{severity}:{summary}'

    it 'transforms fields', ->
      ev = the_agent.run( generic_event )
      expect( generic_event.get 'fieldname_that_goes_lower' ).to.equal 'testshouldbelower'
      expect( generic_event.get 'fieldname_that_goes_upper' ).to.equal 'TESTSHOULDBEUPPER'


  describe 'Generates', ->

    # Use the same rules instance for all the tests
    the_agent = null

    before ->
      # Load the rules from the yaml
      the_agent = AgentGeneric.generate {
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


    it 'can use a input rule 1', ->
      ev = Event.generate
        a_field: 'testing'
      ev.input.severity = 1
      new_ev = the_agent.run ev

      expect( new_ev.discarded() ).to.equal true

    it 'can use a input rule 2', ->
      ev = Event.generate
        b_field: 'exact'
      ev.input.severity = 1

      new_ev = the_agent.run ev

      expect( new_ev.get 'c_field' ).to.equal 'someothervalue'
