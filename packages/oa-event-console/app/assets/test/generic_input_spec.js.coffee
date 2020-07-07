describe 'GenericInput', ->

  logger = debug 'oa:test:event:rules:generic_input'

  describe 'base class', ->

    describe 'instance', ->

      gi = null
      default_opts = {}

      before ->

        gi = new GenericInput
          class: 'classt'
          logger: -> "common"
          template_id: "#id"
          

      it 'has a element class string', ->
        expect( gi )
          .to.have.property 'class'
          .and.to.equal 'classt'

      it 'has a element name string', ->
        expect( gi )
          .to.have.property 'name'
          .and.to.equal '_noname'

      it 'has a falsey label by default', ->
        expect( gi )
          .to.have.property 'label'
          .and.to.equal undefined

      it 'has a logger function', ->
        expect( gi )
          .to.have.property 'logger'
          .and.to.be.a.function

      it 'has a template id', ->
        expect( gi )
          .to.have.property 'template_id'
          .and.to.equal '#id'

      it 'has a euid string', ->
        expect( gi )
          .to.have.property 'euid'
          .and.be.a.string
        expect( gi.euid ).to.match /^gi\w+/

      it 'has a render function', ->
        expect( gi )
          .to.have.property 'render'
          .and.be.a.function


  describe 'Label and Value', ->

    describe 'instance', ->

      giv = null
      default_opts = {}

      before ->
        giv = new GenericInputLabelValue

      it 'has a template id', ->
        expect( giv )
          .to.have.property 'template_id'
          .and.to.equal '#template-generic-value'

    describe 'rendering', ->
      
      giv = null

      before ->
        $cont = $('<div/>')
        $('#generic-input-render-test').append $cont
        giv = new GenericInputLabelValue
          name: 'a_fieldname'
          value: 'a value'
          label: 'ALabel'
          $container: $cont
        giv.render()

      it 'has name data attached', ->
        $el = giv.$container.find('.generic-value-edit')
        expect( $el ).to.have.length 1
        expect( $el.attr('data-name') ).to.equal 'a_fieldname'

      it 'has a name/label field', ->
        $el = giv.$container.find('.generic-value-fieldview')
        expect( $el ).to.have.length 1
        expect( $el.text() ).to.equal 'ALabel'

      it 'has an input field', ->
        $el = giv.$container.find('.generic-value-value > input')
        expect( $el.val() ).to.equal 'a value'





  describe 'Labels and Values', ->

    describe 'instance', ->

      givs = null
      default_opts = {}

      before ->
        givs = new GenericInputLabelValues

      it 'has a template id', ->
        expect( givs )
          .to.have.property 'template_id'
          .and.to.equal '#template-generic-values'


    describe 'rendering', ->
      
      givs = null

      before ->
        $cont = $('<div/>')
        $('#generic-input-render-test').append $cont
        givs = new GenericInputLabelValues
          name: 'vs_fieldsname'
          field_values:
            vname1: 'vvalue1'
            vname2: 'vvalue2'
          label: 'ALabels'
          $container: $cont
        givs.render()

      it 'has name data attached', ->
        $el = givs.$container.find('.generic-values-edit')
        expect( $el ).to.have.length 1
        expect( $el.attr('data-name') ).to.equal 'vs_fieldsname'

      it 'has a name/label field', ->
        $el = givs.$container.find('.generic-values-fieldview')
        expect( $el ).to.have.length 2
        expect( $($el[0]).text() ).to.equal 'vname1'
        expect( $($el[1]).text() ).to.equal 'vname2'

      it 'has two input fields', ->
        $el = givs.$container.find('.generic-values-value > input')
        expect( $el.length ).to.equal 2
        expect( $($el[0]).val() ).to.equal 'vvalue1'
        expect( $($el[1]).val() ).to.equal 'vvalue2'




  describe 'Field and Value', ->

    describe 'instance', ->

      gifv = null
      default_opts = {}

      before ->
        gifv = new GenericInputFieldValue

      it 'has a template id', ->
        expect( gifv )
          .to.have.property 'template_id'
          .and.to.equal '#template-generic-fieldvalue'


    describe 'rendering', ->
      
      giv = null

      before ->
        $cont = $('<div/>')
        $('#generic-input-render-test').append $cont
        giv = new GenericInputFieldValue
          name: 'b_fieldvalue'
          field: 'bthefield'
          value: 'bthevalue'
          label: 'bLabel'
          $container: $cont
        giv.render()

      it 'has name data attached', ->
        $el = giv.$container.find('.generic-fieldvalue-edit')
        expect( $el ).to.have.length 1
        expect( $el.attr('data-name') ).to.equal 'b_fieldvalue'

      it 'has a name/label field', ->
        $el = giv.$container.find('.generic-fieldvalue-field > input')
        expect( $el ).to.have.length 1
        expect( $el.val() ).to.equal 'bthefield'

      it 'has an input field', ->
        $el = giv.$container.find('.generic-fieldvalue-value > input')
        expect( $el ).to.have.length 1
        expect( $el.val() ).to.equal 'bthevalue'


  describe 'Fields and Values', ->

    describe 'instance', ->

      gifvs = null
      default_opts = {}

      before ->
        gifvs = new GenericInputFieldValues

      it 'has a template id', ->
        expect( gifvs )
          .to.have.property 'template_id'
          .and.to.equal '#template-generic-fieldvalues'


    describe 'rendering', ->
      
      givs = null
      field_values = 
        fvsfield1: 'fvsval1'
        fvsfield2: 'fvsval2'

      before ->
        $cont = $('<div/>')
        $('#generic-input-render-test').append $cont
        givs = new GenericInputFieldValues
          name: 'fvs_fieldsvaluesname'
          field_values: field_values
          label: 'fvs'
          $container: $cont
        givs.render()

      it 'has name data attached', ->
        $el = givs.$container.find('.generic-fieldvalues-edit')
        expect( $el ).to.have.length 1
        expect( $el.attr('data-name') ).to.equal 'fvs_fieldsvaluesname'

      it 'has a name/label field', ->
        $el = givs.$container.find('.generic-fieldvalues-field > input')
        expect( $el ).to.have.length 2
        expect( $($el[0]).val() ).to.equal 'fvsfield1'
        expect( $($el[1]).val() ).to.equal 'fvsfield2'

      it 'has two input fields', ->
        $el = givs.$container.find('.generic-fieldvalues-value > input')
        expect( $el.length ).to.equal 2
        expect( $($el[0]).val() ).to.equal 'fvsval1'
        expect( $($el[1]).val() ).to.equal 'fvsval2'

      it 'doms back to the same object', ->
        obj = givs.dom_to_yaml_obj()
        expect( obj ).to.have.property 'fvs_fieldsvaluesname'
        logger 'dom to objects', obj.fvs_fieldsvaluesname, field_values
        expect( obj.fvs_fieldsvaluesname ).to.eql field_values

      it 'adds a new initial entry', ->
        givs.add_new_entry()
        $el = givs.$container.find('.generic-fieldvalues-value > input')
        expect( $el ).to.have.length 3



  describe 'Select/Enums', ->

    describe 'Label and Enum', ->

      describe 'instance', ->

        giv = null
        default_opts = {}

        before ->
          giv = new GenericInputLabelEnum

        it 'has a template id', ->
          expect( giv )
            .to.have.property 'template_id'
            .and.to.equal '#template-generic-labelenum'


      describe 'rendering', ->
        
        giv = null

        before ->
          $cont = $('<div/>')
          $('#generic-input-render-test').append $cont
          giv = new GenericInputLabelEnum
            name: 'e_fieldname'
            value: 'e enum'
            label: 'ELabel'
            options_list: [
              { label: 'One',   value: '1', selected: false}
              { label: 'Two',   value: '2', selected: true}
              { label: 'Three', value: '3' }
              # {value: '4'}
            ]
            $container: $cont
          giv.render()

        it 'has name data attached', ->
          $el = giv.$container.find('.generic-labelenum-edit')
          expect( $el ).to.have.length 1
          expect( $el.attr('data-name') ).to.equal 'e_fieldname'

        it 'has a name/label field', ->
          $el = giv.$container.find('.generic-labelenum-fieldview')
          expect( $el ).to.have.length 1
          expect( $el.text() ).to.equal 'ELabel'

        it 'has the select options', ->
          $els = giv.$container.find('.generic-labelenum-value > select > option')
          expect( $els.length ).to.equal 3
          expect( $($els[0]).attr('value') ).to.equal '1'
          expect( $($els[1]).text() ).to.equal 'Two'

        it 'has the default selected input field', ->
          $el = giv.$container.find('.generic-labelenum-value > select')
          expect( $el.val() ).to.equal '2'



    describe 'Label and Enums', ->

      describe 'instance', ->

        gie = null
        default_opts = {}

        before ->
          gie = new GenericInputLabelEnums options_list: []

        it 'has a template id', ->
          expect( gie )
            .to.have.property 'template_id'
            .and.to.equal '#template-generic-labelenums'

      describe 'rendering', ->
        
        gie = null

        before ->
          $cont = $('<div/>')
          $('#generic-input-render-test').append $cont
          gie = new GenericInputLabelEnums
            name: 'es_fieldname'
            field_values:
              testigna: 'A'
              testignb: 'ESLabelb'
            options_list: [
              { label: 'Aaa', value: 'A'}
              { label: 'Bbb', value: 'ESLabelb'}
              { label: 'Ccc', value: 'C'}
              # {name: 'Three', value: '3'}
              # {value: '4'}
            ]
            $container: $cont
          gie.render()

        it 'has name data attached', ->
          $el = gie.$container.find('.generic-labelenums-edit')
          expect( $el ).to.have.length 1
          expect( $el.attr('data-name') ).to.equal 'es_fieldname'

        it 'has a name/label field', ->
          $el = gie.$container.find('.generic-labelenums-fieldview')
          expect( $el ).to.have.length 2
          expect( $el.text() ).to.equal 'testignatestignb'

        it 'has the select options', ->
          $els = gie.$container.find('.generic-labelenums-value > select > option')
          expect( $els.length ).to.equal 6
          expect( $($els[0]).attr('value') ).to.equal 'A'
          expect( $($els[1]).text() ).to.equal 'Bbb'

        it 'has the correct value selected by default', ->
          $els = gie.$container.find('.generic-labelenums-value > select')
          expect( $els.length ).to.equal 2
          expect( $($els[0]).val() ).to.equal 'A'
          expect( $($els[1]).val() ).to.equal 'ESLabelb'



    describe 'Fields and Enums', ->

      describe 'instance', ->

        gie = null
        default_opts = {}

        before ->
          gie = new GenericInputFieldEnums options_list: []

        it 'has a template id', ->
          expect( gie )
            .to.have.property 'template_id'
            .and.to.equal '#template-generic-fieldenums'

      describe 'rendering', ->
        
        gie = null

        before ->
          $cont = $('<div/>')
          $('#generic-input-render-test').append $cont
          gie = new GenericInputFieldEnums
            name: 'fes_fieldname'
            field_values:
              testigna: 'FESLabelb'
              testignb: 'FC'
              testignc: 'Other'
            options_list: [
              { label: 'Aaa', value: 'FA'}
              { label: 'Bbb', value: 'FESLabelb'}
              { label: 'Ccc', value: 'FC'}
              # {name: 'Three', value: '3'}
              # {value: '4'}
            ]
            $container: $cont
          gie.render()

        it 'has name data attached', ->
          $el = gie.$container.find('.generic-fieldenums-edit')
          expect( $el ).to.have.length 1
          expect( $el.attr('data-name') ).to.equal 'fes_fieldname'

        it 'has a name/label field', ->
          $el = gie.$container.find('.generic-fieldenums-field > input')
          expect( $el ).to.have.length 3
          expect( $($el[0]).val() ).to.equal 'testigna'
          expect( $($el[1]).val() ).to.equal 'testignb'

        it 'has the select options', ->
          $els = gie.$container.find('.generic-fieldenums-value > select > option')
          expect( $els.length ).to.equal 9
          expect( $($els[0]).attr('value') ).to.equal 'FA'
          expect( $($els[1]).text() ).to.equal 'Bbb'

        it 'has the default selected input field', ->
          $el = gie.$container.find('.generic-fieldenums-value > select')
          expect( $el ).to.have.length 3
          expect( $($el[0]).val() ).to.equal 'FESLabelb'
          expect( $($el[1]).val() ).to.equal 'FC'
          expect( $($el[2]).val() ).to.equal 'FA'




    describe 'Fields and Enums with Arrays to support multiple keys', ->

      describe 'instance', ->

        giea = null
        default_opts = {}

        before ->
          giea = new GenericInputFieldEnumsArray options_list: []

        it 'has a template id', ->
          expect( giea )
            .to.have.property 'template_id'
            .and.to.equal '#template-generic-fieldenums'

      describe 'rendering', ->
        
        giea = null
        field_values =
          testigna: 'FESLabelb'
          testignb: [ 'FC', 'FD' ]
          testignc: [ 'arrOther', 'FA' ]

        before ->
          $cont = $('<div/>')
          $('#generic-input-render-test').append $cont
          giea = new GenericInputFieldEnumsArray
            name: 'arrfes_fieldname'
            field_values: field_values
            options_list: [
              { label: 'FAaa', value: 'FA'}
              { label: 'Aaa', value: 'arrOther'}
              { label: 'Bbb', value: 'FESLabelb'}
              { label: 'Ccc', value: 'FC'}
              { label: 'Ddd', value: 'FD'}
              # {name: 'Three', value: '3'}
              # {value: '4'}
            ]
            $container: $cont
          giea.render()

        it 'has name data attached', ->
          $el = giea.$container.find('.generic-fieldenums-edit')
          expect( $el ).to.have.length 1
          expect( $el.attr('data-name') ).to.equal 'arrfes_fieldname'

        it 'has the name/label fields duplicated for the arrays', ->
          $el = giea.$container.find('.generic-fieldenums-field > input')
          expect( $el ).to.have.length 5
          expect( $($el[0]).val() ).to.equal 'testigna'
          expect( $($el[1]).val() ).to.equal 'testignb'
          expect( $($el[2]).val() ).to.equal 'testignb'
          expect( $($el[3]).val() ).to.equal 'testignc'
          expect( $($el[4]).val() ).to.equal 'testignc'

        it 'has the select options', ->
          $els = giea.$container.find('.generic-fieldenums-value > select > option')
          expect( $els.length ).to.equal 25
          expect( $($els[0]).attr('value') ).to.equal 'FA'
          expect( $($els[1]).text() ).to.equal 'Aaa'

        it 'has the default selected input field', ->
          $el = giea.$container.find('.generic-fieldenums-value > select')
          expect( $el ).to.have.length 5
          expect( $($el[0]).val() ).to.equal 'FESLabelb'
          expect( $($el[1]).val() ).to.equal 'FC'
          expect( $($el[2]).val() ).to.equal 'FD'
          expect( $($el[3]).val() ).to.equal 'arrOther'
          expect( $($el[4]).val() ).to.equal 'FA'

        it 'doms back to the same object', ->
          obj = giea.dom_to_yaml_obj()
          expect( obj ).to.have.property 'arrfes_fieldname'
          logger 'dom to objects', obj.arrfes_fieldname, field_values
          expect( obj.arrfes_fieldname ).to.eql field_values

        it 'add a new initial entry', ->
          giea.add_new_entry()
          $el = giea.$container.find('.generic-fieldenums-value > select')
          expect( $el ).to.have.length 6
