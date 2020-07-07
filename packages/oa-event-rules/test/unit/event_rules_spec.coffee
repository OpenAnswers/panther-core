
debug   = require( 'debug' )( 'oa:test:unit:rules' )
{ expect, fs, Promise } = require '../mocha_helpers'

# npm modules
path = require 'path'

# Test setup
{EventRules} = require '../../lib/event_rules'


# And the tests
describe 'EventRules', ->

  # vars for all tests
  yaml_file = 'event_rules_spec.yml'
  yaml_path = path.join __dirname, yaml_file


  describe 'Class', ->

    it 'loads event_rules_spec.yml', (done)->
      rules = new EventRules
        path: yaml_path
      
      expect( rules ).to.be.an.instanceof EventRules
      done()


  describe 'YAML', ->
  
    event_rules = null
    yaml_event_rules =
      globals:
        rules: []
      groups:
        _order: ['One']
        'One':
          select: all: true
          rules: []
          uuid: "xxxx-yaml"
      schedules: []
 
    before ->
      event_rules = new EventRules server: true, doc: yaml_event_rules

    it 'contains a metadata timestamp', ->
      now = Date.now()
      yaml = event_rules.to_yaml_obj()
      expect( yaml ).to.contain.key 'metadata'
      expect( yaml.metadata ).to.contain.key 'save_date'
      expect( yaml.metadata.save_date ).to.gte now

    it 'goes back to yaml', ->
      yaml = event_rules.to_yaml_obj()
      delete yaml.metadata
      expect( yaml ).to.eql yaml_event_rules
      
    it 'goes back to yaml, with hash', ->
      yaml_event_rules.hash = "7ca2722057837fc10b17efb09da5ef827ed548da"
      yaml = event_rules.to_yaml_obj(hash:true)
      delete yaml.metadata
      expect( yaml ).to.eql yaml_event_rules

 
