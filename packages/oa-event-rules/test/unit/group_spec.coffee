
debug   = require( 'debug' )( 'oa:test:unit:groups' )
helpers = require '../mocha_helpers'
expect  = helpers.expect


# Test setup
{Group} = require '../../lib/group'
{Select} = require '../../lib/select'
{RuleSet} = require '../../lib/rule_set'

describe 'Group', ->

  describe 'Class', ->

    it 'creates an instance of Groups', ->
      expect( new Select ).to.be.an.instanceof Select
      group = new Group('test', new Select, new RuleSet)
      expect( group ).to.be.an.instanceof Group

  describe 'generated instance', ->
    
    group = null

    group_yaml =
      select:
        all: true
      rules: [{
          name: 'test'
          all: 'true'
          discard: 'true'
          uuid: 'xxxx-yyyy'
        }]

    beforeEach ->
      group = Group.generate 'testname', group_yaml

    it 'gets the test group name', ->
      expect( group.name ).to.equal 'testname'

    xit 'can run an event', ->
      expect( group.run {} ).to.eql {}

    it 'goes back to yaml', ->
      expect( group.to_yaml_obj() ).to.eql group_yaml
 
    it 'updates a select', ->
      rule =
        name: 'nope'
        all: true
        discard: true
      index = 0
      expect( group.update_select rule, index ).to.be.ok
      expect( group.select ).to.be.an.instanceof Select
      expect( group.select.selects.length ).to.equal 1
      expect( group.select.selects[0].label ).to.equal 'all'

