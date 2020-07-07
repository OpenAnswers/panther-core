


mocha.setup globals: ['Rule', 'Mustache', 'Templates', 'UI', 'GroupRule' ]

# mock some data
Data = {}
Data.selectorOperatorNames = [ 'match', 'equals' ]
Data.actionOperatorNames = [ 'discard', 'skip', 'replace' ]
Data.actionNames = []

describe 'A Rule', ->

  $container = null
  simple_yaml = { name: 'testname', all: true, discard: true }

  before ->
    $container = $('<li/>')
    $('#rule-render-test').append $container

  it 'creates a Rule instance', ->
    rule = new Rule 1,
      rule_set: {}
      yaml: simple_yaml
      event_rules: {}
      $container: $container

    expect( rule ).to.be.an.instanceof Rule

  describe 'when instantiated', ->

    it 'should store the yaml data', ->
      rule = new Rule 2, yaml: simple_yaml
      expect( rule.yaml ).to.eql simple_yaml

    it 'should store the index', ->
      rule = new Rule 3, yaml: simple_yaml
      expect( rule.index ).to.eql 3


  describe 'when generated', ->

    it 'attaches the correct yaml', ->
      rule = Rule.generate simple_yaml, { index: 1, rule_set: {} }
      expect( rule.yaml ).to.eql simple_yaml

  describe 'when rendered', ->

    rule = null

    before ->
      $container = $('<li/>')
      $('#rule-render-test').append $container
      rule = new Rule 1,
        rule_set: {}
        yaml: simple_yaml
        event_rules: {}
        $container: $container
      rule.render()

    it 'has some content html', ->
      expect( rule.$container ).to.have.property 'length'
      expect( rule.$container.length ) > 0
      expect( rule.$container.html() ).to.match /\<.+\>/

    it 'should have the name "test"', ->
      $name = rule.$container.find('.rule-name')
      expect( $name.text() ).to.equal 'testname'

    it 'has the `all` select', ->
      $selects = rule.$container.find '.selects'
      expect( $selects.length ).to.equal 1
      expect( $selects.text() ).to.match /all\s?/

    it 'has the `discard` action', ->
      $selects = rule.$container.find '.actions'
      expect( $selects.length ).to.equal 1
      expect( $selects.text() ).to.equal 'discard'

    it 'has tags', ->
      $selects = rule.$container.find '.metadata-tags'
      expect( $selects.length ).to.equal 1
      expect( $selects.text() ).to.match /Discard/

    it 'has tags via container_find', ->
      $selects = rule.container_find '.metadata-tags'
      expect( $selects.length ).to.equal 1
      expect( $selects.text() ).to.match /Discard/

    xit 'has the rule data attached to $container', ->
      expect( $.data(rule.$container,'rule') ).to.equal rule

    it 'has the rule data attached to $container', ->
      expect( rule.$container.data 'rule' ).to.equal rule

    it 'can find the rule data via closest', ->
      $md = rule.container_find '.metadata-tags'
      rule_ref = Rule.closest $md
      expect( rule_ref ).to.equal rule
