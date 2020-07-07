xdescribe 'RuleVerbHandlers', ->

  logger = debug 'oa:test:event:rules:rule_verb_handlers'

  describe 'the dom', ->

    before ->
      RuleVerbHandlers.set_vars_from_verb_type()

    it 'can get verb instance from dom', ->
      $el = $('<div/>', class:'verb-entry')
      $el.data 'verb', 'play'
      $el2 = $('<div/>')
      $el.append $el2
      logger 'el2', $el.data(), $el2, $el
      data = RuleVerbHandlers.get_verb_instance_from_dom( $el2 )
      expect( data ).to.be.defined
      expect( data ).to.equal 'play'

    it 'can get verb set from dom', ->
      $el = $('<div/>' ,class:'verbs')
      $el.data 'verb_set', 'playset'
      $el2 = $('<div/>')
      $el.append $el2
      logger 'el2', $el.data(), $el2, $el

      data = RuleVerbHandlers.get_verb_set_from_dom( $el2 )
      expect( data ).to.be.defined
      expect( data ).to.equal 'playset'
