
debug   = require( 'debug' )( 'oa:test:unit:agent:syslog' )
{ expect } = require '../mocha_helpers'

# npm
path    = require 'path'

# oa

# Test setup
{ AgentSyslogd } = require '../../lib/agent_syslogd'
{ Event }       = require '../../lib/event'
{ RuleSet }     = require '../../lib/rule_set'


# Test event setup
test_messages =

  simple1:
    severityID: 7
    facility: 'daemon'
    host: 'thahost'
    message: 'themessage\n'
    daemon: 'thedaemon'
    daemon_pid: '666'

  real1:
    prival: 31
    facilityID: 3
    severityID: 7
    facility: 'daemon'
    severity: 'debug'
    type: 'RFC3164'
    time: 'Thu Jun 04 2015 18:10:24 GMT+0100 (BST)'
    host: 'matt-laptop1-wifi.openans.co.uk'
    message: 'no system signature for unsigned /usr/local/Cellar/node/0.12.2_1/bin/node[96271]\n'
    daemon: 'taskgated'
    daemon_pid: '94'

  structured1:
    prival: 31
    facilityID: 3
    severityID: 7
    facility: 'daemon'
    severity: 'debug'
    type: 'RFC5424'
    time: 'Thu Jun 04 2015 18:10:24 GMT+0100 (BST)'
    host: 'matt-laptop1-wifi.openans.co.uk'
    message: 'there is more in the structured data\n'
    daemon: 'taskgated'
    daemon_pid: '94'
    structuredData:
      timeQuality: 
        tzKnown: '1'
        isSynced: '1'
        syncAccuracy: '666000'
      '123messageid':
        whatever: 'what what what'
        message: 'there is more in the structured data'
        more: 'this is more'
      '456messageid':
        msgparam1: 'message param1'
      'zoo@123':
        msgparam2: 'message param2'


# Onto the tests

describe 'AgentSyslogd', ->


  it 'loads rules into AgentSyslogd', ->
    the_syslog = new AgentSyslogd
      path: path.join __dirname, 'agent_syslog_sample.yml'

    expect( the_syslog ).to.be.an.instanceof AgentSyslogd


  describe 'Loaded', ->

    # Use the same rules instance for all the tests
    the_syslog = null

    syslog_ev = new Event
    syslog_ev.input =
      severityID: 1
      fieldname_that_goes_lower: 'TESTSHOULDBELOWER'
      fieldname_that_goes_upper: 'testshouldbeupper'
      facility: 'wakka'
      message: 'message!!!!!!'

    before ->
      # Load the rules from the yaml
      the_syslog = new AgentSyslogd
        path: path.join __dirname, 'agent_syslog_sample.yml'

    it 'has a severity map', ->
      expect( the_syslog.severity_map() ).to.be.an 'object'

    it 'has a field map', ->
      expect( the_syslog.field_map() ).to.be.an 'object'

    it 'has a identifier map', ->
      expect( the_syslog.identifier() ).to.be.a 'string'

    it 'has a field_transform map', ->
      expect( the_syslog.field_transform() ).to.be.a 'object'

    it 'maps a sev', ->
      ev = the_syslog.run( syslog_ev )
      expect( ev.get 'severity' ).to.equal 5

    it 'maps a field', ->
      ev = the_syslog.run( syslog_ev )
      expect( ev.get 'summary' ).to.equal syslog_ev.message

    it 'attached an identifier', ->
      ev = the_syslog.run( syslog_ev )
      expect( ev.get 'identifier' ).to.equal '{node}:{severity}:{tag}:{summary}'

    it 'transforms fields', ->
      ev = the_syslog.run( syslog_ev )
      expect( ev.get 'fieldname_that_goes_lower' ).to.equal 'testshouldbelower'
      expect( ev.get 'fieldname_that_goes_upper' ).to.equal 'TESTSHOULDBEUPPER'

  describe 'Severity Mapping Strings', ->

    the_syslog = null
    ev = null

    before ->
      ev = new Event
      ev.input = 
        prival: 151
        facilityID: 18
        severityID: 7
        facility: 'local2'
        type: 'RFC5424'
        host: 'desktop'
        message: 'message!!!!!!'

      the_syslog = AgentSyslogd.generate {
        severity_map:
          debug: 1
          info: 1
          notice: 1
          warn: 2
          err: 3
          crit: 4
          alert: 5
          emerg: 5
        field_map:
          whatever: 'whatever'
        identifier: '{node}:{severity}:{summary}'
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
    it 'has a severity map', ->
      expect( the_syslog.severity_map() ).to.be.a 'object'
    
    it 'can map debug', ->
      ev.input.severity = 'debug'
      new_ev = the_syslog.run ev
      expect( new_ev.get 'severity' ).to.equal 1

    it 'can map info', ->
      ev.input.severity = 'info'
      new_ev = the_syslog.run ev
      expect( new_ev.get 'severity' ).to.equal 1
    # ...
    it 'can map crit', ->
      ev.input.severity = 'crit'
      new_ev = the_syslog.run ev
      expect( new_ev.get 'severity' ).to.equal 4

    it 'can map alert', ->
      ev.input.severity = 'alert'
      new_ev = the_syslog.run ev
      expect( new_ev.get 'severity' ).to.equal 5

    it 'can map emerg', ->
      ev.input.severity = 'emerg'
      new_ev = the_syslog.run ev
      expect( new_ev.get 'severity' ).to.equal 5


  describe 'Generates', ->

    # Use the same rules instance for all the tests
    the_syslog = null

    before ->
      # Load the rules from the yaml
      the_syslog = AgentSyslogd.generate {
        severity_map:
          7: -1
          1: 2
          0: 5
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
          ,
            name: 3
            match:
              'input.type': 'RFC5424'
            set:
              d_field: 'syslog5424'
              e_field: 'type={input.type}'
              m_field: 'more={input.structuredData.123messageid.more}'
              z_field: '{input.structuredData.zoo@123.msgparam2}'
          ]
      }


    it 'has a severity map', ->
      expect( the_syslog.severity_map() ).to.be.a 'object'

    it 'has a field map', ->
      expect( the_syslog.field_map() ).to.be.a 'object'

    it 'has a identifier map', ->
      expect( the_syslog.identifier() ).to.be.a 'string'

    it 'has a field_transform map', ->
      expect( the_syslog.field_transform() ).to.be.a 'object'

    it 'can run', ->
      ev = new Event
      ev.input = test_messages.simple1
      new_ev = the_syslog.run ev

      expect( new_ev.get 'severity' ).to.equal -1

    it 'can run on structured data', ->
      ev = new Event
      ev.input = test_messages.structured1
      new_ev = the_syslog.run ev

      expect( new_ev.get 'severity' ).to.equal -1
      expect( new_ev.get_input 'structuredData' ).to.be.a 'object'
      expect( new_ev.get_input 'structuredData' ).to.have.keys '123messageid', '456messageid', 'zoo@123', 'timeQuality'

    it 'can get() structured data', ->
      ev = new Event
      ev.input = test_messages.structured1
      new_ev = the_syslog.run ev

      debug "EV1 %O", new_ev
      expect( new_ev.get 'structuredData.123messageid.whatever').to.equal 'what what what'
      expect( new_ev.get_input 'structuredData.123messageid.whatever').to.equal 'what what what'
      expect( new_ev.get_any 'input.structuredData.123messageid.whatever').to.equal 'what what what'
      expect( new_ev.get 'structuredData.zoo@123.msgparam2').to.equal 'message param2'
      expect( new_ev.get_any 'input.structuredData.zoo@123.msgparam2').to.equal 'message param2'
      expect( new_ev.get_input 'structuredData.zoo@123.msgparam2').to.equal 'message param2'

    it 'can get() syslog type', ->
      ev = new Event
      ev.input = test_messages.structured1
      new_ev = the_syslog.run ev

      debug "EV1 %O", new_ev
      expect( new_ev.get 'd_field').to.equal 'syslog5424'
      expect( new_ev.get_input 'structuredData.123messageid.whatever').to.equal 'what what what'
      expect( new_ev.get_any 'input.structuredData.123messageid.whatever').to.equal 'what what what'


    it 'can use a syslog rule 1', ->
      ev = Event.generate
        a_field: 'testing'
      ev.input.severityID = 1
      new_ev = the_syslog.run ev

      expect( new_ev.discarded() ).to.equal true

    it 'can use a syslog rule 2', ->
      ev = Event.generate
        severity: 1
        b_field: 'exact'
      ev.input.severityID = 1

      new_ev = the_syslog.run ev

      expect( new_ev.get 'c_field' ).to.equal 'someothervalue'

    it 'can use a syslog rule 3', ->
      ev = new Event
      ev.input = test_messages.structured1
      new_ev = the_syslog.run ev

      debug "EV3 ", new_ev.input
      expect( new_ev.get 'm_field').to.equal 'more=this is more'
      expect( new_ev.get 'z_field').to.equal 'message param2'