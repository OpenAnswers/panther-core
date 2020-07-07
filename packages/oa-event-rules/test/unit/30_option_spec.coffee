
debug   = require( 'debug' )( 'oa:test:unit:rules:option' )


{ expect } = require '../mocha_helpers'

{ Option
  OptionBase
  OptionUnless
  OptionSkip
  OptionDebug
  OptionOriginal } = require '../../lib/option'

# So we can test events
{ Event } = require '../../lib/event'


describe 'OptionSkip', ->

  it 'should create an instance', ->
    expect( new OptionSkip ).to.be.an.instanceof OptionSkip

  it 'should generate an instance', ->
    expect( OptionSkip.generate skip:true ).to.be.an.instanceof OptionSkip

  it 'should return an object', ->
    expect( new OptionSkip().to_object() ).to.eql skip:true


describe 'OptionDebug', ->

  it 'should have the types property', ->
    expect( new OptionDebug ).to.be.an.instanceof OptionDebug

  it 'should have the types property', ->
    expect( OptionDebug.generate debug:true ).to.be.an.instanceof OptionDebug

  it 'should return an object', ->
    expect( new OptionDebug().to_object() ).to.eql debug:true


describe 'Option', ->

  it 'should have the types property', ->
    expect( Option.types ).to.be.an.instanceof Object

  it 'class has types_description', ->
    expect( Option.types_description ).to.be.an.instanceof Object

  it 'should return a list of the available option types', ->
    options = Option.types_list()
    expect( options ).to.be.an.instanceof Array
    expect( options ).to.contain 'debug', 'skip'

  it 'should return the same option types twice', ->
    first = Option.types_list()
    second = Option.types_list()
    expect( first ).to.eql second

  it 'should generate an Option instance', ->
    option = Option.generate skip: true
    expect( option ).to.be.an.instanceof Option
  
  it 'should produce a debug object', ->
    option = Option.generate debug:true
    expect( option.to_object() ).to.eql debug:true
