# RulesSet Management
# =====================

# This class handles the rendering of rule 'cards' for anything that
# holds a set of rules. Implements `Rendered` for the UI setup

# Global rules is a rule set.
#
# Groups have many rule sets.
#
# Agents each have a rule set.

class RuleSet extends Rendered
  @logger = debug 'oa:event:rules:rule_set'

  @dom_name     = 'rule-set'
  @dom_data_id  = 'rule_set'
  #@dom_selector = '.' + @dom_class

  @template_blank = true

  # Rules live in an `<li>` so they are sortable. Rendered deals with this.
  @container_el = 'ul'

  # Rule set is generated from an array of rule definitions
  #
  #     [
  #       { name: 'one', match: summary: 'test', set: whatever: 'yes' },
  #       { name: 'two', all: true, set: other: 'yes' },
  #     ]
  #
  @generate: ( yaml_def, options = {} )->
    RuleSet.logger 'generating RuleSet', yaml_def, options
    unless yaml_def instanceof Array
      throw new Error "The yaml rule set object must be an array of "+
                      "rule definitions [#{typeof yaml_def}]"
    
    new RuleSet _.defaults( yaml: yaml_def , options )

  # ###### `new RuleSet {}`
  constructor: ( options = {} )->
    super()
    @rules = []

    # - `@label` Human label
    @label = options.label
    
    # - `@type` Different event_rules parents of rulset - server,agent
    @type = options.type

    # - `@sub_type` Different types of ruleset - group/global/agent-name
    @sub_type = options.sub_type

    # - `@event_rules` Store a reference to the parent for traversal
    @event_rules  = options.event_rules

    # - `@group` If we hav multiple RuleSets in EventRules, they need
    # to have group.
    @group = options.group

    # - `@animation` Animation control for the ruleset
    @animation = options.animation or false

    # - `@template_none` Disable `Rendered` templates for this
    @template_none = true

    # - `@container_el` Set our default container to a ul (for sortable)
    @container_el = 'ul'

    # - `@_editing` Set the editing flag
    @_editing = false

    # - `@yaml` We build from the yaml represenstion
    @yaml = options.yaml
    @build_from_yaml() if @yaml

    @rendered_init options
      

  # ###### @build_from_yaml( yaml_Object )
  build_from_yaml: ( yaml_def = @yaml )->
    @rules = for yaml_rule, index in yaml_def
      @build_ruleset_rule index, yaml_rule


  # ###### @build_ruleset_rule( index<Integer> )
  # Generic way to add a rule with an index
  build_ruleset_rule: ( index, yaml_rule )->
    rule_opts =
      index: index
      rule_set: @
      event_rules: @event_rules
      group: @group
    Rule.generate yaml_rule, _.defaults rule_opts


  # ###### @getRule( index<Integer> )
  # Get a rule by index, throw if it doesn't exist
  getRule: ( index )->
    throw new Error "No rule number [#{index+1}]" unless @rules[index]
    @rules[index]


  # ###### @add_rule( yaml_Object )
  # Build, add a rule and append to the dom
  add_rule: ( yaml_rule )->
    index = @getNextRuleId()
    @build_ruleset_rule index, yaml_rule
    @rules.push new_rule
    @.$container.append new_rule.container


  # ###### @getContainerElement()
  getContainerElement: ()->
    @.$container

  getLastRuleId: () ->
    @rules.length - 1

  getNextRuleId: ()->
    @rules.length

  # ###### @render_custom()
  render_custom: () ->
    @logger 'render() rule_set', @rules.length
    rules = (rule.render() for rule in @rules)
    @.$container.append rules

  # ###### @handlers()
  handlers: ( options )->
    self = @
    super options


  # ###### @initial_handlers()
  initial_handlers: ( options )->
    self = @
    super options

  # ###### @.refresh_Async()
  # Trigger refresh up the chain until the data source is
  # refreshed. Single Rules can't be refreshed on their own
  # at the moment
  refresh_Async: ( options = {} ) ->
    self = @

    options.redraw ?= false

    new Promise ( resolve, reject )->

      reject new Error 'No parent to refresh' unless self.event_rules

      self.event_rules.refresh_Async()
      .then ( data ) ->
        if options.redraw
          # Do some redrawing??
          Message.info "not implemented"

        resolve data
          
      .catch ( error )->
        Message.exception "Problem refreshing rule set - #{error}", error
        reject error


  # ###### @toggle_editing( index<Integer> )
  # This method will toggle the editing mode of the rule card
  # at the specified index.
  toggle_editing: ( ruleIndex ) ->
    @getRule(ruleIndex).toggle_editing()

  # ###### @isEditMode( index<Integer> )
  # Is Rule In Edit Mode
  # This method will return whether the rule is currently in edit mode.
  isEditMode: ( ruleIndex )->
    @getRule(ruleIndex).idEditMode()

  # ###### @enable_editing( index<Integer> )
  # Enable Editing Mode
  # This method will enable the editing mode of a rule.
  enable_editing: (ruleIndex) ->
    @getRule(ruleIndex).enable_editing()

  # ###### disable_editing( index<Integer> )
  # This method will disable the editing mode of a rule.
  disable_editing: (ruleIndex) ->
    @getRule(ruleIndex).disable_editing()

  # ###### @enable_rule_save( index<Integer> )
  enable_rule_save: (ruleIndex) ->
    @getRule(ruleIndex).enable_rule_save()

  # ###### @disable_rule_save( index<Integer> )
  disable_rule_save: (ruleIndex) ->
    @getRule(ruleIndex).disable_rule_save()

  # ###### @isNew( index<Integer> )
  isNew: (ruleIndex) ->
    @getRule(ruleIndex).isNew()

  # ###### @isDisabled( index<Integer> )
  isDisabled: (ruleIndex) ->
    @getRule(ruleIndex).isDisabled()

  # ###### @collapse_entry( index<Integer> )
  collapse_entry: (ruleIndex) ->
    @getRule(ruleIndex).collapse_entry()

  # ###### @expand_entry( index<Integer> )
  expand_entry: (ruleIndex) ->
    @getRule(ruleIndex).expand_entry()

  # ###### @collapse_all()
  # rules
  collapse_all: () ->
    for rule, index in @rules
      rule.collapse_entry()

  # ###### @expandAll()
  # rules
  expand_all: ->
    for rule,index in @rules
      rule.expand_entry()

  # ###### @appendRule()
  # to a RuleSet
  appendRule: ( $ruleElem, initialLoad = false ) ->
    @.$container.append $ruleElem


  # ###### @appendAllRules()
  # to a RuleSet
  appendAllRules: () ->
    for rule, index in @rules
      @appendRule rule.render()

    true


  # ###### @doSearchAndFilter()
  doSearchAndFilter: ->
    query = $("#sidebar-search-box").val().toLowerCase()
    disableDragging = false

    # First, establish whether we should enable or disable sorting.
    rulesMatched = 0

    # only find within this RuleSet
    @$container.find('.card-global-rule-li').each (index, element) ->
      ruleMatches = false
      $(element).show()
      titleElem = $(element).find('.rule-name')
      titleVal = $(titleElem).html()
      #titleVal = $(titleElem).html().toLowerCase()
      if titleVal != undefined
        titleVal = titleVal.toLowerCase()
        if titleVal.indexOf(query) != -1
          ruleMatches = true
          rulesMatched++

        if ruleMatches
          $(element).removeClass('no-match')
          $(element).show()
        else
          $(element).addClass('no-match')
          $(element).hide()
          disableDragging = true

    if disableDragging
      @event_rules.searchWarning()
      @disable_sortable()
    else
      @enable_sortable()
    
    rulesMatched


  # ###### @enable_sortable()
  enable_sortable: () ->
    self = @
    $rule_set = $("##{@euid}")
    #$(".button-grab").removeClass("button-grab-disabled")
    #$(".button-grab").css("opacity", 1.0)
    $(".card-global-rule .title").css "cursor", "move"

    # Check if sortable has already been setup here
    if $rule_set.hasClass("ui-sortable")
      return $rule_set.sortable "enable"
    
    mygroup = @.group
    # Setup the sortables
    $rule_set.sortable({
      placeholder: 'card-global-rule-placeholder'
      handle: '.title'
      cancel: '.rule-name, .rule-name-uuid-short, .rule-name-uuid-tally, .button-edit, .button-collapse, input'
      axis: 'y'
      start: (event, ui) ->
        ui.item.start_position = ui.item.index()
      stop: (event, ui) ->
        msg =
          old_position: ui.item.start_position
          new_position: ui.item.index()
        options =
          group: self.group
        # self.event_rules.socketio_Async 'event_rules::rule::move', msg, options, (err, res) ->
        self.event_rules.socketio_Async 'event_rules::rule::move', msg, options
        .then ( res ) ->
          self.logger 'rule moved', res
          self.refresh_Async()
        .catch ( error ) ->
          Message.error "Failed to reorder message", error
          # refresh_Async?

    })

  # ###### @disable_sortable()
  #
  disable_sortable: ->
    #$(".button-grab").addClass "button-grab-disabled"
    #$(".button-grab").css "opacity", 0.5
    $rule_set = $(".#{@dom_name}")
    if $rule_set.hasClass("ui-sortable")
      $rule_set.sortable "disable"
    $(".card-global-rule .title").css "cursor", "pointer"


  # Check if any of the rules are in a edit state
  currently_editing: ()->
    # Check for a new dom rule
    @logger 'looking for', ".#{Rule.dom_class}[data-editing=\"true\"]"
    $dom_editing = @container_check ".#{Rule.dom_class}[data-editing=\"true\"]"
    if $dom_editing
      @logger 'dom rule is editing', $dom_editing
      return true

    # Check the current rules
    for rule in @rules
      if rule.is_new() or rule.isEditMode()
        @logger 'rule %s is editing [%s] [%s]', rule.name, rule.is_new(), rule.isEditMode()
        return true

    false


  # ###### @createNewRule(

  # Creates a new blank rule in the dom to be edited and
  # then submitted to the server rule_set
  # TODO FIXME maybe this should be appended to the rule_set array
  #            then render called on the array like norml??
  createNewRule: () ->
    if @currently_editing()
      return Message.label "Pending edits...", "Please complete or cancel other rule edits before creating a new rule", {}

    new_index = @getNextRuleId()
    rule = Rule.generate { _initial: true },
      index: new_index
      rule_set: @
      event_rules: @event_rules
      new: true
      render: true
      group: @group

    @disable_sortable()
    @appendRule rule.$container

    rule.enable_editing()
    rule.expand_entry()
    rule.new = true
    return rule


  # ###### @deleteRule( rule_Rule )
  delete_rule: ( rule, reason ) ->
    self = @

    index = @rules.indexOf rule
    unless index > -1
      throw new Error "No local rule to delete [#{rule.name}]"

    delete_msg =
      index: index
      reason: reason
      hash: rule.loaded_hash

    options = {}
    options.group = self.group if self.group isnt undefined
    self.logger 'delete. group options', options, self.group

    @event_rules.socketio_Async "event_rules::rule::delete", delete_msg, options
    .then ( data )->
      $("#modal-delete-confirm").modal("hide")
      
      Message.label "Deleted Rule",
        "Successfully deleted rule '#{rule.name}'!"
      
      self.refresh_Async()
    .then (res)->
      #rule.remove()
      #self.render()
      self.collapse_all()
      return true

    .catch ( error )->
      Message.exception("Failed to Delete Rule", error)


class RuleSetGroupSelect extends RuleSet

  @dom_name     = 'rule-set'
  @dom_data_id  = 'rule_set'
  #@dom_selector = '.' + @dom_class

  @template_blank = true

  # Rules live in an <li> so they are sortable. Rendered deals with this.
  @container_el = 'ul'