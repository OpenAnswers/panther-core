
describe 'Options', ->

  logger = debug 'oa:test:event:rules:options'
  render_test_id = '#option-render-test'
  simple_yaml = { name: 'test' }
  default_opts = rule: {}, render: true


  describe 'debug', ->

    option = null

    beforeEach ->
      option = new OptionDebug rule: {}

    it 'creates an OptionDebug instance', ->
      expect( option ).to.be.an.instanceof OptionDebug
    
    it 'should have the correct verb', ->
      expect( option ).to.have.property 'verb'
      expect( option.verb ).to.eql 'debug'

    it 'should reproduce the yaml option', ->
      rule = debug: true
      option = OptionDebug.generate rule, default_opts
      el = option.render()
      logger 'render', el
      $(render_test_id).append el
      expect( option.dom_to_yaml_obj() ).to.eql rule

    it 'should not represent a falsey yaml option', ->
      rule = debug: false
      option = OptionDebug.generate rule, default_opts
      expect( option ).to.be.falsey


  describe 'skip', ->

    option = null

    beforeEach ->
      option = new OptionSkip rule: {}

    it 'creates an OptionSkip instance', ->
      expect( option ).to.be.an.instanceof OptionSkip
    
    it 'should have the correct verb', ->
      expect( option ).to.have.property 'verb'
      expect( option.verb ).to.eql 'skip'

    it 'should reproduce the yaml option', ->
      rule = skip: true
      option = OptionSkip.generate rule, default_opts
      el = option.render()
      logger 'render', el
      $(render_test_id).append el
      expect( option.dom_to_yaml_obj() ).to.eql rule

    it 'should not represent a falsey yaml option', ->
      rule = skip: false
      option = OptionSkip.generate rule, default_opts
      expect( option ).to.be.falsey


  describe 'generated from yaml', ->

    yaml_rule =
      equals:
        aname: 'avalue'
      set:
        fieldb: 'testb'
      discard: true
      skip: true
      stop: true
      debug: true
      delete: 'name'

    yaml_falsey_rule =
      skip: false
      debug: false

    it 'should have an option', ->
      options = Options.generate yaml_rule, rule: {}
      expect( options ).to.be.an.instanceof Options
      expect( options.get_instances().length ).to.eql 2

    it 'should reproduce the yaml actions', ->
      options = Options.generate yaml_rule, { rule: {}, render: true }
      logger 'render', options.render()
      #$('#action-render-test').append options.render()
      expect( options.to_yaml_obj() ).to.eql { skip: true, debug: true }

    it 'should remove the falsey values', ->
      options = Options.generate yaml_falsey_rule, { rule: {}, render: true }
      logger 'render', options.render()
      #$('#action-render-test').append options.render()
      expect( options.to_yaml_obj() ).to.eql {}
