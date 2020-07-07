mocha.setup globals: ['Group', 'Groups' ]

# mock some data

describe 'Group', ->

  simple_yaml =
    groups_array: [ 'First', 'Second' ]
    groups:
      First: {}
      Second: {}

  describe 'instance', ->

    group = null

    beforeEach ->
      group = new Group 

    it 'creates a Group instance', ->
      expect( group ).to.be.an.instanceof Group

    it 'should have a select rule', ->
      expect( group ).to.have.property 'rule_set'
      .and.to.be.an.instanceof RuleSet

    it 'should have a rule_set', ->
      expect( group ).to.have.property 'rule_set'
      .and.to.be.an.instanceof RuleSet


  describe 'generate', ->

    it 'generate a group from yaml', ->
      group = Group.generate
        select: match: summary: '/testing/'
        rules: [ {name: 'f1', all:true, discard: true} ]

      expect( group ).and.to.be.an.instanceof Group


  describe 'renders', ->

    group = null
    group_yaml =
      select: match: summary: '/testing/'
      rules: [
        {name: 'f1', all: true, discard: true}
        {name: 'f2', all: true, discard: true}
        {name: 'f3', all: true, discard: true}
      ]

    beforeEach ->
      group = Group.generate group_yaml
      group.render()

    it 'creates a group', ->
      group.$container.find('')
      



describe 'Groups', ->

  rule_base = { all: true, discard: true }

  simple_yaml =
    _order: ['first', 'second']
    first:
      select: match: summary: '/testing/'
      rules: [ _.defaults({name: 'f1'},rule_base) ]
    second:
      select: name: 's2'
      rules: [
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
        _.defaults({name: 'f2'},rule_base)
      ]

  describe 'instance', ->
    
    groups = null

    beforeEach ->
      groups = new Groups

    it 'creates a Groups instance', ->
      expect( groups ).to.be.an.instanceof Groups

    it 'should add and get group', ->
      groups.add 'First', {}
      expect( groups.get_group 'First' ).to.be.eql {}


  describe 'generates', ->

    it 'from simple yaml (with lots of rules)', ->
      groups = Groups.generate simple_yaml, { index: 1, rule_set: {} }
      expect( groups.get_group('first').name ).to.eql 'first'


  describe 'renders', ->

    it 'creates the groups', ->
      groups = Groups.generate simple_yaml, { index: 1, rule_set: {} }
      groups.render()