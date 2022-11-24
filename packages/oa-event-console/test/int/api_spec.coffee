#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

debug    = require( 'debug' )( 'oa:test:int:api' )

{ expect, Web } = require '../mocha_helpers'


# Test setup
web = Web.from_env_or_default
  path: '/api'


# Boot the app
before (done) ->
  @timeout 20000
  app = Web.boot_complete_app(done)


describe 'API response', ->

  it 'is an array for /actions', (done) ->
    web.get_json '/actions', done, ( res, json ) ->
      expect json.data
      .to.be.an 'array'
      .and.to.eql [
        'discard', 'replace', 'set', 'stop', 'stop_rule_set'
      ]
      done()

  it 'recieves an object for an /actions_obj', (done) ->
    web.get_json "/actions_obj", done, ( res, json )->
      expect json.data
      .and.to.be.a 'object'
      .and.to.have.keys 'discard', 'replace', 'set', 'stop', 'stop_rule_set'
      done()

  it 'is an object for /action', (done) ->
    web.get_json "/action/set", done, ( res, json )->
      expect json.data
      .to.be.a 'object'
      .and.to.eql
        description: "Sets the value of a field to a specified value."
        name: 'set'
        input: [{
          label: 'field'
          name:  'field'
          type:  'string'
        },
        {
          beforetext:  "to"
          name:  'value'
          label: 'value'
          type:  'string'
        }]
      done()


  it 'errors for a missing /action', (done) ->
    web.get_code "/action/blarg", 404, done, ( res, body )->
      expect body
      .to.match /Not found/
      .and.to.match /blarg/
      done()


  it 'is an array for /selects', (done) ->
    web.get_json "/selects", done, ( res, json )->
      expect json.data
      .and.to.be.a 'array'
      .and.to.contain 'all', 'none', 'match',
        'equals', 'field_exists', 'field_missing',
        'starts_with', 'ends_with', 'less_than',
        'greater_than'
      done()


  it 'recieves an object for an /selects_obj', (done) ->
    web.get_json "/selects_obj", done, ( res, json) ->
      expect json.data
      .and.to.be.a 'object'
      .and.to.have.keys 'all', 'ends_with', 'equals',
        'field_exists' , 'field_missing', 'greater_than',
        'less_than', 'match', 'none', 'starts_with'
      done()


  it 'recieve an array for /select/match', (done) ->
    web.get_json "/select/match", done, ( res, json) ->
      expect json.data
      .and.to.be.an 'object'
      .and.to.contain.keys ['name','friendly_name','help','input']
      expect( json.data.name ).to.eql "match"

      done()


  it 'get and array of /options', (done) ->
    web.get_json "/options", done, (res, json) ->
      expect json.data
      .and.to.be.an 'array'
      .and.to.contain 'skip', 'debug'
      done()

  it 'recieves an object for an /options_obj', (done) ->
    web.get_json "/options_obj", done, ( res, json) ->
      expect json.data
      .and.to.be.a 'object'
      .and.to.contain.keys 'skip', 'debug'
      done()

  it 'recieves an object for an /option', (done) ->
    web.get_json "/option/unless", done, ( res, json) ->
      expect json.data
      .and.to.be.a 'object'
      .and.to.eql
        name: 'unless'
        input: []
      done()


  it 'get and array of /fields', (done) ->
    web.get_json "/fields", done, (res, json) ->
      expect json.data
      .and.to.be.an 'array'
      .and.to.eql [
        "identifier"
        "node"
        "severity"
        "summary"
        "tag"
        "group"
        "agent"
        "first_occurrence"
        "owner"
        "tally"
        "acknowledged"
        "last_occurrence"
        "state_change"
      ]
      done()

  it 'recieves an object for an /field', (done) ->
    web.get_json "/field/summary", done, ( res, json) ->
      expect json.data
      .and.to.be.a 'object'
      .and.to.contain.keys [ 'alias', 'help', 'label', 'name', 'priority', 'type', 'size', 'view' ]
      expect( json.data.alias ).to.eql "msg"
      done()


