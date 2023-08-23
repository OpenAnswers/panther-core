debug   = require( 'debug' )( 'oa:test:func:schedules' )
{ expect } = require '../mocha_helpers'

# Node modules
path    = require 'path'

# OA modules
{ Schedules }  = require '../../lib/schedules'
{ Schedule }   = require '../../lib/schedule'
{ EventRules } = require '../../lib/event_rules'
Errors = require 'oa-errors'


describe 'Schedules', ->

  yaml_def = [{
    name: 'weekday'
    start: '11:11'
    end: '12:12'
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  }]

  describe 'Class', ->

    schedules = null
    beforeEach ->
      schedules = Schedules.generate yaml_def
    
    it 'loads schedules', ->
      expect( schedules ).to.be.an instanceof Schedules
    
    it 'has an array of Schedule', ->
      expect( schedules.names() ).to.be.an.instanceof Array
      expect( schedules.count() ).to.equal 1

    it 'has a weekday schedule', ->
      expect( schedules.has_schedule('weekday')).to.equal true
    
    it 'can check for a non-existant schedule', ->
      expect( schedules.has_schedule('never heard of it')).to.equal false
    
  describe 'Schedule', ->
    schedules = null
    beforeEach ->
      schedules = Schedules.generate yaml_def
    
    it 'has a Schedule', ->
      expect( schedules.get('weekday') ).to.be.an instanceof Schedule
  
describe 'Schedule Selectors', ->

  event_rules = null
  yaml_event_rules = 
    globals:
      rules: [{
        name: "with_schedule"
        discard: true
        schedule:
          name: "sched1"
      }]
    groups:
      _order: []
    schedules: []
    
  it 'throws an error for an unexpected schedule name', ->
    fn = -> new EventRules( server: true, doc: yaml_event_rules )

    expect( fn ).to.throw( Errors.ValidationError, /Schedule generate: schedule name does not exist/ )
 
