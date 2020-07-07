
debug   = require( 'debug' )( 'oa:test:unit:rules:select' )

{ expect } = require '../mocha_helpers'

{ Select
  SelectAll
  SelectMatch
  SelectEquals
  SelectFieldExists
  SelectFieldMissing
  SelectLessThan
  SelectGreaterThan 
  
  Action
  
  Agents
  Agent
  AgentGeneric
  AgentHttp
  AgentGraylog
  AgentSyslogd        } = require '../../lib/index'


describe 'index.js to rules', ->

  it 'should have a Select', ->
    expect( Select ).to.be.an.instanceof Object

  it 'should have an Action', ->
    expect( Action ).to.be.an.instanceof Object

  it 'should have an Agent', ->
    expect( Agents ).to.be.an.instanceof Object

  it 'should have an Agents', ->
    expect( Agent ).to.be.an.instanceof Object

  it 'should have an AgentGeneric', ->
    expect( AgentGeneric ).to.be.an.instanceof Object

  it 'should have a AgentGraylog', ->
    expect( AgentGraylog ).to.be.an.instanceof Object

  it 'should have a AgentSyslogd', ->
    expect( AgentSyslogd ).to.be.an.instanceof Object

  it 'should have a AgentHttp', ->
    expect( AgentHttp ).to.be.an.instanceof Object

