
describe 'Action', ->

  logger = debug 'oa:test:event:rules:action'
  render_test_id = '#action-render-test'
  simple_yaml = { name: 'test' }
  default_opts = rule: {}, $container: $('<div/>')

  describe 'base implementation', ->

    it 'can create an ActionBase instance', ->
      action = new ActionBase rule: {}
      expect( action ).to.be.an.instanceof ActionBase
        

  describe 'discard', ->

    action = null
    
    beforeEach ->
      action = new ActionDiscard default_opts

    it 'can create an ActionDiscard instance', ->
      expect( action ).to.be.an.instanceof ActionDiscard
    
    it 'should have the discard verb', ->
      expect( action ).to.have.property 'verb'
      expect( action.verb ).to.eql 'discard'

    it 'should have a view template attached', ->
      expect( action ).to.have.property 'template_view'
      logger 'discard template_view', action.template_view
      expect( action.template_view ).to.be.a 'string'
      expect( action.template_view.length ).to.be.gt 10

    it 'should have an edit template attached', ->
      expect( action ).to.have.property 'template_edit'
      logger 'discard template_edit', action.template_edit
      expect( action.template_edit ).to.be.an 'string'
      expect( action.template_edit.length ).to.be.gt 10

    it 'should have the operator in the view template', ->
      action.render()
      logger 'find', action.$container
      action_el_val = action.$container.find('.action-operator > input').val()
      expect( action_el_val ).to.eql 'discard'

    it 'should reproduce the yaml action', ->
      action = ActionDiscard.generate discard: 'fieldname', default_opts
      el = action.render()
      logger 'render', el
      $(render_test_id).append el
      back_to_yaml = action.dom_to_yaml_obj()
      expect( back_to_yaml ).to.eql discard: true 


  describe 'set', ->

    action = null

    beforeEach ->
      action = new ActionSet rule: {}

    it 'creates an ActionSet instance', ->
      expect( action ).to.be.an.instanceof ActionSet
    
    it 'should have the discard verb', ->
      expect( action ).to.have.property 'verb'
      expect( action.verb ).to.eql 'set'

    it 'should have a view template attached', ->
      expect( action ).to.have.property 'template_view'
      logger 'discard template_view', action.template_view
      expect( action.template_view ).to.be.a 'string'
      expect( action.template_view.length ).to.be.gt 50

    it 'should have an edit template attached', ->
      expect( action ).to.have.property 'template_edit'
      logger 'discard template_edit', action.template_edit
      expect( action.template_edit ).to.be.a 'string'
      expect( action.template_edit.length ).to.be.gt 50

    it 'should have the operator in view template', ->
      el = action.render()
      expect( el.find('.action-view-operator').text() ).to.match /^set\s?$/

    it 'should have the operator in edit template', ->
      el = action.render()
      expect( el.find('.action-operator > input').val() ).to.eql 'set'

    it 'should reproduce the yaml action', ->
      action = ActionSet.generate set: bfield: 'new', default_opts
      back_to_yaml = action[0].to_yaml_obj()
      expect( back_to_yaml ).to.eql set: bfield: 'new'

    it 'should reproduce the yaml action from dom', ->
      action = ActionSet.generate set: bfield: 'new', default_opts
      el = action[0].render()
      logger 'render', el
      $(render_test_id).append el 
      back_to_yaml = action[0].dom_to_yaml_obj()
      expect( back_to_yaml ).to.eql set: bfield: 'new'

    it 'should pick up a dom change in yaml', ->
      action = ActionSet.generate set: bfield: 'new', default_opts
      el = action[0].render()
      el.find('.action-field > input').val('wakka')
      el.find('.action-value > input').val('old')
      expect( action[0].dom_to_yaml_obj() ).to.eql set: wakka: 'old'

  describe 'stop', ->

    action = null

    beforeEach ->
      action = new ActionStop rule: {}

    it 'creates an ActionStop instance', ->
      expect( action ).to.be.an.instanceof ActionStop
    
    it 'should have the discard verb', ->
      expect( action ).to.have.property 'verb'
      expect( action.verb ).to.eql 'stop'

    it 'should reproduce the yaml action', ->
      rule = stop: true
      action = ActionStop.generate rule, default_opts
      el = action.render()
      logger 'render', el
      $(render_test_id).append el
      expect( action.to_yaml_obj() ).to.eql rule


  describe 'stop_rule_set', ->

    action = null

    beforeEach ->
      action = new ActionStopRuleSet rule: {}

    it 'creates an ActionStopRuleSet instance', ->
      expect( action ).to.be.an.instanceof ActionStopRuleSet
    
    it 'should have the discard verb', ->
      expect( action ).to.have.property 'verb'
      expect( action.verb ).to.eql 'stop_rule_set'

    it 'should reproduce the yaml action', ->
      rule = stop_rule_set: true
      action = ActionStopRuleSet.generate rule, default_opts
      el = action.render()
      logger 'render', el
      $(render_test_id).append el
      expect( action.to_yaml_obj() ).to.eql rule


  describe 'replace', ->

    action = null
    test_rule_yaml =
      replace:
        field: 'nfield'
        this: '/search/'
        with: 'replace'

    beforeEach ->
      action = new ActionReplace rule: {}

    it 'creates an ActionReplace instance', ->
      expect( action ).to.be.an.instanceof ActionReplace
    
    it 'should have the discard verb', ->
      expect( action ).to.have.property 'verb'
      expect( action.verb ).to.eql 'replace'

    it 'should reproduce the yaml action', ->
      action = ActionReplace.generate test_rule_yaml, default_opts
      el = action[0].render()
      logger 'render', el
      $(render_test_id).append el
      expect( action[0].to_yaml_obj() ).to.eql test_rule_yaml

    it 'should create a new yaml object with thef field dom modified', ->
      action = ActionReplace.generate test_rule_yaml, default_opts
      el = action[0].render()
      el.find('.action-field > input').val('fieldt')
      el.find('.action-this > input').val('thist')
      el.find('.action-with > input').val('oldt')
      $(render_test_id).append el
      expect( action[0].to_yaml_obj() ).to.eql       replace:
        field: 'nfield'
        this: '/search/'
        with: 'replace'


