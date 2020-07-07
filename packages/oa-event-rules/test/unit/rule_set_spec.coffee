
debug   = require( 'debug' )( 'oa:test:unit:rules' )
helpers = require '../mocha_helpers'
expect  = helpers.expect


# Test setup
{RuleSet} = require '../../lib/rule_set'
{Rule}    = require '../../lib/rule'


describe 'RuleSet', ->

  describe 'Class', ->

    it 'creates an instance of RuleSet', ->
      rule = new RuleSet
      expect( rule ).to.be.an.instanceof RuleSet

    it 'creates an instance of RuleSet', ->
      rule = new RuleSet
      expect( rule ).to.be.an.instanceof RuleSet

  describe 'InstanceOf', ->
    rules = RuleSet.generate
      rules: [
        name: "Test rule 1"
        match:
          node: "hlmnpv01"
        set:
          summary: "Hello"
        uuid: "xxxx-1-rule"
      ,
        name: "Test rule 2"
        match:
          node: "hlmnpv02"
        set:
          summary: "Goodbye"
        uuid: "xxxx-2-rule"
      ,
        name: "Test rule 3"
        match:
          node: "hlmnpv03"
        set:
          summary: "Goodbye"
        uuid: "xxxx-3-rule"
      ,
        name: "Test rule 4"
        match:
          node: "hlmnpv04"
        set:
          summary: "Goodbye"
        uuid: "xxxx-4-rule"
      ]

    it 'returns the length of the rules', ->
      expect( rules.length() ).to.equal 4

    it 'moves a rule', ->
      rules.move 3, 0
      expect( rules.rules[0].name ).to.equal "Test rule 4"
      expect( rules.rules[1].name ).to.equal "Test rule 1"
      expect( rules.rules[2].name ).to.equal "Test rule 2"
      expect( rules.rules[3].name ).to.equal "Test rule 3"

    it 'gets a rule by id', ->
      rule = rules.get 0
      expect( rule.name ).to.equal "Test rule 4"

    xit 'finds the matching Rule', ->
      rules.get new_rule
      expect( rules.length() ).to.equal 5
      expect( rules.rules[4].name ).to.equal "added rule"

    it 'adds a rule', ->
      new_rule = Rule.generate {
        name: 'added rule'
        all: true
        stop: true
      }
      rules.add new_rule
      expect( rules.length() ).to.equal 5
      expect( rules.rules[4].name ).to.equal "added rule"

    it 'updates a rule', ->
      new_rule = Rule.generate {
        name: 'updated rule'
        all: true
        stop: true
      }
      rules.update 2, new_rule
      expect( rules.rules[2].name ).to.equal "updated rule"

    it 'inserts a rule', ->
      new_rule = Rule.generate {
        name: 'inserted rule'
        all: true
        stop: true
        uuid: "xxxx-yyyy"
      }
      rules.insert new_rule
      debug 'test rules', new_rule
      expect( rules.rules[0].name ).to.equal "inserted rule"

    it 'deletes a rule', ->
      rules.delete_index 0
      debug 'test rules', rules
      expect( rules.length() ).to.equal 5
      expect( rules.rules[0].name ).to.equal "Test rule 4"

    it 'deletes the last rule', ->
      rules.delete_index 4
      debug 'test rules', rules
      expect( rules.length() ).to.equal 4
      expect( rules.rules[0].name ).to.equal "Test rule 4"

