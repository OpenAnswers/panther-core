
describe 'Select', ->

  logger = debug 'oa:test:event:rules:select'

  simple_yaml = { name: 'test' }
  default_opts = rule: {}, render: true
  render_test_id = '#ruleverb-render-test'
  describe 'base implementation', ->

    it 'can create an SelectBase instance', ->
      action = new SelectBase rule: {}
      expect( action ).to.be.an.instanceof SelectBase


  describe 'all', ->

    select = null
    yaml_all =
      all: true

    beforeEach ->
      select = new SelectAll
        rule: {}
        field: 'severity'
        value: 5


    describe 'instance', ->

      it 'creates a SelectAll instance', ->
        expect( select ).to.be.an.instanceof SelectAll

      it 'should have a verb', ->
        expect( select ).to.have.property 'verb'
        expect( select.verb ).to.eql 'all'

      it 'should reproduce the yaml select', ->
        gen = SelectAll.generate yaml_all, default_opts
        expect( gen.to_yaml_obj() ).to.eql yaml_all


    describe 'rendered container', ->

      beforeEach ->
        select.render()

      it 'should have the operator in view', ->
        $el = select.$container.find('.select-operator-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'all'

      it 'should have the operator input in edit', ->
        $el = select.$container.find('.select-operator > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'all'

      it 'should reproduce the yaml select from dom', ->
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_all


    describe 'yaml generated', ->

      it 'should reproduce the yaml select from dom', ->
        select = SelectAll.generate yaml_all, default_opts
        select.render()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_all

      it 'should test select all events', ->
        select = SelectAll.generate yaml_all, default_opts
        ev_test_result = select.test_event summary:true
        expect( ev_test_result ).to.equal true



  describe 'none', ->

    select = null
    yaml_none =
      none: true

    beforeEach ->
      select = new SelectNone rule: {}

    it 'can create an SelectNone instance', ->
      expect( select ).to.be.an.instanceof SelectNone
    
    it 'should have the `none` verb', ->
      expect( select ).to.have.property 'verb'
      expect( select.verb ).to.eql 'none'

    it 'should have a view template attached', ->
      expect( select ).to.have.property 'template_view'
      logger 'discard template_view', select.template_view
      expect( select.template_view ).to.be.a 'string'
      expect( select.template_view.length ).to.be.gt 10

    it 'should have an edit template attached', ->
      expect( select ).to.have.property 'template_edit'
      logger 'discard template_edit', select.template_edit
      expect( select.template_edit ).to.be.an 'string'
      expect( select.template_edit.length ).to.be.gt 10

    it 'should have the operator in the edit template', ->
      select.render()
      logger 'find', select.$container, select.$container.html()
      expect( select.$container.find('.select-operator > input').val() ).to.equal 'none'

    it 'should have the operator in the view template', ->
      select.render()
      logger 'find', select.$container, select.$container.html()
      expect( select.$container.find('.select-operator-view').text() ).to.match /none/i

    it 'should reproduce the yaml select', ->
      select = SelectNone.generate yaml_none, default_opts
      el = select.render()
      logger 'render', el
      $(render_test_id).append el
      back_to_yaml = select.dom_to_yaml_obj()
      expect( back_to_yaml ).to.eql none:true

    it 'should select no events', ->
      select = SelectNone.generate yaml_none, default_opts
      ev_test_result = select.test_event summary:true
      expect( ev_test_result ).to.equal false



  describe 'match', ->

    select = null
    
    yaml_match =
      match:
        summary: '/text/'

    yaml_match_array =
      match:
        node: [ '/test/', '/then/', '/that/' ]
    
    beforeEach ->
      select = new SelectMatch
        rule: {}
        field: 'summary'
        value: '/text/'


    describe 'instance', ->

      it 'creates a SelectMatch instance', ->
        expect( select ).to.be.an.instanceof SelectMatch

      it 'should have a verb', ->
        expect( select ).to.have.property 'verb'
        expect( select.verb ).to.eql 'match'

      it 'should reproduce the yaml select', ->
        gen = SelectMatch.generate yaml_match, default_opts
        expect( gen[0].to_yaml_obj() ).to.eql yaml_match


    describe 'rendered container', ->

      beforeEach ->
        select.render()

      it 'should have the operator in view', ->
        $el = select.$container.find('.select-operator-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'matches'

      it 'should have a field in the view', ->
        $el = select.$container.find('.select-field-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'summary'

      it 'should have a value in the view', ->
        logger 'select.$container', select.$container.html()
        $el = select.$container.find('.select-value-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal '/text/'

      it 'should have the operator input in edit', ->
        $el = select.$container.find('.select-operator > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'match'

      it 'should have the field input in edit', ->
        $el = select.$container.find('.select-field > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'summary'

      it 'should have the value input in edit', ->
        $el = select.$container.find('.select-values > input')
        logger 'input edit', select.$container, select.$container.html()
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal '/text/'

      it 'should reproduce the yaml select from dom', ->
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_match

    
    describe 'rendered container with many values', ->

      value = ['one','two']

      beforeEach ->
        select = new SelectMatch
          rule: {}
          field: 'summary'
          value: value
        select.render()

      it 'should have two values in the view', ->
        logger 'select.$container', select.$container.html()
        $el = select.$container.find('.select-value-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'one or two'

      it 'should have two values in the edit', ->
        logger 'select.$container', select.$container.html()
        $el = select.$container.find('input.input-verb-select-match-values')
        expect( $el.length ).to.equal 2
        $el.each (i,e)->
          expect( $(e).val() ).to.equal value[i]


    describe 'generated yaml', ->

      it 'should reproduce the yaml select from dom', ->
        select = SelectMatch.generate yaml_match, default_opts
        select[0].render()
        expect( select[0].dom_to_yaml_obj() ).to.eql yaml_match

      it 'should reproduce the yaml select with many values from dom', ->
        select = _.first SelectMatch.generate yaml_match_array, default_opts
        select.render()
        logger 'dom to yaml', select.dom_to_yaml_obj()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_match_array


    describe 'test select', ->

      it 'should match a single value', ->
        ev_test_result = select.test_event summary:'text'
        expect( ev_test_result ).to.eql true

      it 'should not match a single value', ->
        ev_test_result = select.test_event summary:'ACVASD'
        expect( ev_test_result ).to.eql false

      it 'should match from an array of values', ->
        selects = SelectMatch.generate yaml_match_array, default_opts
        ev_test_result = for select in selects
          select.test_event node:'then'
        expect( ev_test_result ).to.eql [true]

      it 'should not match from an array of values', ->
        selects = SelectMatch.generate yaml_match_array, default_opts
        ev_test_result = for select in selects
          select.test_event node:'about'
        expect( ev_test_result ).to.eql [false]


  describe 'equals', ->

    select = null

    yaml_equals_array =
      equals:
        tag: [ 'test', 'then', 'that' ]
    
    yaml_equals =
      equals:
        summary: 'complete summary'

    beforeEach ->
      select = new SelectEquals
        rule: {}
        field: 'summary'
        value: 'complete summary'


    describe 'instance', ->

      it 'creates a SelectEquals instance', ->
        expect( select ).to.be.an.instanceof SelectEquals

      it 'should have a verb', ->
        expect( select ).to.have.property 'verb'
        expect( select.verb ).to.eql 'equals'

      it 'should reproduce the yaml select', ->
        gen = SelectEquals.generate yaml_equals, default_opts
        expect( gen[0].to_yaml_obj() ).to.eql yaml_equals


    describe 'rendered container with one value', ->

      beforeEach ->
        select.render()

      it 'should have the operator in view', ->
        $el = select.$container.find('.select-operator-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'equals'

      it 'should have a field in the view', ->
        $el = select.$container.find('.select-field-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'summary'

      it 'should have a value in the view', ->
        logger 'select.$container', select.$container.html()
        $el = select.$container.find('.select-value-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'complete summary'

      it 'should have the operator input in edit', ->
        $el = select.$container.find('.select-operator > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'equals'

      it 'should have the field input in edit', ->
        $el = select.$container.find('.select-field > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'summary'

      it 'should have the value input in edit', ->
        $el = select.$container.find('.select-values > input')
        logger 'input edit', select.$container, select.$container.html()
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'complete summary'

      it 'should reproduce the yaml select from dom', ->
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_equals

    
    describe 'rendered container with many values', ->

      value = ['one','two']

      beforeEach ->
        select = new SelectEquals
          rule: {}
          field: 'summary'
          value: value
        select.render()

      it 'should have two values in the view', ->
        logger 'select.$container', select.$container.html()
        $el = select.$container.find('.select-value-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'one or two'

      it 'should have two values in the edit', ->
        logger 'select.$container', select.$container.html()
        $el = select.$container.find('input.input-verb-select-equals-values')
        expect( $el.length ).to.equal 2
        $el.each (i,e)->
          expect( $(e).val() ).to.equal value[i]

    describe 'yaml generated', ->

      it 'should reproduce the yaml select from dom', ->
        select = SelectEquals.generate yaml_equals, default_opts
        select[0].render()
        expect( select[0].dom_to_yaml_obj() ).to.eql yaml_equals

      it 'should reproduce the yaml array select from dom', ->
        select = _.first SelectEquals.generate yaml_equals_array, default_opts
        select.render()
        logger 'dom to yaml', select.dom_to_yaml_obj()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_equals_array


    describe 'test select', ->

      it 'should match a single value', ->
        ev_test_result = select.test_event summary:'complete summary'
        expect( ev_test_result ).to.eql true

      it 'should not match a single value', ->
        ev_test_result = select.test_event summary:'ACVASD'
        expect( ev_test_result ).to.eql false

      it 'should match from an array of values', ->
        selects = SelectEquals.generate yaml_equals_array, default_opts
        ev_test_result = for select in selects
          select.test_event tag:'that'
        expect( ev_test_result ).to.eql [true]

      it 'should not match from an array of values', ->
        selects = SelectEquals.generate yaml_equals_array, default_opts
        ev_test_result = for select in selects
          select.test_event node:'about'
        expect( ev_test_result ).to.eql [false]


  describe 'field_exists', ->

    select = null
    yaml_field_exists = field_exists: 'node'

    beforeEach ->
      select = new SelectFieldExists rule: {}
      select.render()

    it 'creates an SelectFieldExists instance', ->
      expect( select ).to.be.an.instanceof SelectFieldExists
    
    it 'should have an verb', ->
      expect( select ).to.have.property 'verb'
      expect( select.verb ).to.eql 'field_exists'

    it 'should reproduce the yaml select', ->
      select = SelectFieldExists.generate yaml_field_exists, default_opts
      expect( select.to_yaml_obj() ).to.eql yaml_field_exists

    it 'should have the operator the renderedv view', ->
      $el = select.$container
      logger 'find', $el, $el.html()
      expect( $el.find('.select-operator-view').text().trim() ).to.equal 'exists'

    it 'should have a field in the rendered view', ->
      select.field = 'test'
      select.render()
      $el = select.$container
      logger 'find', $el, $el.html()
      expect( $el.find('.select-field-view').text().trim() ).to.equal 'test'

    it 'should have the operator in the rendered edit template', ->
      $el = select.$container
      select.render()
      logger 'find', $el, $el.html()
      expect( $el.find('.select-operator > input').val() ).to.equal 'field_exists'

    it 'should have the field in the rendered edit template', ->
      select = SelectFieldExists.generate yaml_field_exists, default_opts
      select.render()
      $el = select.$container
      expect( $el.find('.select-field > input').length ).to.equal 1
      expect( $el.find('.select-field > input').val() ).to.equal 'node'

    it 'should reproduce the yaml select from dom', ->
      select = SelectFieldExists.generate yaml_field_exists, default_opts
      select.render()
      logger 'render', select.render().html()
      expect( select.dom_to_yaml_obj() ).to.eql yaml_field_exists



  describe 'field_missing', ->

    select = null
    yaml_field_missing = field_missing: 'tag'

    beforeEach ->
      select = new SelectFieldMissing rule: {}


    describe 'instance', ->
      it 'creates a SelectFieldMissing instance', ->
        expect( select ).to.be.an.instanceof SelectFieldMissing
      
      it 'should have an verb', ->
        expect( select ).to.have.property 'verb'
        expect( select.verb ).to.eql 'field_missing'

      it 'should reproduce the yaml select', ->
        select = SelectFieldMissing.generate yaml_field_missing, default_opts
        expect( select.to_yaml_obj() ).to.eql yaml_field_missing


    describe 'rendered container', ->

      beforeEach ->
        select.field = 'tag'
        select.render()

      it 'should have the operator in the rendered view', ->
        $el = select.$container.find('.select-operator-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'is missing'

      it 'should have a field in the rendered view', ->
        $el = select.$container.find('.select-field-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'tag'

      it 'should have the operator in the rendered edit template', ->
        $el = select.$container.find('.select-operator > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'field_missing'

      it 'should have the field in the rendered edit template', ->
        $el = select.$container.find('.select-field > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'tag'

      it 'should reproduce the yaml select from dom', ->
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_field_missing

    describe 'yaml and dom', ->

      it 'should reproduce the yaml from dom', ->
        select = SelectFieldMissing.generate yaml_field_missing, default_opts
        select.render()
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_field_missing



  describe 'starts_with', ->

    select = null
    yaml_starts_with =
      starts_with:
        superfield: 'check'

    beforeEach ->
      select = new SelectStartsWith rule: {}


    describe 'instance', ->

      it 'creates a SelectStartsWith instance', ->
        expect( select ).to.be.an.instanceof SelectStartsWith
      
      it 'should have a verb', ->
        expect( select ).to.have.property 'verb'
        expect( select.verb ).to.eql 'starts_with'

      it 'should reproduce the yaml select', ->
        gen = SelectStartsWith.generate yaml_starts_with, default_opts
        expect( gen[0].to_yaml_obj() ).to.eql yaml_starts_with


    describe 'rendered container', ->

      beforeEach ->
        select.field = 'superfield'
        select.value = 'check'
        select.render()

      it 'should have the operator in view', ->
        $el = select.$container.find('.select-operator-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'starts with'

      it 'should have a field in the view', ->
        $el = select.$container.find('.select-field-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'superfield'

      it 'should have a value in the view', ->
        $el = select.$container.find('.select-value-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'check'

      it 'should have the operator input in edit', ->
        $el = select.$container.find('.select-operator > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'starts_with'

      it 'should have the field input in edit', ->
        $el = select.$container.find('.select-field > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'superfield'

      it 'should have the value input in edit', ->
        $el = select.$container.find('.select-value > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'check'

      it 'should reproduce the yaml select from dom', ->
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_starts_with


    describe 'yaml generated', ->

      it 'should reproduce the yaml select from dom', ->
        select = SelectStartsWith.generate yaml_starts_with, default_opts
        select[0].render()
        expect( select[0].dom_to_yaml_obj() ).to.eql yaml_starts_with



  describe 'ends_with', ->

    select = null
    yaml_ends_with =
      ends_with:
        fiendeld: 'latestring'

    beforeEach ->
      select = new SelectEndsWith
        rule: {}
        field: 'fiendeld'
        value: 'latestring'

    describe 'instance', ->

      it 'creates a SelectEndsWith instance', ->
        expect( select ).to.be.an.instanceof SelectEndsWith

      it 'should have a verb', ->
        expect( select ).to.have.property 'verb'
        expect( select.verb ).to.eql 'ends_with'

      it 'should reproduce the yaml select', ->
        gen = SelectEndsWith.generate yaml_ends_with, default_opts
        expect( gen[0].to_yaml_obj() ).to.eql yaml_ends_with


    describe 'rendered container', ->

      beforeEach ->
        select.render()

      it 'should have the operator in view', ->
        $el = select.$container.find('.select-operator-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'ends with'

      it 'should have a field in the view', ->
        $el = select.$container.find('.select-field-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'fiendeld'

      it 'should have a value in the view', ->
        $el = select.$container.find('.select-value-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'latestring'

      it 'should have the operator input in edit', ->
        $el = select.$container.find('.select-operator > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'ends_with'

      it 'should have the field input in edit', ->
        $el = select.$container.find('.select-field > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'fiendeld'

      it 'should have the value input in edit', ->
        $el = select.$container.find('.select-value > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'latestring'

      it 'should reproduce the yaml select from dom', ->
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_ends_with


    describe 'yaml generated', ->

      it 'should reproduce the yaml select from dom', ->
        select = SelectEndsWith.generate yaml_ends_with, default_opts
        select[0].render()
        expect( select[0].dom_to_yaml_obj() ).to.eql yaml_ends_with




  describe 'less_than', ->

    select = null
    yaml_less_than =
      less_than:
        severity: 3

    beforeEach ->
      select = new SelectLessThan
        rule: {}
        field: 'severity'
        value: 3


    describe 'instance', ->

      it 'creates a SelectLessThan instance', ->
        expect( select ).to.be.an.instanceof SelectLessThan

      it 'should have a verb', ->
        expect( select ).to.have.property 'verb'
        expect( select.verb ).to.eql 'less_than'

      it 'should reproduce the yaml select', ->
        gen = SelectLessThan.generate yaml_less_than, default_opts
        expect( gen[0].to_yaml_obj() ).to.eql yaml_less_than


    describe 'rendered container', ->

      beforeEach ->
        select.render()

      it 'should have the operator in view', ->
        $el = select.$container.find('.select-operator-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'is less than'

      it 'should have a field in the view', ->
        $el = select.$container.find('.select-field-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'severity'

      it 'should have a value in the view', ->
        $el = select.$container.find('.select-value-view')
        expect( $el.length ).to.equal 1
        expect( parseInt $el.text().trim() ).to.equal 3

      it 'should have the operator input in edit', ->
        $el = select.$container.find('.select-operator > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'less_than'

      it 'should have the field input in edit', ->
        $el = select.$container.find('.select-field > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'severity'

      it 'should have the value input in edit', ->
        $el = select.$container.find('.select-value > input')
        expect( $el.length ).to.equal 1
        expect( parseInt $el.val() ).to.equal 3

      it 'should reproduce the yaml select from dom', ->
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_less_than


    describe 'yaml generated', ->

      it 'should reproduce the yaml select from dom', ->
        select = SelectLessThan.generate yaml_less_than, default_opts
        select[0].render()
        expect( select[0].dom_to_yaml_obj() ).to.eql yaml_less_than

 

  describe 'greater_than', ->

    select = null
    yaml_greater_than =
      greater_than:
        severity: 5

    beforeEach ->
      select = new SelectGreaterThan
        rule: {}
        field: 'severity'
        value: 5


    describe 'instance', ->

      it 'creates a SelectGreaterThan instance', ->
        expect( select ).to.be.an.instanceof SelectGreaterThan

      it 'should have a verb', ->
        expect( select ).to.have.property 'verb'
        expect( select.verb ).to.eql 'greater_than'

      it 'should reproduce the yaml select', ->
        gen = SelectGreaterThan.generate yaml_greater_than, default_opts
        expect( gen[0].to_yaml_obj() ).to.eql yaml_greater_than


    describe 'rendered container', ->

      beforeEach ->
        select.render()

      it 'should have the operator in view', ->
        $el = select.$container.find('.select-operator-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'is greater than'

      it 'should have a field in the view', ->
        $el = select.$container.find('.select-field-view')
        expect( $el.length ).to.equal 1
        expect( $el.text().trim() ).to.equal 'severity'

      it 'should have a value in the view', ->
        $el = select.$container.find('.select-value-view')
        expect( $el.length ).to.equal 1
        expect( parseInt $el.text().trim() ).to.equal 5

      it 'should have the operator input in edit', ->
        $el = select.$container.find('.select-operator > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'greater_than'

      it 'should have the field input in edit', ->
        $el = select.$container.find('.select-field > input')
        expect( $el.length ).to.equal 1
        expect( $el.val() ).to.equal 'severity'

      it 'should have the value input in edit', ->
        $el = select.$container.find('.select-value > input')
        expect( $el.length ).to.equal 1
        expect( parseInt $el.val() ).to.equal 5

      it 'should reproduce the yaml select from dom', ->
        logger 'render', select.render().html()
        expect( select.dom_to_yaml_obj() ).to.eql yaml_greater_than


    describe 'yaml generated', ->

      it 'should reproduce the yaml select from dom', ->
        select = SelectGreaterThan.generate yaml_greater_than, default_opts
        select[0].render()
        expect( select[0].dom_to_yaml_obj() ).to.eql yaml_greater_than


