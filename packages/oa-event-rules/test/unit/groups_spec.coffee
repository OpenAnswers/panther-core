
debug   = require( 'debug' )( 'oa:test:unit:groups' )

Errors = require 'oa-errors'
helpers = require '../mocha_helpers'
expect  = helpers.expect
_       = helpers._


# Test setup
{Groups} = require '../../lib/groups'


describe 'Groups', ->

  describe 'Class', ->

    it 'creates an instance of Groups', ->
      group = new Groups
      expect( group ).to.be.an.instanceof Groups

  describe 'generated instance', ->
    
    groups = null
    
    
    test_group_yaml =
      _order: [ 'More gro#$!-_up', "Test group 1" ]
      "Test group 1":
        uuid: '22889210-b974-11e7-9889-c70bd1bece51'
        select:
          all: true
        rules: [{
            name: 'test'
            all: 'true'
            discard: 'true'
            uuid: '22889210-b974-11e7-9889-c70bd1bece51'
          }]
      "More gro#$!-_up":
        uuid: '22889210-b974-11e7-9889-c70bd1bece51'
        select:
          none: true
        rules: [{
            name: 'test'
            none: true
            stop_rule_set: true
            uuid: '22889210-b974-11e7-9889-c70bd1bece51'
          }]
    group_yaml = _.cloneDeep test_group_yaml

    beforeEach ->
      groups = Groups.generate test_group_yaml

    it 'returns the length of the groups', ->
      expect( groups.count() ).to.equal 2

    it 'gets the test group', ->
      expect( groups.get('Test group 1') ).to.be.ok
      .and.to.be.an.instanceof Object

    it 'fails to get a non existant group', ->
      expect( groups.get("wakka") ).to.equal undefined

    it 'has the group', ->
      expect( groups.has_group("Test group 1") ).to.be.ok

    it 'hasnt the group', ->
      expect( groups.has_group("wakka") ).to.equal false

    it 'returns the group names', ->
      expect( groups.names() ).to.contain 'More gro#$!-_up', "Test group 1"

    it 'updates a group name', ->
      groups.update_group_name "Test group 1", "Other Group"
      expect( groups.get("Test group 1") ).not.be.ok
      expect( groups.get("Other Group") ).to.be.ok
      expect( groups.store_order ).to.not.include "Test group 1"
      expect( groups.store_order ).to.include "Other Group"
      expect( groups.store_order ).to.have.length 2

    it 'should delete a group', ->
      debug 'group_yaml', group_yaml
      expect( groups.del 'Test group 1' ).to.be.ok
      expect( groups.store ).to.have.keys 'More gro#$!-_up'
      expect( groups.store_order ).to.have.length 1
      expect( groups.store_order[0] ).to.equal 'More gro#$!-_up'
      
    it 'goes back to yaml', ->
      expect( groups.to_yaml_obj() ).to.eql test_group_yaml
  
    it 'should rename and match the original yaml', ->
      groups.update_group_name "More gro#$!-_up", "Other"
      expect( groups.to_yaml_obj() )
        .to.have.nested.property '_order[0]'
        .and.to.equal 'Other'
      expect( groups.to_yaml_obj() )
        .to.have.nested.property '_order[1]'
        .and.to.equal 'Test group 1'
      expect( groups.to_yaml_obj() )
        .to.have.deep.nested.property 'Other.select',
          none: true

  describe 'the groups order array', ->

    it 'should ensure store order has a stored group', ->
      def = 
        _order: ['one']
        one:
          select: none: true
          rules: []
      g = Groups.generate def

    it 'throws a validation when stored group is not present in store order', ->
      def = 
        _order: ['one']
        one:
          select: none: true
          rules: []
        two:
          select: none: true
          rules: []

      fn = -> Groups.generate def
      expect( fn ).to.throw( Errors.ValidationError, /Groups/ )


    it 'throws a validation when store order is not present in stored group', ->
      def = 
        _order: ['unknown']
        one:
          select: none: true
          rules: []
      fn = -> Groups.generate def
      expect( fn ).to.throw( Errors.ValidationError, /Groups/ )

    it 'throws a validation when store order starts with whitespace', ->
      def = 
        _order: ['  unknown']
        one:
          select: none: true
          rules: []
      fn = -> Groups.generate def
      expect( fn ).to.throw( Errors.ValidationError, /Groups/ )

    it 'throws a validation when store order ends with whitespace', ->
      def = 
        _order: ['unknown  ']
        one:
          select: none: true
          rules: []
      fn = -> Groups.generate def
      expect( fn ).to.throw( Errors.ValidationError, /Groups/ )

    xit 'throws a validation when group name starts with whitespace', ->
      def = 
        _order: []
        "  one":
          select: none: true
          rules: []
      fn = -> Groups.generate def
      expect( fn ).to.throw( Errors.ValidationError, /Groups/ )




    it 'should fill in the store order when it is missing a stored groups', ->
      def =
        _order: []
        one:
          select: none: true
          rules: []
        two:
          select: all: true
          rules: []
      g = Groups.generate def

      expect( g.store).to.have.keys 'one', 'two'
      expect( g.store_order).to.have.length 2
      expect( g.store_order[0]).to.equal 'one'
      expect( g.store_order[1]).to.equal 'two'

