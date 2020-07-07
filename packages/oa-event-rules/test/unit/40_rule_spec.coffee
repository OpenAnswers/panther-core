
debug   = require( 'debug' )( 'oa:test:unit:rules' )
helpers = require '../mocha_helpers'
expect  = helpers.expect


# Test setup
{Rule}    = require '../../lib/rule'
{Select}    = require '../../lib/select'
{Action}    = require '../../lib/action'

describe 'Rule', ->

  describe 'Class', ->

    it 'creates an instance of Rule', ->
      rule = new Rule 'mine',
        select: new Select
        action: new Action
        yaml:   {}
        uuid: "xxxx-yyyy"
      expect( rule ).to.be.an.instanceof Rule

  describe 'InstanceOf', ->

    rules = null

    before ->
      rules = Rule.generate
        name: "Test rule 1"
        match:
          node: "hlmnpv01"
        set:
          summary: "Hello"
        uuid: "xxxx-yyyy"

    it 'returns the yaml object', ->
      expect( rules.to_yaml_obj() ).to.eql
        name: "Test rule 1"
        match: node: "hlmnpv01"
        set: summary: "Hello"
        uuid: "xxxx-yyyy"

    it 'returns the yaml with hash', ->
      rule = Rule.generate
        name:"test"
        all:true
        stop:true
        uuid: "xxxx-yyyy"
      expect( rule.to_yaml_obj(hash:true) ).to.eql {
        hash: "55b23b5c406091a6180692099e490dc8c9fcb422"
        name: "test"
        all: true
        stop: true
        uuid: "xxxx-yyyy"
      }
