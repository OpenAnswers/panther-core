describe 'Error Handling', ->

  describe "DomErrorBase", ->

    describe 'instance', ->

      it 'creates an instance', ->
        expect( new DomErrorBase ).to.be.an.instanceof DomErrorBase
    
      it 'add a message', ->
        de = new DomErrorBase 'testm'
        expect( de )
          .to.have.property 'message'
          .and.to.equal 'testm'

      it 'adds a friendly message', ->
        de = new DomErrorBase 'testm', friendly: 'testfr'
        expect( de )
          .to.have.property 'friendly'
          .and.to.equal 'testfr'

      it 'add an element', ->
        de = new DomErrorBase 'testm', $element: 'testel'
        expect( de )
          .to.have.property '$element'
          .and.to.equal 'testel'


  describe "DomError", ->

    it 'creates an instance', ->
      expect( new DomError ).to.be.an.instanceof DomError

    it 'creates an instance', ->
      expect( new DomError ).to.be.an.instanceof DomErrorBase

    it 'has a type', ->
      expect( new DomError )
        .to.have.property 'type'
        .and.to.equal 'error'

    it 'has a label', ->
      expect( new DomError )
        .to.have.property 'label'
        .and.to.equal 'Error'


  describe "DomWarning", ->

    it 'creates an instance', ->
      expect( new DomWarning ).to.be.an.instanceof DomWarning

    it 'creates an instance', ->
      expect( new DomWarning ).to.be.an.instanceof DomErrorBase

    it 'has a type', ->
      expect( new DomWarning )
        .to.have.property 'type'
        .and.to.equal 'warning'

    it 'has a label', ->
      expect( new DomWarning )
        .to.have.property 'label'
        .and.to.equal 'Warning'



  describe "DomErrorSet", ->

    errors = null

    beforeEach ->
      errors = new DomErrorSet


    describe 'setup', ->

      it 'creates an instance', ->
        expect( errors ).to.be.an.instanceof DomErrorSet

      it 'returns contsruction defaults',->
        expect( errors.defaults() ).to.be.an.object
        expect( errors.defaults() ).to.eql {}

    
    describe 'errors', ->
      
      it 'can return the errors array', ->
        expect( errors.all_errors() ).to.eql []
    
      it 'can add an existing error', ->
        expect( errors.add_error( true ) ).to.equal 1
        expect( errors.all_errors() ).to.eql [ true ]

      it 'can generate and add a error', ->
        expect( errors.add_new_error( 'danger will robinson' ) ).to.equal 1
        expect( errors.all_errors()[0] )
          .have.property 'message'
          .and.to.eql 'danger will robinson'

      it 'return ok on no errors', ->
        expect( errors.ok() ).to.ok

      it 'return not ok on errors', ->
        errors.add_error( true )
        expect( errors.ok() ).to.not.be.ok


    describe 'warnings', ->

      it 'can return the warnings array', ->
        expect( errors.all_warnings() ).to.eql []

      it 'can add an existing warning', ->
        expect( errors.add_warning true ).to.equal 1
        expect( errors.all_warnings() ).to.eql [ true ]

      it 'can generate and add a warning', ->
        expect( errors.add_new_warning( 'dont' ) ).to.equal 1
        expect( errors.all_warnings()[0] )
          .have.property 'message'
          .and.to.eql 'dont'

      it 'return ok on warnings', ->
        expect( errors.add_warning true ).to.equal 1
        expect( errors.ok() ).to.ok

