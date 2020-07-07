
debug   = require( 'debug' )( 'oa:test:unit:rules:option' )


{ expect } = require '../mocha_helpers'

{ Transforms } = require '../../lib/transforms'

# So we can test events

describe 'Transforms', ->

  describe 'available', ->
    expect( Transforms ).to.have.property 'available_transforms'

  describe 'can', ->
    
    tat = null

    before ->
      expect( Transforms ).to.have.property 'available_transforms'
      tat = Transforms.available_transforms

    it 'should do the transforms', ->
      expect( tat ).to.have.property 'to_lower_case'
      expect( tat.to_lower_case.function( "TEST" ) ).to.equal 'test'

      expect( tat ).to.have.property 'to_upper_case'
      expect( tat.to_upper_case.function( "test" ) ).to.equal 'TEST'

      expect( tat ).to.have.property 'left_trim'
      expect( tat.left_trim.function( " test " ) ).to.equal 'test '

      expect( tat ).to.have.property 'right_trim'
      expect( tat.right_trim.function( " test " ) ).to.equal ' test'
      expect( tat.right_trim.function( " test\n" ) ).to.equal ' test'
      expect( tat.right_trim.function( " test\n " ) ).to.equal ' test'

      expect( tat ).to.have.property 'trim'
      expect( tat.trim.function( " test " ) ).to.equal 'test'
      expect( tat.trim.function( " test\n" ) ).to.equal 'test'
      expect( tat.trim.function( " test\n " ) ).to.equal 'test'
      expect( tat.trim.function( "\ttest" ) ).to.equal 'test'

