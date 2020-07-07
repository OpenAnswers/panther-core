# # Group

# Group rules are a little bit special as the RuleSet
# is housed in a group instead of directly in EventRules
# This means Group needs to implement a number of EventRulesy
# things. And they need to be treated a little bit special
# in some places

# ## Class Group

# A Group contains a select rule, for putting things in the
# group (and setting group: name)
# Then a RuleSet to be processed

class Group extends Rendered

  @logger = debug 'oa:event:rules:group'
  
  @dom_class = 'rule-group'
  @dom_name = 'rule-group'

  @template_id = '#template-group'
  @template_setup()

  @container_el = 'li'

  # Generate an instance from the yaml model
  @generate: ( yaml_obj, options = {} ) ->
    Group.logger 'generating Group', yaml_obj, options
    select_rule = _.clone yaml_obj.select or {}
    select_rule.name = "Events for the #{options.name} group"
    select_rule.set = group: options.name

    gen_options = _.omit options, '$container'
    gen_options.group = options.name

    # Rule for the select
    select_opts = _.defaults { index: 0 }, gen_options
    select = RuleGroupSelect.generate select_rule, select_opts

    # RuleSet as usual for the rules
    rule_set = RuleSet.generate yaml_obj.rules, gen_options
    group = new Group
      rule_set: rule_set
      select: select
      event_rules: options.event_rules
      name: options.name
      uuid: yaml_obj.uuid

    select.rule = group
    group

  constructor: ( options = {} ) ->
    super()
    @name = options.name or ''
    @groups = options.groups
    @uuid = options.uuid
    if @uuid
      @uuid_short = _.head( @uuid.split '-' )
      @uuid_tally = _.get( Data.ruleMatches, @uuid, 0)
    @event_rules = options.event_rules
    @select = options.select or new RuleSet #options
    @rule_set = options.rule_set or new RuleSet #options
    @ruleCount = @rule_set.rules.length || 0
    @new = options.new or false
    @ruleMatches = @ruleCount

    @rendered_init()
    @logger 'new Group created', @name

  # Attach some extra steps inside the standard `render()` call
  render_custom: ( options = {} ) ->
    @select.set_container @.$container.find('ul.rules-group-select')
    @select.render()
    @rule_set.set_container @.$container.find('ul.rules-group-ruleset')
    @rule_set.render()

  # Whenever we render...
  handlers: ( options = {} ) ->
    super options
    self = @

    @.$container.find('.rule-group-name-edit > input').off('change').on 'change', ->
      self.validate_name()


  initial_handlers: ( options = {} ) ->
    super options
    self = @

    # Create group rule
    @.$container.off('click.create').on 'click.create', '.btn-rules-ruleset-createrule', (ev) ->
      self.logger 'click btn-rules-ruleset-createrule'
      self.rule_set.createNewRule()

    # Edit Group
    @.$container.on 'click', '.rule-group-toggle-edit', ( ev ) ->
      if self.is_editmode()
        self.disable_editmode()
      else
        self.enable_editmode()

    # Delete group
    @.$container.on 'click', '.rule-group-name-edit .button-delete', ( ev ) ->
      self.logger 'delete clicked'

      modal = $("#modal-delete-group")

      if gitEnabled
        modal.find("#group-delete-reason").show()
      else
        modal.find("#group-delete-reason").hide()

      modal.find("#group-name").text self.name
      modal.find("#group-rule-count").text self.ruleCount

      # Reset reason input
      modal.find("#group-delete-reason").val("")
      modal.find("#group-delete-reason").attr("style", "")
      modal.find("#group-delete-reason").attr("placeholder", "Delete Reason")

      modal.find("#group-delete-confirm").off 'click'
      modal.find("#group-delete-confirm").on 'click', () ->
        if gitEnabled and $("#group-delete-reason").val().length < 1
          modal.find("#group-delete-reason").attr("style", "border-color: red !important")
          modal.find("#group-delete-reason").attr("placeholder", "Please enter a reason!")
        else
          modal.modal('hide')
          self.delete_group_Async(modal.find("#group-delete-reason").val())

      modal.modal('show')

    # Save name edit
    @.$container.on 'click', '.rule-group-name-edit .button-save', ( ev ) ->
      self.logger 'save clicked'

      if !self.is_new()
        self.update_select_Async()
        .catch name: 'ValidationError', (err)->
          Message.warn_label "Input Validation Failed", err.message
        
        .catch (err)->
          Message.exception err.message, err
      
      new_name = self.container_find('.rule-group-name-edit-input').val()

      unless new_name.trim().length > 0
        return Message.error 'Group name must set to something'

      group_promise = undefined
      # create if its new
      if self.is_new()
        group_promise = self.create_name_Async new_name
      # update if the name changed
      else unless new_name is self.name
        group_promise = self.update_name_Async new_name
        .then (res) ->
          # and sync the select
          self.update_select_Async()
      else
        group_promise = self.update_select_Async()

      group_promise.then (res) ->
        self.disable_editmode()

      .catch name: 'ValidationError', ( err ) ->
        $fg = $(this).closest('.form-group').addClass('has-error')
        Message.warn_label "Input Validation Failed", err.message
      
      .catch ( err ) ->
        self.logger "Caught an exception after group promise"
        Message.exception err.message, err

      .finally ->
        # turn off the request spinner


    # Cancel name edit
    @.$container.on 'click', '.rule-group-name-edit .button-cancel', ( ev ) ->
      self.logger 'button cancel clicked'
      if self.is_new()
        self.$container.remove()
      else
        self.disable_editmode()

    # Expand all and expands each rule
    @.$container.on 'click', '.rule-group-icon > .glyphicon-arrow-down', ( ev ) ->
      self.logger 'expand_all'
      self.expand_all()
      self.expand_group()
      self.rule_set.expand_all()
      $arrowElem = self.$container.find( '.collapse-all-toggle')
      $arrowElem.removeClass  "glyphicon-arrow-down"
      $arrowElem.addClass     "glyphicon-arrow-up"
      return

    # Collapse all and collapse each rule
    @.$container.on 'click', '.rule-group-icon > .glyphicon-arrow-up', ( ev ) ->
      self.logger 'collapse_all'
      self.collapse_all()
      self.collapse_group()
      self.rule_set.collapse_all()
      $arrowElem = self.$container.find( '.collapse-all-toggle')
      $arrowElem.removeClass  "glyphicon-arrow-up"
      $arrowElem.addClass     "glyphicon-arrow-down"
      return

    # Collapse group
    @.$container.on 'click', '.rule-group-icon > .glyphicon-triangle-top', (event) ->
      self.collapse_all()
      self.collapse_group()
      # when collapsing the group, ensure that collapse_all is also updated
      $arrowElem = self.$container.find( '.collapse-all-toggle')
      $arrowElem.removeClass  "glyphicon-arrow-up"
      $arrowElem.removeClass  "glyphicon-arrow-down"
      $arrowElem.addClass     "glyphicon-arrow-down"

      return

    # Expand group
    @.$container.on 'click', '.rule-group-icon > .glyphicon-triangle-bottom', (event) ->
      self.expand_all()
      self.select.expand_entry()
      self.expand_group()
      return

  update_name: ( $that ) ->
    errors = self.validate_name()
    errors.check_throw()


  # Send a group name update to the server
  update_name_Async: ( new_name ) ->
    self = @
    new Promise ( resolve, reject ) ->

      msg =
        new_name: new_name
        previous_name: self.name

      self.container_find('.button-save').prop 'disabled', true
      self.event_rules.socketio_Async 'event_rules::group::update_name', msg
      .timeout( 15000 )
      .then ( result ) ->
        self.name = new_name
        self.render()
        resolve(result)
      .catch reject
      .finally ->
        self.container_find('.button-save').prop 'disabled', false


  # Send the select to the server
  update_select_Async: ( select_obj  ) ->
    self = @
    new Promise ( resolve, reject ) ->
      msg =
        index: self.select.index
        rule: self.select.to_yaml_obj()

      options = {}
      options.group = self.name if self.name isnt undefined

      self.container_find('.button-save').prop 'disabled', true
      self.event_rules.socketio_Async 'event_rules::group::update_select', msg, options
      .timeout( 15000 )
      .then ( result )->
        self.render()
        resolve(result)
      .catch ( error ) ->
        reject error
      .finally ->
        self.container_find('.button-save').prop 'disabled', false


  # Send a group name update to the server
  create_name_Async: ( new_name ) ->
    self = @
    new Promise ( resolve, reject ) ->

      msg = new_name: new_name

      self.container_find('.button-save').prop 'disabled', true
      self.event_rules.socketio_Async 'event_rules::group::create_name', msg
      .timeout( 15000 )
      .then ( result ) ->
        self.new = false
        self.name = new_name
        self.groups.add @
        self.event_rules.refresh_Async()
      .then ( result ) -> # complete group rules
        self.event_rules.build_from_yaml()
        self.event_rules.render()
      .then ( result ) ->
        resolve(result)
      .catch reject
      .finally ->
        self.container_find('.button-save').prop 'disabled', false


  # Send a group name update to the server
  delete_group_Async: ( reason ) ->
    self = @
    new Promise ( resolve, reject ) ->

      msg =
        name: self.name
        reason: reason
      
      if self.name is undefined
        throw new Errors.ValidationError 'No name', self.name
      options =
        group: self.name

      self.container_find('.button-delete').prop 'disabled', true
      self.event_rules.socketio_Async 'event_rules::group::delete', msg, options
      .timeout( 15000 )
      .then ( result ) ->
        self.event_rules.refresh_Async()
      .then ( result ) ->
        resolve(result)
      .catch reject
      .finally ->
        self.container_find('.button-delete').prop 'disabled', false


  is_new: -> @new

  validate: ( options = {} ) ->
    errors = options.errors or new DomErrorSet

  validate_name: ( options = {} ) ->
    errors = options.errors or new DomErrorSet
    $('.rule-group-name-edit > input').val()
    errors

  dom_to_properties: ->
    errors = @validate()
    errors.check_throw()
    @name = $('.rule-group-name-edit > input').val()

  to_yaml_obj: ->
    o = {}
    o.name = @name
    o.select = @select.to_yaml_obj()
    o.rules = @rule_set.to_yaml_obj()
    @logger 'to_yaml_obj created: ', o
    o

  enable_editmode: ->
    @$container.find('.rule-group-subtitle').addClass 'hidden'
    @$container.find('.rule-group-name').addClass 'hidden'
    @$container.find('.rule-group-name-edit').removeClass 'hidden'
    @$container.find('.rule-group-content-select').removeClass 'hidden'
    # newly created Group rule should be saved before editing the selction rule
    @select.enable_editing() unless @is_new()
    @editmode = true

  disable_editmode: ->
    @$container.find('.rule-group-subtitle').removeClass 'hidden'
    @$container.find('.rule-group-name').removeClass 'hidden'
    @$container.find('.rule-group-name-edit').addClass 'hidden'
    @$container.find('.rule-group-content-select').addClass 'hidden'
    @editmode = false

  is_editmode: -> @editmode

  disable_delete: ->
    @$container.find('.rule-group-delete').addClass 'hidden'


  enable_sortable:  -> @rule_set.enable_sortable()
  disable_sortable: -> @rule_set.disable_sortable()
  collapse_all: ->
    @select.collapse_entry()
  expand_all: ->
    @select.expand_entry()
  
  collapse_group: ->
    $groupElem = @$container.find( '.rule-group-content')
    $arrowElem = @$container.find( '.collapse-toggle')

    $arrowElem.removeClass  "glyphicon-triangle-top"
    $arrowElem.addClass     "glyphicon-triangle-bottom"

    @$container.find('.rule-group-subtitle').removeClass 'hidden'

    if @animation
      $groupElem.slideUp("fast")
    else
      $groupElem.hide()

  expand_group: ->
    $groupElem = @$container.find( '.rule-group-content')
    $arrowElem = @$container.find( '.rule-group-icon > .collapse-toggle')

    $arrowElem.removeClass  "glyphicon-triangle-bottom"
    $arrowElem.addClass     "glyphicon-triangle-top"

    @$container.find('.rule-group-subtitle').addClass 'hidden'

    if @animation
      $groupElem.slideDown("fast")
    else
      $groupElem.show()
  
  # updating each groups counter for rules matching search term
  update_matches: ->
    @$container.removeClass "hidden"
    @ruleMatches = @ruleCount
    hidden = 0
    
    # iterates over every rule in a group, counts and hides it if they have the class "no-match"
    @$container.find('.card-global-rule-li').not(".rules-group-select").each (index, element) ->
      if $(element).hasClass("no-match")
        hidden++
    @ruleMatches -= hidden
        
    # if there is a search, calculates and displays the rules matched against the search term
    if $("#sidebar-search-box").val() != "" || ActionFilters.actionFilters.length > 0
      $ruleMatchCounter =  @$container.find(".matches")
      $totalRules = @$container.find(".group-rules")

      @$container.find(".rule-matches").text(@ruleMatches + "/" + @ruleCount)
      $ruleMatchCounter.removeClass "hidden"
      $totalRules.addClass "hidden"

    else
      @$container.find(".matches").addClass "hidden"
      @$container.find(".group-rules").removeClass "hidden"
    
    if @ruleMatches == 0
      @hide_group()
    true
  
  hide_group: ->
    if $("#sidebar-search-box").val() != ""
      @$container.addClass "hidden"

  # update to counters for rule selector matches and rule hits per group
  update_group_total_counters: ->
    rule_total_matches = 0

    # iterates over every rule and counts the number of times they have been hit
    @$container.find('.card-global-rule-li')
      .not(".rules-group-select")
      .not(".no-match")
      .each (index, element) ->
        $(element).find(".rule-name-uuid-tally").each (index, element) ->
          count = $(element).text().split(" ")
          rule_total_matches += Number(count[count.length - 1])

    # set group counter for group selector hits
    @$container.find(".group-hits")
    .text(@uuid_tally)

    # set counter for rule hits
    @$container.find(".rule-uuid-tally")
      .text(rule_total_matches)
    rule_total_matches