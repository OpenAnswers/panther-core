
debug   = require( 'debug' )( 'oa:test:func:rules' )
{ expect } = require '../mocha_helpers'

# Node modules
path    = require 'path'

# OA modules
{ EventRules }  = require '../../lib/event_rules'
{ RuleSet }     = require '../../lib/rule_set'
{ Action }      = require '../../lib/action'
{ Select
  SelectMatch } = require '../../lib/select'
{ Event }       = require '../../lib/event'


# Test event setup
test_events =

  simple1:
    identifier: 'simple1_node:3:simple alert summary of sev 3 aaaaaa'
    node:       'simple1_node'
    severity:   3
    summary:    'simple alert summary of sev 3 aaaaaa'

  simple2:
    #identifier: 'simple2_node:5:simple alert summary of sev 4 bbbbbb'
    node:       'simple2_node'
    severity:   5
    summary:    'simple alert summary of sev 4 bbbbbb'




# Onto the tests

describe 'Sample rules file', ->

  it 'loads into EventRules', ->
    the_rules = new EventRules
      path: path.join __dirname, 'rules_sample.yml'

    expect( the_rules ).to.be.an.instanceof EventRules


  describe 'loaded', ->

    # Use the same rules instance for all the tests
    the_rules = null

    before ->
      # Load the rules from the yaml
      the_rules = new EventRules
        path: path.join __dirname, 'rules_sample.yml'

    it 'has global rules', ->
      expect( the_rules.globals ).to.be.an.instanceof RuleSet

    it 'has groups', ->
      expect( the_rules.groups_array() ).to.contain 'goruppo_a'
      expect( the_rules.groups_array() ).to.contain 'group_b'
      expect( the_rules.groups_array() ).to.contain 'select_c'


    describe 'group: goruppo_a', ->

      it 'has the goruppo_a', ->
        expect( the_rules.groups.get('goruppo_a').name ).to.equal 'goruppo_a'

      it 'loads the select for goruppo_a', ->
        obj = the_rules.groups.get('goruppo_a').select
        expect( obj ).to.be.an.instanceof Select

      it 'loads the rules for goruppo_a', ->
        obj = the_rules.groups.get('goruppo_a').rules
        expect( obj ).to.be.an.instanceof RuleSet


    describe 'group: group_b', ->

      it 'has the group_b', ->
        expect( the_rules.groups.get('group_b').name ).to.equal 'group_b'


    describe 'group: select_c with a select field', ->
      
      it 'has the c group', ->
        expect( the_rules.groups.get('select_c').name ).to.equal 'select_c'
   
      it 'loads a select from the select field', ->
        group = the_rules.groups.get('select_c')
        expect( group.select.selects[0].value ).to.eql 'thisvalue'


    describe 'running global action', ->

      it 'miss the simple1 event', ->
        out_event = the_rules.run test_events.simple1
        expect( out_event.original ).to.eql( test_events.simple1 )

      it 'modify the simple2 event', ->
        compare_simple2 = JSON.parse JSON.stringify(test_events.simple2)
        # compare_simple2.identifier = 'simple2_node:3:simple alert summary of sev 4 bbbbbb'
        compare_simple2.identifier = '15475377226825130586'
        compare_simple2.severity = 3

        out_event = the_rules.run test_events.simple2
        #expect( out_event.copy ).excludingEvery('identifier').to.eql( compare_simple2 ).excludingEvery('identifier')
        expect( out_event.copy ).to.eql( compare_simple2 )

      it 'discards', ->
        ev =
          summary: 'some discarding text'

        out_event = the_rules.run ev
        expect( out_event.discard() ).to.eql true

      it 'dedupes a 3 element form', ->
        ev =
          summary: '3 element form dedupe dedupea dedupe'

        out_event = the_rules.run ev
        expect( out_event.get 'summary' ).to.equal '3 element form dedupe dd a dd dedupe'

      it 'dedupes a 2 element form', ->
        ev =
          summary: '2 element form dedupe dedupeb dedupe'

        out_event = the_rules.run ev
        expect( out_event.get 'summary' ).to.equal '2 element form dd b dd'

      it 'simple4 to simple5', ->
        ev =
          node: 'simple4_node'
          summary: '2 element form dedupe dedupeb dedupe'
          simple5: "start-> replace_testing <-end"

        out_event = the_rules.run ev
        expect( out_event.get 'simple5' ).to.match /re_replace_done/

      it 'match and set with field - simple7', ->
        ev =
          node: 'simple7_node'
          summary: 'the simple7 match summary words'
          simple7: "simple7_field_value"

        out_event = the_rules.run ev
        expect( out_event.get 'new_field' ).to.equal '>simple7_field_value<'

      it 'match and set with capture group - simple8', ->
        ev =
          node: 'simple8_node'
          summary: 'element form simple8 words'

        out_event = the_rules.run ev
        expect( out_event.get 'new_field' ).to.equal 'capture match >mple<'

      it 'match and set with multiple capture groups - simple9', ->
        ev =
          node: 'simple9_node'
          summary: 'this is simple9 simple9'
          simple5: "start-> replace_testing <-end"

        out_event = the_rules.run ev
        expect( out_event.get 'new_field' ).to.equal 'capture match >mp< >e9<'


    describe 'running a group action', ->

      groupa =
        identifier: '10.51.0.1:4:simple alert summary of sev 4 cccccc'
        node:       '10.51.0.1'
        severity:   4
        summary:    'simple alert summary of sev 4 cccccc'

      groupb =
        identifier: 'bnode17:3:simple alert summary of sev 3 dddddd'
        node:       'bnode17'
        severity:   3
        summary:    'simple alert summary of sev 3 dddddd'

      it 'groups the groupa event', (done) ->
        returned_ev = the_rules.run groupa
        expect( returned_ev ).to.have.property 'copy'
        expect( returned_ev.copy ).to.have.property 'group'
        expect( returned_ev.copy.group ).to.equal 'goruppo_a'
        done()

      it 'groups the groupb event', ->
        returned_ev = the_rules.run groupb
        expect( returned_ev.copy ).to.have.property 'group'
        expect( returned_ev.get 'group' ).to.equal 'group_b'

    describe 'global match tracking', ->

      match_positive =
        node: 'simple2_node'

      match_negative = 
        node: 'negative_host'

      it 'enabled tracking', ->
        returned_ev = the_rules.run match_positive, 
          tracking_matches: true

        expect( returned_ev ).to.have.property 'tracking_matches'
        expect( returned_ev.tracking_matches ).to.eql true
      
      it 'added matches', ->
        returned_ev = the_rules.run match_positive, 
          tracking_matches: true

        expect( returned_ev.matches ).to.have.property 'global'
        expect( returned_ev.matches ).to.have.property 'group'
        expect( returned_ev.matches.global ).to.be.an('array').that.is.not.empty
        expect( returned_ev.matches.group ).to.be.an('array').that.is.empty

      
      it 'added a global match', ->
        returned_ev = the_rules.run match_positive, 
          tracking_matches: true

        # debug 'match %O', returned_ev.matches.global
        expect( returned_ev.matches.global).to.be.an('array').that.deep.includes
          from: 'RuleSelector',
          uuid: '1234-simple2-discard',
          name: 'simple2 test discard'


    describe 'group match tracking', ->

      match_positive =
        node: '192.168.50.1'

      simple22_positive =
        node: 'bnode22'

      it 'group selector only', ->
        returned_ev = the_rules.run match_positive, 
          tracking_matches: true

        # console.log "tracked [2]", inspect returned_ev.matches, false, 4
        expect( returned_ev.matches.group ).to.be.an('array').that.is.not.empty
        expect( returned_ev.matches.group ).to.be.an('array')


      it 'group selector', ->
        returned_ev = the_rules.run simple22_positive, 
          tracking_matches: true

        # console.log "tracked [2]", inspect returned_ev.matches, false, 4
        expect( returned_ev.matches.group ).to.be.an('array').that.is.not.empty
        expect( returned_ev.matches.group ).to.be.an('array')

 
      
