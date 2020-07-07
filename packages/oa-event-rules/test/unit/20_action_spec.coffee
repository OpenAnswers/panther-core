
# logging
debug      = require( 'debug' )( 'oa:test:unit:rules:action' )

# helpers
{ expect } = require '../mocha_helpers'

# Test setup
{ Action
  ActionBase
  ActionSet
  ActionDiscard
  ActionReplace
  ActionStop
  ActionStopRuleSet } = require '../../lib/action'

{ Event } = require '../../lib/event'




describe 'Actions', ->


  it 'class has types', (done) ->
    expect( Action.types ).to.be.an.instanceof Object
    done()

  it 'class has types_description', (done) ->
    expect( Action.types_description ).to.be.an.instanceof Object
    done()


  describe 'types property', ->

    it 'has the ActionSet type', (done) ->
      expect( Action.types.set ).to.equal ActionSet
      done()

    it 'has the ActionDiscard type', (done) ->
      expect( Action.types.discard ).to.equal ActionDiscard
      done()

    it 'has the ActionReplace type', (done) ->
      expect( Action.types.replace ).to.equal ActionReplace
      done()


  describe 'types description', ->

    it 'has the ActionSet description', (done) ->
      set_description =
        name: 'set'
        description: "Sets the value of a field to a specified value."
        input: [{
          name: 'field'
          label: 'field'
          type: 'string'
        },
        {
          beforetext: "to"
          name: 'value'
          label: 'value'
          type: 'string'
        }]

      expect( Action.types_description.set ).to.eql set_description
      done()

    it 'has the ActionDiscard description', (done) ->
      discard_description =
        name: 'discard'
        description: "Discards the event immediately, and applies no further processing."
        friendly_after: "this event"
        friendly_name: "Discard"
        input: []

      expect( Action.types_description.discard ).to.eql discard_description
      done()


  describe 'ActionBase', ->

    it 'doesnt a string', ->
      ev = Event.generate 'field': 'value'
      action = new ActionBase
      action.value = 'test'
      format_result = action.replace_format_string ev

      expect( format_result ).to.equal 'test'

    it 'doesnt format a missing {field}', ->
      ev = Event.generate 'field': 'value'
      action = new ActionBase
      action.value = '{test}'
      format_result = action.replace_format_string ev

      expect( format_result ).to.equal '{test}'

    it 'does format a {field}', ->
      ev = Event.generate 'field': 'value'
      action = new ActionBase
      action.value = '{field}'
      format_result = action.replace_format_string ev

      expect( format_result ).to.equal 'value'

    it 'does format a {match.1}', ->
      ev = Event.generate 'field': 'value'
      action = new ActionBase
      action.value = '{match.1}'
      ev.match (/t(es)t/).exec('test')
      format_result = action.replace_format_string ev

      expect( format_result ).to.equal 'es'

    it 'does format a {match.1} {match.2}', ->
      ev = Event.generate 'field': 'value'
      action = new ActionBase
      action.value = '{match.1} {match.2}'
      ev.match (/t(es)t(in)g/).exec('testing')
      format_result = action.replace_format_string ev

      expect( format_result ).to.equal 'es in'

    it 'does format a field with a prefix {prefix.field}', ->
      replace_data =
        field: 'i am field'
        other: 'i am other'
        nope: 'nope'
      fmt_string = '{something} {prefix.field} {prefix.other}'
      format_result = ActionBase.format_string_with_prefix 'prefix', fmt_string, replace_data

      expect( format_result ).to.equal '{something} i am field i am other'

    it 'does format a field with double prefix {prefix.second.field}', ->
      replace_data =
        field: 'i am field'
        other: 'i am other'
        nope: 'nope'
      fmt_string = '{something} {prefix.second.field} {prefix.second.other}'
      format_result = ActionBase.format_string_with_prefix 'prefix.second', fmt_string, replace_data

      expect( format_result ).to.equal '{something} i am field i am other'


  describe 'ActionSet', ->

    it 'builds an object', (done) ->
      debug 'ActionSet', ActionSet
      select_match_instance = new ActionSet 'fieldname', 'value'
      expect( select_match_instance ).to.be.an.instanceof ActionSet
      done()

    it 'builds an object from types', (done) ->
      select_match_cls = Action.types.set
      select_match_ins = new select_match_cls 'fieldname', 'value'
      expect( select_match_ins ).to.be.an.instanceof ActionSet
      done()

    it 'error nicely on missing params', (done) ->
      fn = -> new ActionSet
      expect( fn ).to.throw( 'param 1: field' )
      done()

    it 'error nicely on missing second value param', (done) ->
      fn = -> new ActionSet 'f'
      expect( fn ).to.throw( 'param 2: value' )
      done()

    it 'sets a field', (done) ->
      set = new ActionSet 'fieldname', 'svalue'
      ev = Event.generate fieldname: 'notvalue'
      set.run ev
      debug 'ev', ev
      expect( ev.get 'fieldname' ).to.equal( 'svalue' )
      done()

    it 'sets a new field', (done) ->
      set = new ActionSet 'othername', 'svalue'
      ev = Event.generate fieldname: 'notvalue'
      set.run ev
      expect( ev.get 'othername' ).to.equal( 'svalue' )
      done()

    it 'sets a field with a field {format}', (done) ->
      set = new ActionSet 'othername', 'value is {somefield}'
      ev = Event.generate
        fieldname: 'notvalue'
        somefield: 'meee'
      set.run ev
      expect( ev.get 'othername' ).to.equal( 'value is meee' )
      done()

    it 'sets a field with a regex {match.1} format', (done) ->
      set = new ActionSet 'matchresult', '{match.1}'
      ev = Event.generate fieldname: 'notvalue'
      ev.match "text matchinnerstr text".match( /match(inner)str/ )
      set.run ev
      expect( ev.get 'matchresult' ).to.equal( 'inner' )
      done()

    it 'sets a field with multiple regex {match.1} formats', (done) ->
      set = new ActionSet 'matchresult', '1>{match.1}< 2>{match.2}<'
      ev = Event.generate fieldname: 'notvalue'
      ev.match "text matchfirststrsecondend text".match( /match(first)str(second)end/ )
      set.run ev
      expect( ev.get 'matchresult' ).to.equal( '1>first< 2>second<' )
      done()

    it 'sets a field with a input {syslog.whatever} field format', (done) ->
      set = new ActionSet 'syslog_data', '{input.testing}'
      ev = Event.generate fieldname: 'notvalue'
      ev.input.testing = 'syslog_value'
      set.run ev
      expect( ev.get 'syslog_data' ).to.equal( 'syslog_value' )
      done()

    it 'sets a field with a syslog {input.structuredData.whatever} field format', (done) ->
      set = new ActionSet 'syslog_structured_data', '{input.structuredData.whatever}'
      ev = Event.generate fieldname: 'notvalue'
      ev.input.message_id = 'mdc@12345'
      ev.input.structuredData = {
        whatever: 'struc_data_value'
        category: 'uk.org.cqc.ols.service.interceptors.OLSFaultInterceptor',
        exception: 'long hava exception',
        message: 'Error details id ::: 1441096013330',
        priority: 'ERROR',
        thread: '[ols-createenquiry-app-1.0.21].listener-config.worker.04'
      }
      ev.input.message = 'Error details id ::: 1441096013330'
      set.run ev
      expect( ev.get 'syslog_structured_data' ).to.equal( 'struc_data_value' )
      done()

    it 'sets a field from generate', (done) ->
      sets = ActionSet.generate set: othername: 'svalue'
      ev = Event.generate othername: 'notvalue'
      
      expect( sets.length ).to.equal 1
      sets[0].run ev
      expect( ev.get 'othername' ).to.equal( 'svalue' )
      done()

    it 'sets multiple fields from generate', (done) ->
      sets = ActionSet.generate
        set:
          first_field: 'set to first'
          second_field: 'set to second'

      ev = Event.generate
        first_field: 'notvalue'
        second_field: 'set to second'

      expect( sets.length ).to.equal 2
      sets[0].run ev
      expect( ev.get 'first_field' ).to.equal( 'set to first' )
      sets[1].run ev
      expect( ev.get 'second_field' ).to.equal( 'set to second' )
      done()

  describe 'ActionDiscard', ->

    it 'builds an object', (done) ->
      debug 'ActionDiscard', ActionDiscard
      select_match_instance = new ActionDiscard 'fieldname', 'value'
      expect( select_match_instance ).to.be.an.instanceof ActionDiscard
      done()

    it 'builds an object from types', (done) ->
      select_match_cls = Action.types.discard
      select_match_ins = new select_match_cls 'fieldname', 'value'
      expect( select_match_ins ).to.be.an.instanceof ActionDiscard
      done()

    it 'generates', (done) ->
      ActionDiscard.generate
      done()

    it 'error nicely on missing params', (done) ->
      fn = -> new ActionDiscard
      expect( fn ).to.not.throw Error
      done()

    it 'discards a field', (done) ->
      discard = new ActionDiscard
      ev = Event.generate fieldname: 'notvalue'
      discard.run ev
      expect( ev.discarded() ).to.equal( true )
      expect( ev.stopped() ).to.equal( true )
      done()



  describe 'ActionReplace', ->

    it 'builds an object', (done) ->
      debug 'ActionReplace', ActionReplace
      select_match_instance = new ActionReplace 'fieldname', 'this', 'with'
      expect( select_match_instance ).to.be.an.instanceof ActionReplace
      done()

    it 'builds an object from types', (done) ->
      select_match_cls = Action.types.replace
      select_match_ins = new select_match_cls 'fieldname', 'value', 'with'
      expect( select_match_ins ).to.be.an.instanceof ActionReplace
      done()

    it 'error nicely on missing params', (done) ->
      fn = -> new ActionReplace
      expect( fn ).to.throw( 'param 1: field' )
      done()

    it 'error nicely on missing second value param', (done) ->
      fn = -> new ActionReplace 'f'
      expect( fn ).to.throw( 'param 2: this' )
      done()

    it 'error nicely on missing second value param', (done) ->
      fn = -> new ActionReplace 'f', 't'
      expect( fn ).to.throw( 'param 3: with' )
      done()

    it 'replaces a field', (done) ->
      ev = Event.generate( fieldname: 'ssssssearchssssss' )
      rep = new ActionReplace 'fieldname', /search/, 'replace'
      rep.run ev
      expect( ev.get 'fieldname' ).to.equal( 'sssssreplacessssss' )
      done()

    it 'replaces multuple fields', (done) ->
      ev = Event.generate( fieldname: 'One Two Three Four' )
      rep = Action.generate
        replace: [{
          field: 'fieldname'
          this:  '/Two/'
          with:  'Five'
        },{
          field: 'fieldname'
          this:  '/Four/'
          with:  'Six'
        }]
      rep.run ev
      expect( ev.get 'fieldname' ).to.equal 'One Five Three Six'
      done()



  describe 'ActionStop', ->

    it 'builds an object', (done) ->
      debug 'ActionStop', ActionStop
      select_match_instance = new ActionStop
      expect( select_match_instance ).to.be.an.instanceof ActionStop
      done()

    it 'builds an object from types', (done) ->
      select_match_cls = Action.types.stop
      select_match_ins = new select_match_cls
      expect( select_match_ins ).to.be.an.instanceof ActionStop
      done()

    it 'error nicely on missing params', (done) ->
      fn = -> new ActionStop
      expect( fn ).to.not.throw Error
      done()

    it 'stops on an event', (done) ->
      stop = new ActionStop
      evnt = Event.generate
        some_field: true
      stop.run evnt
      expect( evnt.stopped() ).to.equal( true )
      done()



  describe 'ActionStopRuleSet', ->

    it 'builds an object', (done) ->
      debug 'ActionStopRuleSet', ActionStopRuleSet
      select_match_instance = new ActionStopRuleSet
      expect( select_match_instance ).to.be.an.instanceof ActionStopRuleSet
      done()

    it 'builds an object from types', (done) ->
      select_match_cls = Action.types.stop_rule_set
      select_match_ins = new select_match_cls
      expect( select_match_ins ).to.be.an.instanceof ActionStopRuleSet
      done()

    it 'error nicely on missing params', (done) ->
      fn = -> new ActionStopRuleSet
      expect( fn ).to.not.throw Error
      done()

    it 'stops the set on an event', (done) ->
      stop = new ActionStopRuleSet
      evnt = Event.generate
        some_field: true
      stop.run evnt
      expect( evnt.stopped_rule_set() ).to.equal( true )
      done()



  describe '#Action', ->

    ev = null

    beforeEach (done) ->
      ev = Event.generate field_name: 'text'
      done()

    it 'discards', (done) ->
      a = Action.generate
        discard: true
      a.run ev
      expect( ev.discarded() ).to.equal true
      done()

    it 'replaces', (done) ->
      a = Action.generate
        replace:
          field: 'field_name'
          this:  'text'
          with:  '_text_'
      a.run ev
      expect( ev.get 'field_name' ).to.equal '_text_'
      done()

    it 'sets', (done) ->
      a = Action.generate
        set:
          field_name: 'res'
      a.run ev
      expect( ev.get 'field_name' ).to.equal 'res'
      done()

    it 'stops', (done) ->
      a = Action.generate
        stop: true
      a.run ev
      expect( ev.stopped() ).to.equal true
      done()
