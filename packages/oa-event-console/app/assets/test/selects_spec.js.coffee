describe 'Selects', ->

  logger = debug 'oa:test:event:rules:selects'
  simple_yaml = { name: 'test' }
  rule_stub = {}
  default_opts = rule: rule_stub

  describe 'Types', ->

    it 'should have select types', ->
      logger 'SelectTypes.types', SelectTypes.all_types()
      expect( SelectTypes.types ).to.have.all.keys [
        '_initial'
        'all'
        'none'
        'match'
        'equals'
        'field_exists'
        'field_missing'
        'starts_with'
        'ends_with'
        'less_than'
        'greater_than'
      ]


  describe 'in a generated set', ->

    select_set = null
    
    beforeEach ->
      @timeout 30000000000
      $container = $('<div/>')
      $('#selects-render-test').html('').append $container
      logger 'container before', $container

      yaml_rule =
        all: true
        starts_with:
          test: 'bluesky'
        less_than:
          severity: 3
        equals:
          node: ['one','two']
      select_set = Selects.generate yaml_rule, _.defaults($container: $container, default_opts)
      select_set.render()

    it 'should render all selects', ->
      logger 'select_set in container', select_set.$container.html()
      expect( select_set.$container.find('.select-entry').length ).to.eql 4

    it 'should attach this SelectSet to the dom container', ->
      expect( $.data select_set.$container[0], 'verb_set' ).to.equal select_set
      expect( select_set.$container.data 'verb_set' ).to.equal select_set

    it 'should re render a single select instance in place', ->
      verb = select_set.get_instance(1)
      verb.value = 'redsky'
      verb.render()
      select_set.render()
      logger 'test verb values', verb, select_set.$container.find('.select-value > input')
      #select_set.render_instance(1)
      expect(
        select_set.$container
        .find(".select-value > input").val()
      ).to.eql 'redsky'

    it 'should re render all selects in place', ->
      select_set.$container.html('')
      select_set.render()
      expect( select_set.$container.find(".select-entry-edit").length ).to.eql 4

    it 'should remove an action', ->
      verb = select_set.get_instance 0
      expect( select_set.remove_instance verb ).to.not.be.true
      expect( select_set.$container.find(".select-entry-edit").length ).to.eql 3

    it 'should append an action', ->
      select_set.add_instance new SelectNone default_opts
      expect( select_set.$container.find(".select-entry-edit").length ).to.eql 5

    it 'should create a new _initial action', ->
      verb = select_set.create_verb() 
      expect( verb ).to.have.property 'euid'
      expect( verb ).to.have.property 'verb'
      .and.to.equal '_initial'

    it 'should generate a new _initial action on the set', ->
      verb = select_set.generate_verb( '_initial', typeaheads: false ) 
      $el = select_set.$container
      expect( $el.find(".select-entry-edit").length ).to.eql 5
      logger '$el', $el.html()
      expect( $el.find(".input-verb-select-_initial-operator").length ).to.eql 1
      expect( $el.find(".input-verb-select-_initial-operator").length ).to.eql 1
    
    it 'should attach the new Initial object to the dom container', ->
      verb = select_set.generate_verb( '_initial', typeaheads: false ) 
      expect( $.data(verb.$container[0],'verb') ).to.equal verb
      expect( verb.$container.data('verb') ).to.equal verb

    it 'should replace an select', ->
      oldv = select_set.get_instance 1
      newv = select_set.generate_verb( '_initial', typeaheads: false ) 
      select_set.replace_verb oldv, newv
      expect( select_set.$container.find(".select-entry-edit").length ).to.eql 4
      expect( select_set.find_input_el( newv.euid, 'operator' ).val() ).to.equal ''



  describe 'generated from yaml', ->

    yaml_selects =
      all: true
      none: false
      match:
        aname: 'something'
      equals:
        bname: 'otherthing'
      field_exists: 'imhere'
      field_missing: 'nothere'
      ends_with:
        dfield: 'thatbit'
      starts_with:
        cfield: 'starter'
      less_than:
        efield: 4
      greater_than:
        ffield: 10

    yaml_sel_rule = _.defaults discard: true, yaml_selects, 

    yaml_complex =
      match:
        aname: 'something'
        what: 'slightly'
      equals:
        bname: 'otherthing'
        other: 'this'

    it 'should have an action', ->
      selects = Selects.generate yaml_sel_rule, rule: {}
      expect( selects ).to.be.an.instanceof Selects
      expect( selects.get_instances() ).to.be.an.instanceof Array
      expect( selects.get_instances().length ).to.eql 10

    it 'should reproduce the yaml selects from the rule', ->
      selects = Selects.generate yaml_sel_rule, rule: {}
      back_to_yaml = selects.to_yaml_obj()
      logger 'back_to_yaml', back_to_yaml, yaml_selects
      expect( back_to_yaml ).to.eql yaml_selects

    it 'should reproduce the complex duplicate selects', ->
      selects = Selects.generate yaml_complex, default_opts
      selects.render()
      back = selects.dom_to_yaml_obj()
      logger 'out', back, yaml_complex
      expect( back ).to.eql yaml_complex

    it 'should remove a select from yaml', ->
      select_set = Selects.generate yaml_sel_rule, default_opts
      select_set.render()
      verb = select_set.get_instance 0
      expect( select_set.remove_instance verb ).to.not.be.true
      expect( select_set.$container.find(".select-entry-edit").length ).to.eql 9
      expect( select_set.dom_to_yaml_obj() )
        .to.not.have.key 'set'
        .and.to.have.keys 'discard', 'stop', 'delete'
