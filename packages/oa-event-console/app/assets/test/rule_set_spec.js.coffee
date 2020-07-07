


mocha.setup globals: [ 'Mustache', 'Templates', 'UI' ]

# mock some data
Data = {}
Data.selectorOperatorNames = [ 'match', 'equals' ]
Data.actionOperatorNames = [ 'discard', 'skip', 'replace' ]
Data.actionNames = []

describe 'A RuleSet', ->

  $container = null
  simple_yaml = [{ name: 'testname', all: true, discard: true }]

  before ->
    $container = $('<div/>')
    $('#rule-set-render-test').append $container

  it 'creates a RuleSet instance', ->
    rule_set = new RuleSet
      yaml: simple_yaml
      event_rules: {}
      $container: $container

    expect( rule_set ).to.be.an.instanceof RuleSet

  describe 'when instantiated', ->

    it 'should store the yaml data', ->
      rule_set = new RuleSet yaml: simple_yaml
      expect( rule_set.yaml ).to.eql simple_yaml

    it 'should store the index', ->
      rule_set = new RuleSet yaml: simple_yaml
      expect( rule_set.rules.length ).to.eql 1


  describe 'when generated', ->

    it 'attaches the correct yaml', ->
      rule_set = RuleSet.generate simple_yaml
      expect( rule_set.yaml ).to.eql simple_yaml

  describe 'when rendered', ->

    rule_set = null

    before ->
      $container = $('<li/>')
      $('#rule-render-test').append $container
      rule_set = new RuleSet
        yaml: simple_yaml
        event_rules: {}
        $container: $container
      rule_set.render()

    it 'has some content html', ->
      expect( rule_set.$container ).to.have.property 'length'
      expect( rule_set.$container.length ) > 0
      expect( rule_set.$container.html() ).to.match /\<.+\>/

    it 'should have the name "test"', ->
      $name = rule_set.$container.find('.rule-name')
      expect( $name.text() ).to.equal 'testname'

    it 'has the rule data attached to $container', ->
      expect( rule_set.$container.data 'rule_set' ).to.equal rule_set

    it 'can find the rule closest', ->
      $rules = rule_set.$container.find '.card-global-rule'
      expect( $rules.length ).to.equal 1

    it 'can find the rule set data via closest', ->
      $md = rule_set.container_find '.card-global-rule'
      rule_ref = RuleSet.closest $md
      expect( rule_ref ).to.equal rule_set

    # Rule stuff, just to check it is rendered too
    it 'has the `all` select', ->
      $selects = rule_set.$container.find '.selects'
      expect( $selects.length ).to.equal 1
      expect( $selects.text() ).to.match /all\s?/

    it 'has the `discard` action', ->
      $selects = rule_set.$container.find '.actions'
      expect( $selects.length ).to.equal 1
      expect( $selects.text() ).to.equal 'discard'

    it 'has tags', ->
      $selects = rule_set.$container.find '.metadata-tags'
      expect( $selects.length ).to.equal 1
      expect( $selects.text() ).to.match /Discard/


