describe 'Actions', ->

  logger = debug 'oa:test:event:actions'
  simple_yaml = { name: 'test' }
  rule_stub = {}
  $container = $('<div/>')
  $('#actions-render-test').append $container
  default_opts = rule: rule_stub, typeaheads: false

  beforeEach ->
    # create a sperate test container for each
    $container = $('<div/>')
    $('#actions-render-test').append $container

  describe 'Types', ->

    it 'should have action types', ->
      logger 'ActionTypes.types', ActionTypes.all_types()
      expect( ActionTypes.types ).to.have.all.keys [
        '_initial'
        'discard'
        'set'
#        'skip'
        'stop'
        'stop_rule_set'
        'replace'
      ]

  describe 'ActionSet',->

    it 'should have the verb lookup class attached', ->
      expect( Actions ).to.have.property 'verb_lookup_class'
      .and.to.equal ActionTypes
    
    it 'should have the verb class attached', ->
      expect( Actions ).to.have.property 'verb_class'
      .and.to.equal ActionBase


  describe 'in a group', ->

    action_set = null
    opts = null

    beforeEach ->
      $container = $('<div/>')
      $('#actions-render-test').append $container
      opts = _.defaults $container: $container, default_opts

      yaml_rule =
        discard: true
        set:
          node: 'bluesky'
      action_set = Actions.generate yaml_rule, opts
      action_set.render()
      logger 'action_set contianer', action_set.$container

    it 'should render all actions', ->
      action_set.render()
      expect( action_set.$container.find('.action-entry').length ).to.eql 2
    
    it 'should attach this Action VerbSet object to the dom container', ->
      expect( action_set.$container.data('verb_set') ).to.equal action_set
      expect( $.data action_set.$container[0], 'verb_set' ).to.equal action_set

    it 'should re render a single action in place', ->
      verb = action_set.get_instance(1)
      verb.value = 'redsky'
      verb.render()
      action_set.render()
      logger 'test verb values', verb, action_set.$container.find('.action-value > input')
      #action_set.render_instance(1)
      expect(
        action_set.$container
        .find(".action-value > input").val()
      ).to.eql 'redsky'

    it 'should re render all actions in place', ->
      action_set.$container.html('')
      action_set.render()
      expect( action_set.$container.find(".action-entry-edit").length ).to.eql 2

    it 'should remove an action', ->
      expect( action_set.$container.find(".action-entry-edit").length ).to.eql 2
      expect( action_set.$container.find(".action-entry-view").length ).to.eql 2
      verb = action_set.get_instance 0
      expect( action_set.remove_instance verb ).to.not.be.true
      expect( action_set.$container.find(".action-entry-edit").length ).to.eql 1

    it 'should append an action', ->
      action_set.add_instance new ActionStop opts
      expect( action_set.$container.find(".action-entry-edit").length ).to.eql 3

    it 'should create a new _initial action', ->
      verb = action_set.create_verb() 
      expect( verb ).to.have.property 'euid'
      expect( verb ).to.have.property 'verb'
      .and.to.equal '_initial'

    it 'should generate a new _initial action on the set', ->
      verb = action_set.generate_verb( '_initial', typeaheads: false ) 
      expect( action_set.$container.find(".action-entry-edit").length ).to.eql 3
    
    it 'should attach the new InitialVerb object to the verb container', ->
      verb = action_set.generate_verb( '_initial', typeaheads: false ) 
      expect( verb.$container.data('verb') ).to.equal verb
      #logger $.data(verb.$container)
      #expect( $.data verb.$container, 'verb' ).to.equal verb

    it 'should replace an action', ->
      oldv = action_set.get_instance 1
      newv = action_set.generate_verb( '_initial', typeaheads: false ) 
      action_set.replace_verb oldv, newv
      expect( action_set.$container.find(".action-entry-edit").length ).to.eql 2
      expect( action_set.find_input_el( newv.euid, 'operator' ).val() ).to.equal ''



  describe 'generated from yaml', ->

    yaml_rule =
      set:
        fieldb: 'testb'
      discard: true
      skip: false
      stop: true
      debug: true
      delete: 'name'

    yaml_actions =
      set:
        fieldb: 'testb'
      discard: true
      stop: true
      delete: 'name'

    yaml_replace_rule = replace: [
      field: 'nfield'
      this: '/nsearch/'
      with: 'nreplace'
    ,
      field: 'vfield'
      this: '/vsearch/'
      with: 'vreplace'
    ]

    it 'should have an action', ->
      actions = Actions.generate yaml_rule, rule: {}
      expect( actions ).to.be.an.instanceof Actions
      expect( actions.get_instances() ).to.be.an.instanceof Array
      expect( actions.get_instances().length ).to.eql 4

    it 'should reproduce the yaml action', ->
      actions = Actions.generate yaml_rule, { rule: {}, render: true }
      logger 'render', actions.render()
      #$('#action-render-test').append actions.render()
      back_to_yaml = actions.to_yaml_obj()
      logger 'back_to_yaml', back_to_yaml
      expect( back_to_yaml ).to.eql yaml_actions

    it 'should reproduce the complex replace yaml action', ->
      actions = Actions.generate yaml_replace_rule, default_opts
      actions.render()
      expect( actions.to_yaml_obj() ).to.eql yaml_replace_rule

    it 'should remove an action from yaml', ->
      action_set = Actions.generate yaml_rule, default_opts
      action_set.render()
      verb = action_set.get_instance 0
      expect( action_set.remove_instance verb ).to.not.be.true
      expect( action_set.$container.find(".action-entry-edit").length ).to.eql 3
      expect( action_set.dom_to_yaml_obj ).to.not.have.key 'set'
      .and.to.have.keys 'discard', 'stop', 'delete'
