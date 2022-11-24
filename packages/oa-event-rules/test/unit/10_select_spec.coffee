
debug   = require( 'debug' )( 'oa:test:unit:rules:select' )


Errors = require 'oa-errors'

{ expect } = require '../mocha_helpers'

{ Select
  SelectAll
  SelectMatch
  SelectEquals
  SelectFieldExists
  SelectFieldMissing
  SelectLessThan
  SelectGreaterThan
  SelectStartsWith
  SelectEndsWith } = require '../../lib/select'

# So we can test events
{ Event } = require '../../lib/event'



describe 'Select', ->

  it 'should have the types property', (done) ->
    expect( Select.types ).to.be.an.instanceof Object
    done()

  it 'class has types_description', (done) ->
    expect( Select.types_description ).to.be.an.instanceof Object
    done()


  describe '.types property', ->

    it 'has the SelectAll type', (done) ->
      expect( Select.types.all ).to.equal SelectAll
      done()

    it 'has the SelectMatch type', (done) ->
      expect( Select.types.match ).to.equal SelectMatch
      done()

    it 'has the SelectEquals type', (done) ->
      expect( Select.types.equals ).to.equal SelectEquals
      done()

    it 'has the SelectFieldExists type', (done) ->
      expect( Select.types.field_exists ).to.equal SelectFieldExists
      done()

    it 'has the SelectFieldMissing type', (done) ->
      expect( Select.types.field_missing ).to.equal SelectFieldMissing
      done()


  describe 'types description', ->

    it 'has the SelectAll description', (done) ->
      set_description =
        name: 'all'
        input: []

      expect( Select.types_description.all ).to.eql set_description
      done()

    it 'has the SelectMatch description', (done) ->
      match_description =
        name: 'match'
        friendly_name: 'matches'
        description: "Searches a field for a particular value. Regex is allowed."
        help: "This is a match field, it searches a string for a value"
        input: [{
          name:   "field"
          label:  'Field'
          type:   "string"
        },
        {
          name:   "value"
          label:  "string or /regex/"
          type:   "stregex"
          array:  true
        }]

      expect( Select.types_description.match ).to.eql match_description
      done()


  describe 'SelectMatch', ->

    it 'builds an object', (done) ->
      #debug 'SelectMatch', SelectMatch
      select_match_instance = new SelectMatch 'fieldname', 'ovalue'
      expect( select_match_instance ).to.be.an.instanceof SelectMatch
      done()

    it 'builds an object from types', (done) ->
      select_match_cls = Select.types.match
      select_match_ins = new select_match_cls 'fieldname', 'tvalue'
      expect( select_match_ins ).to.be.an.instanceof SelectMatch
      done()

    it 'generates an object from definition', (done) ->
      select_match_ins = Select.generate
        match:
          fieldname: 'value'
      expect( select_match_ins ).to.be.an.instanceof Select
      expect( select_match_ins.run ).to.exist
      done()

    it 'error nicely on missing params to new', (done) ->
      fn = -> new SelectMatch
      expect( fn ).to.throw( 'param 1: field' )
      done()

    it 'error nicely on missing second value param to new', (done) ->
      fn = -> new SelectMatch 'f'
      expect( fn ).to.throw( 'param 2: value' )
      done()

    it 'can run a match', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      matcher = new SelectMatch 'fieldname', 'mvalue'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can fail a match', (done) ->
      ev = Event.generate fieldname: 'nope'
      matcher = new SelectMatch 'fieldname', 'mvalue'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can run a longer string search', (done) ->
      ev = Event.generate fieldname: 'yas yes yas'
      matcher = new SelectMatch 'fieldname', 'yes'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can run a longer regex search', (done) ->
      ev = Event.generate fieldname: 'yes yes yes'
      matcher = new SelectMatch 'fieldname', /yes/
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can run a stregex search', (done) ->
      ev = Event.generate fieldname: 'nope yes nope'
      matcher = new SelectMatch 'fieldname', '/yes/'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can run a stregex array search', (done) ->
      ev = Event.generate fieldname: 'nope yes nope'
      matcher = new SelectMatch 'fieldname', ['/yes/','/nope/']
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'had a label of match', ->
      matcher = new SelectMatch 'fieldname', /yes/
      expect( matcher.label ).to.equal 'match'

    it 'dumps the correct object back for regex', ->
      matcher = new SelectMatch 'fieldname', /yes/
      expect( matcher.to_yaml_obj() ).to.eql match: fieldname: /yes/

    it 'dumps the correct object back string', ->
      matcher = new SelectMatch 'fieldname', 'yes'
      expect( matcher.to_yaml_obj() ).to.eql match: fieldname: 'yes'

    it 'dumps the correct object back array', ->
      matcher = new SelectMatch 'fieldname', ['yes','no','/stregex/']
      expect( matcher.to_yaml_obj() ).to.eql match:
        fieldname: ['yes', 'no', '/stregex/']

    it 'dumps a yaml string back', ->
      matcher = new SelectMatch 'fieldname', "yes"
      expect( matcher.to_yaml() ).to.eql "match:\n  fieldname: 'yes'\n"


    describe 'Definitions', ->

      it 'can run from an object regex definition', (done) ->
        ev = Event.generate fieldname: 'value'
        matcher = Select.generate
          match:
            fieldname: /value/
        expect( matcher.run ev ).to.equal( true )
        done()

      it 'can run from a stregex definition', (done) ->
        ev = Event.generate fieldname: 'value'
        matcher = Select.generate
          match:
            fieldname: '/value/'
        expect( matcher.run ev ).to.equal( true )
        done()

      it 'can run from a stregex definition', (done) ->
        ev = Event.generate fieldname: 'value'
        matcher = Select.generate
          match:
            fieldname: [ '/value/', '/other/' ]
            
        expect( matcher.run ev ).to.equal( true )
        done()

      it 'can run from an object regex array definition', (done) ->
        ev1 = Event.generate this_field: 'value'
        ev2 = Event.generate this_field: 'talue'
        ev3 = Event.generate this_field: 'walue'
        matcher = Select.generate
          match:
            this_field: [ /value/, /talue/ ]
        expect( matcher.run ev1 ).to.equal( true )
        expect( matcher.run ev2 ).to.equal( true )
        expect( matcher.run ev3 ).to.equal( false )
        done()

      it 'throws a validation error during generate', (done)->
        fn = -> SelectMatch.generate ""
        expect( fn ).to.throw( Errors.ValidationError, /No selects could be built/ )
        done()


  describe 'SelectEquals', ->

    it 'builds an object', (done) ->
      debug 'SelectEquals', SelectEquals
      select_equals_instance = new SelectEquals 'fieldname', 'ovalue'
      expect( select_equals_instance ).to.be.an.instanceof SelectEquals
      done()

    it 'builds an object from types', (done) ->
      select_equals_cls = Select.types.equals
      select_equals_ins = new select_equals_cls 'fieldname', 'tvalue'
      expect( select_equals_ins ).to.be.an.instanceof SelectEquals
      done()

    it 'generates an object from definition', (done) ->
      ins = Select.generate
        equals:
          fieldname: 'value'
      expect( ins ).to.be.an.instanceof Select
      expect( ins.run ).to.exist
      expect( ins.selects[0] ).to.be.an.instanceof SelectEquals
      done()

    it 'generates an object from two definitions', (done) ->
      ins = Select.generate
        equals:
          fieldname: 'value'
          altname: 'altvalue'
      expect( ins ).to.be.an.instanceof Select
      expect( ins.run ).to.exist
      debug "TD %O", ins.selects
      expect( ins.selects[0] ).to.be.an.instanceof SelectEquals
      expect( ins.selects[1] ).to.be.an.instanceof SelectEquals
      done()


    it 'generates an object from one definition with two possibilities', (done) ->
      ins = Select.generate
        equals:
          fieldname: [ 'value1', 'value2' ]
      expect( ins ).to.be.an.instanceof Select
      expect( ins.run ).to.exist
      debug "TD %O", ins.selects
      expect( ins.selects[0] ).to.be.an.instanceof SelectEquals
      done()

    it 'generates an object from two definition with two possibilities', (done) ->
      ins = Select.generate
        equals:
          fieldname: [ 'value1', 'value2' ]
          altname: [ 'altvalue1', 'altvalue2' ]
      expect( ins ).to.be.an.instanceof Select
      expect( ins.run ).to.exist
      debug "TD %O", ins.selects
      expect( ins.selects[0] ).to.be.an.instanceof SelectEquals
      expect( ins.selects[1] ).to.be.an.instanceof SelectEquals
      done()





    it 'error nicely on missing params', (done) ->
      fn = -> new SelectEquals
      expect( fn ).to.throw( 'param 1: field' )
      done()

    it 'error nicely on missing second value param', (done) ->
      fn = -> new SelectEquals 'f'
      expect( fn ).to.throw( 'param 2: value' )
      done()

    it 'can run a successful match (single)', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      matcher = new SelectEquals 'fieldname', 'mvalue'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can run a failed match (single)', (done) ->
      ev = Event.generate fieldname: 'nope'
      matcher = new SelectEquals 'fieldname', 'fvalue'
      expect( matcher.run ev ).to.equal( false )
      done()


    it 'can run a successful match (many)', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      matcher = new SelectEquals 'fieldname', [ 'notme', 'also not me', 'mvalue' ]
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can run a failed match (many)', (done) ->
      ev = Event.generate fieldname: 'nope'
      matcher = new SelectEquals 'fieldname', [ 'fvalue', 'another fvalue', 'last_chance' ]
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can return to the definition', (done) ->
      matcher = new SelectEquals  'fieldname', 'fvalue'
      expect( matcher.to_yaml_obj() ).to.eql  equals:
        fieldname: 'fvalue'
      done()

    it 'had a label of equals', ->
      matcher = new SelectEquals 'fieldname', /yes/
      expect( matcher.label ).to.equal 'equals'

    it 'dumps the correct object back string', ->
      matcher = new SelectEquals 'fieldname', 'yes'
      expect( matcher.to_yaml_obj() ).to.eql equals: fieldname: 'yes'

    it 'dumps the correct object back array', ->
      matcher = new SelectEquals 'fieldname', ['yes','no']
      expect( matcher.to_yaml_obj() ).to.eql equals:
        fieldname: ['yes', 'no']

    it 'dumps a yaml string back', ->
      selector = new SelectEquals 'fieldname', "yes"
      expect( selector.to_yaml() ).to.eql "equals:\n  fieldname: 'yes'\n"


  describe 'SelectAll', ->

    it 'builds an object', (done) ->
      debug 'SelectAll', SelectAll
      select_match_instance = new SelectAll
      expect( select_match_instance ).to.be.an.instanceof SelectAll
      done()

    it 'builds an object from types', (done) ->
      select_match_cls = Select.types.all
      select_match_ins = new select_match_cls
      expect( select_match_ins ).to.be.an.instanceof SelectAll
      done()

    it 'can run a match', (done) ->
      matcher = new SelectAll
      result = matcher.run
        fieldname: 'mvalue'
      expect( result ).to.equal( true )
      done()

    it 'can return to the definition', (done) ->
      matcher = new SelectAll
      expect( matcher.to_yaml_obj() ).to.eql  all: true
      done()

    it 'had a label of all', ->
      matcher = new SelectAll 'fieldname', /yes/
      expect( matcher.label ).to.equal 'all'


  describe 'SelectFieldExists', ->

    it 'builds an object', (done) ->
      debug 'SelectFieldExists', SelectFieldExists
      select_match_instance = new SelectFieldExists 'field_name'
      expect( select_match_instance ).to.be.an.instanceof SelectFieldExists
      done()

    it 'builds an object from types', (done) ->
      select_fe_cls = Select.types.field_exists
      select_fe_ins = new select_fe_cls 'field_name_types'
      expect( select_fe_ins ).to.be.an.instanceof SelectFieldExists
      done()

    it 'generate an object from a definition', (done) ->
      select_fe_ins = (Select.types.field_exists).generate
        field_exists: 'fieldname'
      expect( select_fe_ins ).to.be.an.instanceof SelectFieldExists
      done()

    it 'can run a match', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      matcher = new SelectFieldExists 'fieldname'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can fail a match', (done) ->
      ev = Event.generate fieldnope: 'mvalue'
      matcher = new SelectFieldExists 'fieldname'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can return to the definition', (done) ->
      matcher = new SelectFieldExists 'fieldname'
      expect( matcher.to_yaml_obj() ).to.eql  field_exists: 'fieldname'
      done()

    it 'had a label of field_exists', ->
      matcher = new SelectFieldExists 'fieldname', /yes/
      expect( matcher.label ).to.equal 'field_exists'

    it 'throws a validation error during generate', (done)->
      fn = -> SelectFieldExists.generate ""
      expect( fn ).to.throw( Errors.ValidationError, /Definition has no key / )
      done()

    it 'can run a syslog match', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      ev.set_input('fieldname','myvalue')
      matcher = new SelectFieldExists 'input.fieldname'
      expect( matcher.run(ev) ).to.equal( true )
      done()

    it 'can run an original match', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      ev.original.fieldname = 'myvalue'
      matcher = new SelectFieldExists 'original.fieldname'
      expect( matcher.run ev ).to.equal( true )
      done()


  describe 'SelectFieldMissing', ->

    it 'builds an object', (done) ->
      select_fm_instance = new SelectFieldMissing 'fieldname'
      expect( select_fm_instance ).to.be.an.instanceof SelectFieldMissing
      done()

    it 'builds an object from types', (done) ->
      select_fm_cls = Select.types.field_missing
      select_fm_ins = new select_fm_cls 'fieldname'
      expect( select_fm_ins ).to.be.an.instanceof SelectFieldMissing
      done()

    it 'generate an object from a definition', (done) ->
      select_fe_ins = SelectFieldMissing.generate field_missing: 'fieldname'
      expect( select_fe_ins ).to.be.an.instanceof SelectFieldMissing
      expect( select_fe_ins.field ).to.equal 'fieldname'
      done()

    it 'can run a match', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      matcher = new SelectFieldMissing 'fieldnope'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can fail a match', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      matcher = new SelectFieldMissing 'fieldname'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can return to the definition', (done) ->
      matcher = new SelectFieldMissing 'fieldname'
      expect( matcher.to_yaml_obj() ).to.eql  field_missing: 'fieldname'
      done()

    it 'had a label of field_missing', ->
      matcher = new SelectFieldMissing 'fieldname', /yes/
      expect( matcher.label ).to.equal 'field_missing'

    it 'throws a validation error during generate', (done)->
      fn = -> SelectFieldMissing.generate ""
      expect( fn ).to.throw( Errors.ValidationError, /Definition has no key / )
      done()

    it 'can run a syslog field_missing', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      matcher = new SelectFieldMissing 'syslog.fieldname2'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can run an original field_missing', (done) ->
      ev = Event.generate fieldname: 'mvalue'
      matcher = new SelectFieldMissing 'original.fieldname2'
      expect( matcher.run ev ).to.equal( true )
      done()


  describe 'SelectLessThan', ->

    it 'builds an object', (done) ->
      select_fm_instance = new SelectLessThan 'fieldname', 5
      expect( select_fm_instance ).to.be.an.instanceof SelectLessThan
      done()

    it 'builds an object from types', (done) ->
      select_fm_cls = Select.types.less_than
      select_fm_ins = new select_fm_cls 'fieldname', 5
      expect( select_fm_ins ).to.be.an.instanceof SelectLessThan
      done()

    it 'generate an object from a definition', (done) ->
      select_fe_ins = SelectLessThan.generate
        less_than:
          fieldname: 5
        #select: fieldname less_than 5
        #select: fieldname lt 5
        #select: fieldname < 5
      expect( select_fe_ins[0] ).to.be.an.instanceof SelectLessThan
      expect( select_fe_ins[0].field ).to.equal 'fieldname'
      done()

    it 'can run a match', (done) ->
      ev = Event.generate fieldname: 5
      matcher = new SelectLessThan 'fieldname', 6
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can fail a match', (done) ->
      ev = Event.generate fieldname: 5
      matcher = new SelectLessThan 'fieldname', 4
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can fail on a field a match', (done) ->
      ev = Event.generate fieldname: 5
      matcher = new SelectLessThan 'fieldnope', 6
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can return to the definition', (done) ->
      matcher = new SelectLessThan 'fieldnope', 4
      expect( matcher.to_yaml_obj() ).to.eql less_than:
        fieldnope: 4
      done()

    it 'had a label of less_than', ->
      matcher = new SelectLessThan 'fieldname', /yes/
      expect( matcher.label ).to.equal 'less_than'

    it 'throws a validation error during generate', (done)->
      fn = -> SelectLessThan.generate ""
      expect( fn ).to.throw( Errors.ValidationError, /Definition has no key / )
      done()


  describe 'SelectGreaterThan', ->

    it 'builds an object', (done) ->
      select_fm_instance = new SelectGreaterThan 'fieldname', 5
      expect( select_fm_instance ).to.be.an.instanceof SelectGreaterThan
      done()

    it 'builds an object from types', (done) ->
      select_fm_cls = Select.types.greater_than
      select_fm_ins = new select_fm_cls 'fieldname', 5
      expect( select_fm_ins ).to.be.an.instanceof SelectGreaterThan
      done()

    it 'generate an object from a definition', (done) ->
      select_fe_ins = SelectGreaterThan.generate
        greater_than:
          fieldname: 5
        #select: fieldname greater_than 5
        #select: fieldname gt 5
        #select: fieldname > 5
      expect( select_fe_ins[0] ).to.be.an.instanceof SelectGreaterThan
      expect( select_fe_ins[0].field ).to.equal 'fieldname'
      done()

    it 'can run a match', (done) ->
      ev = Event.generate fieldname: 4
      matcher = new SelectGreaterThan 'fieldname', 3
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can fail a match', (done) ->
      ev = Event.generate fieldname: 4
      matcher = new SelectGreaterThan 'fieldname', 5
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can fail on a field a match', (done) ->
      ev = Event.generate fieldname: 4
      matcher = new SelectGreaterThan 'fieldnope', 4
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can return to the definition', (done) ->
      matcher = new SelectGreaterThan 'fieldnope', 4
      expect( matcher.to_yaml_obj() ).to.eql greater_than:
        fieldnope: 4
      done()

    it 'had a label of greater_than', ->
      matcher = new SelectGreaterThan 'fieldname', /yes/
      expect( matcher.label ).to.equal 'greater_than'

    it 'throws a validation error during generate', (done)->
      fn = -> SelectGreaterThan.generate ""
      expect( fn ).to.throw( Errors.ValidationError, /Definition has no key / )
      done()


  describe 'SelectStartsWith', ->

    it 'builds an object', (done) ->
      select_sw_instance = new SelectStartsWith 'fieldname', 5
      expect( select_sw_instance ).to.be.an.instanceof SelectStartsWith
      done()

    it 'builds an object from types', (done) ->
      select_sw_cls = Select.types.starts_with
      select_sw_ins = new select_sw_cls 'fieldname', 5
      expect( select_sw_ins ).to.be.an.instanceof SelectStartsWith
      done()

    it 'generate an object from a definition', (done) ->
      select_fe_ins = SelectStartsWith.generate
        starts_with:
          fieldname: 'start'
        #select: fieldname greater_than 5
        #select: fieldname gt 5
        #select: fieldname > 5
      expect( select_fe_ins[0] ).to.be.an.instanceof SelectStartsWith
      expect( select_fe_ins[0].field ).to.equal 'fieldname'
      done()

    it 'can run a match', (done) ->
      ev = Event.generate fieldname: 'starts with the text'
      matcher = new SelectStartsWith 'fieldname', 'sta'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can fail a match', (done) ->
      ev = Event.generate fieldname: 4
      matcher = new SelectStartsWith 'fieldname', 'tart'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can fail on a field a match', (done) ->
      ev = Event.generate fieldname: 4
      matcher = new SelectStartsWith 'fieldnope', 'start'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can return to the definition', (done) ->
      matcher = new SelectStartsWith 'fieldnope', 4
      expect( matcher.to_yaml_obj() ).to.eql starts_with:
        fieldnope: 4
      done()

    it 'had a label of greater_than', ->
      matcher = new SelectStartsWith 'fieldname', "yep"
      expect( matcher.label ).to.equal 'starts_with'


  describe 'SelectEndsWith', ->

    it 'builds an object', (done) ->
      select_ew_instance = new SelectEndsWith 'fieldname', 5
      expect( select_ew_instance ).to.be.an.instanceof SelectEndsWith
      done()

    it 'builds an object from types', (done) ->
      select_ew_cls = Select.types.ends_with
      select_ew_ins = new select_ew_cls 'fieldname', 5
      expect( select_ew_ins ).to.be.an.instanceof SelectEndsWith
      done()

    it 'generate an object from a definition', (done) ->
      select_fe_ins = SelectEndsWith.generate
        ends_with:
          fieldname: 'end'
        #select: fieldname greater_than 5
        #select: fieldname gt 5
        #select: fieldname > 5
      expect( select_fe_ins[0] ).to.be.an.instanceof SelectEndsWith
      expect( select_fe_ins[0].field ).to.equal 'fieldname'
      done()

    it 'can run a match', (done) ->
      ev = Event.generate fieldname: 'endsta'
      matcher = new SelectEndsWith 'fieldname', 'sta'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can fail a match', (done) ->
      ev = Event.generate fieldname: 4
      matcher = new SelectEndsWith 'fieldname', 'tart'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can fail on a field a match', (done) ->
      ev = Event.generate fieldname: 4
      matcher = new SelectEndsWith 'fieldnope', 'start'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can return to the definition', (done) ->
      matcher = new SelectEndsWith 'fieldnope', 4
      expect( matcher.to_yaml_obj() ).to.eql ends_with:
        fieldnope: 4
      done()

    it 'had a label of ends_with', ->
      matcher = new SelectEndsWith 'fieldname', "yep"
      expect( matcher.label ).to.equal 'ends_with'


  describe 'Select', ->

    it 'throws a validation error during generate', (done)->
      fn = -> Select.generate
        name: 'select'
      expect( fn ).to.throw( Errors.ValidationError, /Failed to generate select/ )
      done()

  describe 'Select from extra fields', ->

    ev = null
    source_event =
      node: 'localhost'
      tag: 'tagged'
      extra: 'stuff'
      addendum: 'additional info'

    beforeEach ->
      ev = Event.generate source_event

    # starts_with
    it 'can use additional extra data for StartsWith', (done) ->
      matcher = new SelectStartsWith 'extra', 'stu'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can use additional addendum data for StartsWith', (done) ->
      matcher = new SelectStartsWith 'addendum', 'addit'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can use additional data for StartsWith (input)', (done) ->
      matcher = new SelectStartsWith 'input.extra', 'stu'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can use additional data for StartsWith (original)', (done) ->
      matcher = new SelectStartsWith 'original.extra', 'stu'
      expect( matcher.run ev ).to.equal( true )
      done()


    # ends_with
    it 'can use additional data for EndsWith (input)', (done) ->
      matcher = new SelectEndsWith 'input.extra', 'tuff'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can use additional data for EndsWith (original)', (done) ->
      matcher = new SelectEndsWith 'original.extra', 'tuff'
      expect( matcher.run ev ).to.equal( true )
      done()


    # equals
    it 'can use additional data for Equals (input)', (done) ->
      matcher = new SelectEquals 'input.extra', 'stuff'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can use additional data for Equals (original)', (done) ->
      matcher = new SelectEquals 'original.extra', 'stuff'
      expect( matcher.run ev ).to.equal( true )
      done()

    # field_exists
    it 'can use additional data for FieldExists (input.extra)', (done) ->
      matcher = new SelectFieldExists 'input.extra'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can detect missing additional data for FieldExists (input)', (done) ->
      matcher = new SelectFieldExists 'input.bogus'
      expect( matcher.run ev ).to.equal( false )
      done()


    it 'can use additional data for FieldExists (original.extra)', (done) ->
      matcher = new SelectFieldExists 'original.extra'
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'can detect missing additional data for FieldExists (original)', (done) ->
      matcher = new SelectFieldExists 'original.bogus'
      expect( matcher.run ev ).to.equal( false )
      done()



    # field_missing
    it 'can use additional data for FieldMissing (input.extra)', (done) ->
      matcher = new SelectFieldMissing 'input.extra'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can detect missing additional data for FieldMissing (input)', (done) ->
      matcher = new SelectFieldMissing 'input.bogus'
      expect( matcher.run ev ).to.equal( true )
      done()


    it 'can use additional data for FieldMissing (original.extra)', (done) ->
      matcher = new SelectFieldMissing 'original.extra'
      expect( matcher.run ev ).to.equal( false )
      done()

    it 'can detect missing additional data for FieldMissing (original)', (done) ->
      matcher = new SelectFieldMissing 'original.bogus'
      expect( matcher.run ev ).to.equal( true )
      done()


    # match
    it 'can match on extra data in the input', (done) ->
      matcher = new SelectMatch 'input.extra', [ '/^st/', 'uff$/' ]
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'cant match on extra data in the input', (done) ->
      matcher = new SelectMatch 'input.extra', [ '/^nst/', 'nuff$/' ]
      expect( matcher.run ev ).to.equal( false )
      done()



    it 'can match on addendum data in the input', (done) ->
      matcher = new SelectMatch 'input.addendum', [ '/^add/', 'info$/' ]
      expect( matcher.run ev ).to.equal( true )
      done()

    it 'cant match on addendum data in the input', (done) ->
      matcher = new SelectMatch 'input.addendum', [ '/^nadd/', 'ninfo$/' ]
      expect( matcher.run ev ).to.equal( false )
      done()
