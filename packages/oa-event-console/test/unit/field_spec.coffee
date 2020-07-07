
# logging
debug      = require( 'debug' )( 'oa:test:unit:rules:action' )

# helpers
{ expect } = require '../mocha_helpers'

# Test setup
{ Field } = require '../../lib/field'



describe 'Field', ->

  it 'class the field definition', (done)->
    expect( Field.definition ).to.be.an.instanceof Object
    done()


  describe 'w2 helpers', ->

    it 'class has w2_column_field_map', (done)->
      expect( Field.w2_column_field_map ).to.be.an.instanceof Object
      done()

    it 'class has w2_default_fields', (done)->
      expect( Field.w2_default_fields ).to.be.an.instanceof Object
      done()

    it 'class has w2_extra_fields', (done)->
      expect( Field.w2_extra_fields ).to.be.an.instanceof Object
      done()

    it 'class has w2_fields', (done)->
      expect( Field.w2_fields ).to.be.an.instanceof Object
      done()

    it 'class has w2ColumnDefinition', (done)->
      expect( Field.w2ColumnDefinition ).to.be.an.instanceof Object
      done()

    it 'builds the w2 definition', (done)->
      expect( Field.w2BuildColumnDefinition ).to.be.an.instanceof Function
      done()

    it 'runs w2BuildColumnDefinition', (done)->
      expect( Field.w2BuildColumnDefinition() ).to.be.an.instanceof Array
      done()

    it 'w2BuildColumnDefinition has some fields', (done)->
      cols = Field.w2BuildColumnDefinition()
      expect( cols[0] ).to.be.an.instanceof Object
      expect( cols[0] ).to.have.keys [
        'sortable'
        'resizable'
        'size'
        'field'
        'caption'
        'type'
      ]
      done()
