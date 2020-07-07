
# # RuleVerbBase and RuleVerbType Tests

describe 'RuleVerbBase', ->

  logger = debug 'oa:test:event:rules:rule_verb_base'
  render_test_id = '#ruleverb-render-test'
  simple_yaml = { name: 'test' }
  default_opts = rule: {}


  describe 'class', ->
    
    it 'should have verb and template properties', ->
      expect( RuleVerbBase ).have.property( 'verb' ).and.to.be.a 'string'
      expect( RuleVerbBase ).have.property( 'verb_type' ).and.to.be.a 'string'
      expect( RuleVerbBase ).have.property( 'template_id' ).and.to.be.a 'string'
      #expect( RuleVerbBase ).have.property( 'template_tag' ).and.to.be.a 'string'

    it 'should have a generate function', ->
      expect( RuleVerbBase )
      .have.property 'generate'
      .and.to.be.a 'function'

    it 'should have a generate_tempate function', ->
      expect( RuleVerbBase )
      .have.property 'generate_template'
      .and.to.be.a 'function'

    it 'should have a generate_tempates function', ->
      expect( RuleVerbBase )
      .have.property 'generate_templates'
      .and.to.be.a 'function'


  describe 'instance', ->

    rvb = null

    beforeEach ->
      rvb = new RuleVerbBase rule: {}

    it 'should be a RuleVerbBase', ->
      expect( rvb )
        .to.be.an.instanceof RuleVerbBase
    
    it 'should have a verb', ->
      expect( rvb )
        .to.have.property 'verb'
        .and.to.eql '_basse_'
    
    it 'should have a verb_type', ->
      expect( rvb )
        .to.have.property 'verb_type'
        .and.to.eql '_basetype_'

    xit 'should have a view template id', ->
      expect( rvb )
        .to.have.property 'template_view'
        .and.to.be.a 'string'

    xit 'should have a edit template id', ->
      expect( rvb )
        .to.have.property 'template_edit'
        .and.to.be.a 'string'

    it 'should have a logger', ->
      expect( rvb )
        .to.have.property 'logger'
        .and.to.be.a 'function'



  describe 'extended to TestVerb', ->

    TestVerb = null

    before ->
      class TestVerb extends RuleVerbBase
        @logger = -> "custom"
        @verb = 'test'
        @verb_type = 'wakka'
        @template_id = '#template-rvb-atest'

      #@generate_templates()

    it 'should attach templates via generate_tempates', ->
      expect( -> TestVerb.generate_templates() ).to.not.throw(Error)
      # can't chain length with .and!?
      expect( TestVerb.template_view ).to.be.string
      expect( TestVerb.template_view ).to.have.length.above 20
      expect( TestVerb.template_edit ).to.be.string
      expect( TestVerb.template_edit ).to.have.length.above 20

    it 'enables editing', ->
      rvb = new TestVerb rule: {}, typeaheads: false
      expect( rvb.enable_editing() ).to.be.defined


describe 'RuleVerbTypes', ->
  
  logger = debug 'oa:test:event:rules:rule_verb_types'
  simple_yaml = { name: 'test' }
  default_opts = rule: {}

  describe 'class', ->

    it 'should have a types object', ->
      expect( RuleVerbTypes )
        .to.have.property 'types'
        .and.to.be.an.object

    it 'should have a verb_type', ->
      expect( RuleVerbTypes )
        .to.have.property 'verb_type'
        .and.to.be.a.string

    it 'should have a class type for it\'s children', ->
      expect( RuleVerbTypes )
        .to.have.property 'contains_class'
        .and.to.equal RuleVerbBase

    it 'should have functions', ->
      props = [
        'lookup_type'
        'all_types'
        'active_types'
        'find_types_in'
        'expect_class_type'
        'check_class_type'
      ]
      for p in props
        expect( RuleVerbTypes ).to.have.property p
        .and.be.a.function


  describe 'extended to TestType', ->

    TestTypes = null
    class TT
    class EE
      @disabled: true
    class HH
      @hidden: true

    before ->
      class TestTypes extends RuleVerbTypes
        @types =
          test: TT
          next: EE
          hide: HH

        @logger = (args...)->
          console.log("custom test logger",args...)
          "custom"
        @verb_type = 'wakka'
        @template_id = '#template-rvb-atest'


    describe 'class', ->
      
      it 'has the types property', ->
        expect( TestTypes )
          .to.have.property 'types'
          .and.to.be.an.object
        
      it 'should lookup the "test" verb name', ->
        expect( TestTypes.lookup_type 'test' ).to.equal TT

      it 'should return false for an unknown type name', ->
        expect( TestTypes.lookup_type 'testno' ).to.equal false

      it 'should get the "next" verb name', ->
        expect( TestTypes.get_type 'next' ).to.equal EE

      it 'should throw getting an unknown name', ->
        expect( -> TestTypes.get_type 'nextno' ).to.throw Error

      it 'should return all types array', ->
        expect( TestTypes.all_types() ).to.be.an.instanceof Array
        expect( TestTypes.all_types() ).to.eql ['test','next','hide']

      it 'should return active types array', ->
        expect( TestTypes.active_types() ).to.be.an.instanceof Array
        expect( TestTypes.active_types() ).to.eql ['test']



describe 'RuleVerbSet', ->
  
  logger = debug 'oa:test:event:rules:rule_verb_types'
  simple_yaml = { name: 'test' }
  default_opts = rule: {}

  describe 'class', ->

    it 'should have a verb_type', ->
      expect( RuleVerbSet )
        .to.have.property 'verb_type'
        .and.to.be.a.string

    it 'should have a class type for it\'s children', ->
      expect( RuleVerbSet )
        .to.have.property 'verb_class'
        .and.to.equal RuleVerbBase

    it 'should have a lookup class type for it\'s childrens class', ->
      expect( RuleVerbSet )
        .to.have.property 'verb_lookup_class'
        .and.to.equal RuleVerbTypes

    it 'should have functions', ->
      props = [
        'expect_class_type'
        'check_class_type'
        'generate'
      ]
      for p in props
        expect( RuleVerbSet ).to.have.property p
        .and.be.a.function


  describe 'instance', ->

    tt = null

    beforeEach ->
      tt = new RuleVerbSet rule: {}

    it 'should have functions', ->
      props = [
        'get_instance'
        'get_instances'
        'add_instances'
        'add_instance'
        'remove_instance'
        'generate_verb'
        'create_verb'
        'replace_verb'
        'render'
        'render_tag_html'
        'dom_to_yaml_obj'
        'to_yaml_obj'
      ]
      for p in props
        expect( tt ).to.have.property p
        .and.be.a.function


  describe 'extended to TestSet', ->

    TestSet = null
    TestVerb = null

    # Setup some extended class instances
    before ->
      class TestSet extends RuleVerbSet
        @logger = (args...)->
          console.log("custom test logger",args...)
          "custom"
        @verb_type = 'wakka'
        @template_id = '#template-rvb-atest'

      class TestVerb extends RuleVerbBase
        @template_id: "#template-rvb-atest"
        @verb_type: 'wakka'
        @generate_templates()

    describe 'generate', ->
      it 'should attach templates via generate_tempates', ->
        TestSet.generate {}, default_opts
        expect( -> TestSet.generate {}, default_opts ).to.not.throw(Error)


    describe 'the generated instance', ->
      group = null
      verb = null
      beforeEach ->
        group = TestSet.generate {}, default_opts
        verb = new TestVerb default_opts

      it 'has a custom test logger', ->
        expect( group )
          .to.have.property 'logger'
          .and.to.be.a.function
        expect( group.logger() ).to.equal "custom"
      
      it 'has a custom verb_type', ->
        expect( group )
          .to.have.property 'verb_type'
          .and.equal "wakka"

      it 'has no verb instances', ->
        expect( group.get_instances() ).to.be.an.array
        expect( group.get_instances() ).to.have.length 0

      it 'adds one verb instance', ->
        expect( group.add_instance( verb ) )
        expect( group.get_instances() ).to.have.length 1

      it 'gets an instance by object', ->
        group.add_instance verb
        expect( group.get_instance(verb) ).to.equal verb

      it 'gets an instance by index', ->
        group.add_instance verb
        expect( group.get_instance(0) ).to.equal verb

      it 'gets an instance by verb element uid', ->
        group.add_instance verb
        expect( group.get_instance(verb.euid) ).to.equal verb
