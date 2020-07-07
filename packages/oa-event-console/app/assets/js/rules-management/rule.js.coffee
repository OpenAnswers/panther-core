# # Rule

# A JS and DOM instance of a Rule.
# Many make up a RuleSet.

# Extends Rendered for a lot of the standard rendere/template stuff.

# GroupRule is down the bottom

# ## Class Rule

class Rule extends Rendered

  @logger = debug 'oa:event:rules:rule'

  # #### `Rendered` options
  @dom_name     = 'rule'
  @dom_data_id  = 'rule'
  @dom_class    = 'card-global-rule-li'
  @dom_selector  = '.' + @dom_class
  @template_id = "#template-rule"
  @template_html = $(@template_id).html()

  # Rules live in an `<li>` so they are sortable. Rendered deals with this.
  @container_el = 'li'


  # ###### @generate( yaml_def, options_object )
  @generate: ( yaml_obj, options = {} )->
    @logger 'generating', yaml_obj, options
    options.yaml = yaml_obj
    new @ options.index, options

  # ###### `new Rule( rule_index_integer, options_object )`
  constructor: ( @index, options = {} )->
    super()
    @logger = @constructor.logger

    # - `@index` the array index of the rule

    # - `@index_friendly` the human index
    unless parseInt(@index) is @index
      throw new Error "new Rule requires an integer index [#{@index}]"
    @index_friendly = @index + 1
    
    # - `@group` Some rules have groups
    @group = if options.group? then options.group else undefined
    
    # - `@rule_set` Store a reference to the RuleSet we are in
    @rule_set = options.rule_set or {type:"_none"}
    debug 'warning, rule has no rule_set' unless @rule_set

    # - `@event_rules` store a reference to the overall EventRules we are in
    @event_rules =  options.event_rules or
                    @rule_set?.event_rules or
                    {type:"_none"}
    debug 'warning, rule has no event_rules' unless @event_rules

    # - `@name` The name of the rule.
    @name = options.name or ''

    # - `@uuid` The UUID for the rule
    @uuid = options.uuid or ''

    # - `@animation` flag for enableing/disabling animation
    @animation = !!options.animation

    @logger '@rule_set', @rule_set, '@event_rules', @event_rules

    # - `@type` is for event_rules to identify us as server or agent
    @type = options.type or
            @rule_set.type or
            @event_rules.type or
            "_none"

    # - `@sub_type` is for event_rules to identify us
    @sub_type = options.sub_type or
                @rule_set.sub_type or
                @event_rules.sub_type or
                "_none"

    # - `@new` flag, for the create new rule interface
    @new = options.new or false
    @disabled = options.disabled or false

    # - `@yaml` the yaml object we are building from
    @yaml = options.yaml or throw new Error 'no yaml'
    @build_from_yaml()

    @rendered_init options

  # ###### @build_from_yaml( yaml_def )
  # Takes the yaml and turns it into object
  build_from_yaml: ( yaml_def = @yaml )->
    @name = yaml_def.name
    @uuid = yaml_def.uuid
    if @uuid
      @uuid_short = _.head( @uuid.split '-' )
      @uuid_tally = _.get( Data.ruleMatches, @uuid, 0)
    @selects = Selects.generate yaml_def, rule: @
    @actions = Actions.generate yaml_def, rule: @
    @options = Options.generate yaml_def, rule: @
    @logger 'Options list is now set to', @options

  # ###### @render_custom( options )
  # Renderer custom function. Called in the middle of render so it
  # can happen after the html is blanked and before `handlers` are run
  render_custom: ( options = {} )->
    @selects.set_container @.$container.find ".selects"
    @selects.render()

    @actions.set_container @.$container.find ".actions"
    @actions.render()

    @.$tags_element = @.$container.find ".metadata-tags"
    #@actions.$tags_element = @.$tags_element
    @.$tags_element.append @actions.render_tag_html()

    @.$container.tooltip
      tooltipClass: 'ui-tooltip-arrow-bottom'
      position:
        my: "center-10px"
        at: "bottom-55px"
      show:
        delay: 500

    if @is_new()
      @.$container.find('.card-global-rule').addClass("card-global-rule-new")
      @.$container.find('.selector-select-add, .selector-action-add')
        .removeClass 'collapse'

    if @is_disabled()
      @.$container.find('.card-global-rule').addClass("card-global-rule-disabled")

  # ###### @is_new()
  # New flag for rules that are created in the dom but not saved
  is_new: ()-> @new

  # ###### @is_disabled( options )
  # disabled rules have the `skip` verb. They are covered in the UI
  is_disabled: ()-> @disabled

  # ###### @initial_handlers( options )
  # initial_handlers are setup once, when the rule object is created and
  # rendered for the first time. You can also use initial_handlers if you
  # listen on a parent object for the bubbled event.
  initial_handlers: ( options = {} )->
    super options
    self = @

    # Add a new verb is in Rule, due to the link being rendered here
    # Change and Delete are in RuleSet
    @.$container.on 'click.select-add', '.select-add', (ev)->
      self.logger 'click add'
      verb = self.selects.generate_verb()

    @.$container.on 'click.action-add', '.action-add', (ev)->
      self.logger 'click add'
      verb = self.actions.generate_verb()

    @handler_context_menu()


  handler_context_menu: ()->
    timer = Timer.start()
    self = @

    @.$container.contextmenu
      target: '#context-rule'
      before: (e, context) ->
        e.preventDefault()
        rule = Rule.closest context

        edit_var = "Edit"
        if rule.isEditMode()
          edit_var = "Stop Editing"
        @.getMenu().find("#context-rule-edit a").html(edit_var)

        disable_var = "Disable"
        if rule.isDisabled()
          disable_var = "Enable"
        @.getMenu().find("#context-rule-disable a").html(disable_var)

      onItem: (target, e) ->
        rule = Rule.closest $(target)
        switch e.currentTarget.id
          when "context-rule-edit"
            rule.toggle_editing()
          when "context-rule-delete"
            rule.delete_from_ruleset()
          when "context-rule-group"
            $("#modal-move-to-group").modal()
          when "context-rule-disable"
            if rule.isDisabled()
              Message.warn 'Enable toggle not implemented'
            else
              Message.warn 'Disable toggle not implemented'

    @logger "Bound conext menu in %s ms", timer.end()


  # ###### @handlers( options )
  # handlers are run every time the page is rendered. To attach to the new
  # elements. You can also use initial_handlers if you listen on a parent
  # object for the bubbled event.
  handlers: ( options = {} )->
    super options
    self = @

    @.$container.off('click.save').on 'click.save',
    ".edit-warning .button-update", ->
      self.logger "Rule update button clicked"
      self.save_edits()

    @.$container.find(".edit-warning .button-cancel")
    .off('click.cancel').on 'click.cancel', ( ev )->
      self.disable_editing()

    @.$container.find(".edit-warning .button-delete").off('click.delete')
    .on 'click.delete', ( ev )->
      self.logger "delete button clicked", ev

      modal = $("#modal-delete-rule")

      if gitEnabled
        modal.find("#rule-name").text self.name

        # Reset reason input
        modal.find("#rule-delete-reason").val("")
        modal.find("#rule-delete-reason").attr("style", "")
        modal.find("#rule-delete-reason").attr("placeholder", "Delete Reason")

        modal.find("#rule-delete-confirm").off 'click'
        modal.find("#rule-delete-confirm").on 'click', () ->
          if modal.find("#rule-delete-reason").val().length < 1
            modal.find("#rule-delete-reason").attr("style", "border-color: red !important")
            modal.find("#rule-delete-reason").attr("placeholder", "Please enter a reason!")
          else
            modal.modal('hide')
            self.rule_set.delete_rule(self, modal.find("#rule-delete-reason").val())

        modal.modal('show')
      else
        self.rule_set.delete_rule self, $("#rule-delete-reason").val()

    @.$container.off('click.edit').on 'click.edit',
    '.button-edit', ( ev )->
      self.logger "edit button clicked", ev
      self.toggle_editing()

    @.$container.find(".collapse-toggle")
    .off('click').on 'click', (event) ->
      self.toggleCollapse()


  # ###### @cancel_edits()
  # Cancel rule edit handler, changes the state of the UI
  # and does a data refresh to reset everything
  cancel_edits: ()->
    timer_warn = Timer.start()
    @logger "cancel_edits - Rule editing cancelled"
    @build_from_yaml()
    @render()
    @logger "cancel_edits - rule edit finally in %s ms", timer_warn.end()


  # ###### @save_edits()
  # Save edit handler. Promise to send it to the server.
  save_edits: ()->
    self = @
    @update_Async()
    .then ( result )->
      self.refresh_Async()
    .then ( result )->
      Message.label 'Rule OK', 'Your updates have been pushed to the server. You can deploy them now'
    
    .catch name: 'DomError', ( error )->
      UI.showErrorDialog "Failed to update your rule", error.to_html()
      error.highlight_elements()

    .catch ( error )->
      console.error 'save_edits Failed updating rule', error, error.stack
      message = if error.domerrors
        error.domerrors.to_html()
      else
        error.message
      UI.showErrorDialog("Failed to update your rule", "#{error}")
      self.setLoadingCoverFailed()

  # ###### @validate()
  # Validate to dom fields before doing anything.
  # Will attach a DomErrorSet with $element refs to issues
  # for highlighting
  validate: ( options = {} )->
    errors = options.errors or new DomErrorSet
    @actions.validate( errors: errors )
    @selects.validate( errors: errors )
    @options.validate( errors: errors )
    unless _.isString(@name) and @name.length > 0
      errors.add_new_error 'Your rule must have a name',
        $element: @.$container
    errors


  # ###### @set_container( $jQueryElement )
  # Set_container is provided by Rendered so this add the edit enabling
  # on top of the standard stuff
  # Note the element must be an `<li>`s for sortable support!!
  set_container: ( $ele )->
    super($ele)
    @enable_editing() if @isEditMode()
    @.$container

  # ###### @set_container()
  # Run every time the container is setup. From `Rendered`
  set_container_data: ()->
    super()
    @.$container
      .attr "data-id", @index
      .attr "data-new", @new
    @

  # ###### @remove()
  # Remove an element from the dom.
  # Note it does nothing to the parent RuleSet.
  # Deletions should come up from there
  remove: ()->
    @.$container.remove()

  #
  delete_from_ruleset: ()->
    @rule_set.delete_rule @


  # ###### @container()
  # Return the rule dom element for this rule
  container: ()->
    @.$container

  # ###### @getRuleLiElement()
  # Return the rule dom element for this rule
  getRuleLiElement: () ->
    @.$container

  # ###### @getRuleName()
  getRuleName: () ->
    @yaml.name


  # ###### @createSocketMsg( obj )
  # Create a typed socketio message for this rule
  createSocketMsg: ( data )->
    message =
      type: @type
      sub_type: @sub_type
      data: data


  # ###### @updateAsync( collapse<Boolean> )
  # Trigger an update message to the server for a rule save
  update_Async: ( yaml_obj )->
    self = @
    new Promise ( resolve, reject )->

      errors = new DomErrorSet
      yaml = self.dom_to_yaml_obj( errors: errors )
      unless errors.ok()
          if self.is_new()
            UI.showErrorDialog "Failed to Create Rule!", errors.to_html()
            return reject errors.to_string()
          else
            UI.showErrorDialog "Failed to Update Rule!", errors.to_html()
            return reject errors.to_string()
            
      msg =
        index: self.index # FIXME this index can be incorrect
        rule: yaml

      options = {}
      options.group = self.group if self.group isnt undefined
      self.logger 'group options', options, self.group
      self.toggleLoadingCover()

      if self.is_new()
        self.event_rules.socketio_Async "event_rules::rule::create", msg, options
        .then ( result )->
          self.new = true
          self.yaml = result.data
          self.build_from_yaml()
          self.render()
          resolve result

        .catch ( error )->
          reject error
      else
        self.event_rules.socketio_Async "event_rules::rule::update", msg, options
        .then ( result )->
          self.new = false
          self.disable_editing()
          self.yaml = result.data
          self.build_from_yaml()
          self.render()
          resolve result

        .catch ( error )->
          reject error

  # ###### @refresh_Async( collapse<Boolean> )
  # Trigger refresh up the chain until the data source is
  # refreshed. Single Rules can't be refreshed on their own
  # at the moment
  refresh_Async: ( collapse = false ) ->
    self = @
    @.rule_set.refresh_Async()
    .then ( results ) ->
      self.render()
      if collapse then self.collapse_entry() else self.expand_entry()
      unless self.isEditMode()
        self.disable_editing()
        self.selects.disable_editing()
        self.actions.disable_editing()
      results


  # ###### @dom_to_properties()
  # Retrive the dom elements and store them in this rule instance
  dom_to_properties: ( options = {} )->
    @name = @.$container.find(".rule-name-edit input").val()
    errors = @validate options
    errors.check_throw()
    true


  # ###### @dom_to_yaml_obj( options )
  # This would normally take the dom into properties
  # Then call `to_yaml_obj`. But Rule is a bit special for the moment
  dom_to_yaml_obj: ( options = {} )->
    @dom_to_properties(options)
    rule_yaml = {}
    
    rule_yaml.name = @name
    _.merge rule_yaml, @actions.dom_to_yaml_obj(options)
    _.merge rule_yaml, @selects.dom_to_yaml_obj(options)
    _.merge rule_yaml, @options.dom_to_yaml_obj(options)

    @logger 'dom_to_yaml_obj created: ', rule_yaml
    rule_yaml


  # ###### @to_yaml_obj()
  # Yaml serialisation of the Rule. Supports hash generation which
  # is not sent to file. Its for client checking
  to_yaml_obj: ( options )->
    rule_yaml = {}

    rule_yaml.name = @name
    _.merge rule_yaml, @actions.to_yaml_obj()
    _.merge rule_yaml, @selects.to_yaml_obj()
    _.merge rule_yaml, @options.to_yaml_obj()
    
    @logger 'to_yaml_obj created: ', rule_yaml
    rule_yaml


  # ###### @toggle_editing()
  # This method will toggle the editing mode of the rule card
  # at the specified index.
  toggle_editing: () ->
    @logger "toggle_editing edit_mode", @edit_mode
    if @isEditMode() then @disable_editing() else @enable_editing()


  # ###### @isEditMode()
  # This method will return whether the rule is currently in edit mode.
  isEditMode: () -> @edit_mode


  # ###### @enable_editing()
  # This method will enable the editing mode of a rule.
  enable_editing: ->
    timer = Timer.start()

    # Make sure the rule is in expanded mode
    @expand_entry()

    # Set the data value 'is-editing' to true so other methods can check it
    @edit_mode = true
    @.$container.attr 'data-editing', true

    # Hide the metadata so we can show the title edit box
    @$container.find('.metadata-container').hide()

    if @rule_set and @rule_set.disable_sortable
      @rule_set.disable_sortable()

# bs_fade_collapse($el)
# bs_uncollapse_fadein($el)

    # Hide the title and replace it with the editable version
    if @animation
      @$container.find('.rule-name').fadeOut "fast", ->
        @$container.find('.rule-name-edit').fadeIn "fast", ->
      @$container.find('.edit-warning').animate({'height': 'show', 'opacity': 'show'}, 'fast')
      $els = @$container.find('.select-action-add, .select-select-add')
      Helpers.bs_uncollapse_fadein $els
    else
      @$container.find('.rule-name').addClass 'hidden'
      @$container.find('.rule-name-edit, .edit-warning, .select-select-add, .select-action-add')
        .removeClass 'collapse'

    # Change the edit button colour
    @$container.find('.button-edit').addClass 'button-edit-active'
    @$container.find('.button-edit').removeClass 'button-edit-normal'

    @selects.enable_editing()
    @actions.enable_editing()

    @$container.find('.selector-select-add, .selector-action-add')
      .removeClass 'collapse'

    elapsed = timer.end()
    @logger("enable_editing() Enabled editing on rule in %c#{elapsed}ms", "font-weight: bold")


  # ###### @disable_editing( collapsed<Boolean> )
  # This method will disable the editing mode of a rule.
  # It is significantly shorter than the method to enable editing,
  # as the rule simply is re-rendered from the template completely after
  # fetching fresh rule data, to ensure the rule remains up to date and no
  # un-saved user changes are left.
  disable_editing: ( collapsed = false ) ->
    self = @
    timer = Timer.start()
    
    @cancel_edits()

    @edit_mode = false
    @.$container.attr 'data-editing', false

    @.$container.find('.rule-name').removeClass 'hidden'
    @.$container.find('.rule-name-edit').addClass 'collapse'
    @.$container.find('.edit-warning').addClass 'collapse'

    @selects.disable_editing()
    @actions.disable_editing()

    @.$container.find('.selector-select-add, .selector-action-add')
      .addClass 'collapse'

    if @isNew()
      @.$container.closest('.card-global-rule-li').remove()
      @logger 'new element removed on edit disable'
      return

    if @rule_set and @rule_set.enable_sortable
      @rule_set.enable_sortable()



  enable_rule_save: () ->
    @disable_rule_save false

  disable_rule_save: ( disabled_opt = true )->
    $save_button = @.$container.find('.button-update')
    $save_button.attr 'disabled', disabled_opt


  # ###### @isNew()
  # Returns the new flag, set when a rule is generated in the UI
  isNew: () -> !!@new


  # ###### @isDisabled()
  # This method checks if the rule specified is disabled.
  isDisabled: () ->
    @.$container.hasClass "card-global-rule-disabled"


  # ###### @setLoadingCoverSuccess()
  # When a rule update succeeds
  setLoadingCoverSuccess: () ->
    $coverText = @.$container.find(".cover-text")

    $coverText.find(".spinner").css("background-color", "#A6D785")
    $coverText.find("p").html("Saved!")

    self = @
    Helpers.delay 1500, ->
      self.toggleLoadingCover()
      self.refresh_Async()


  # ###### @setLoadingCoverFailed()
  # When a rule update fails
  setLoadingCoverFailed: () ->
    $coverText = @.$container.find(".cover-text")

    $coverText.find(".spinner").css("background-color", "#A6D785")
    $coverText.find("p").html("Failed!")

    self = @
    Helpers.delay 3000, ->
      self.toggleLoadingCover()


  # ###### @toggleLoadingCover()
  toggleLoadingCover: () ->
    @$container.find(".cover").fadeToggle("fast")
    @$container.find(".cover-text").fadeToggle("fast")


  # ###### @toggleCollapse()
  toggleCollapse: () ->
    $toggle = @$container.find(".collapse-toggle")
    if $toggle.hasClass("glyphicon-triangle-bottom")
      @logger 'toggle collapse'
      @expand_entry()
    else if $toggle.hasClass("glyphicon-triangle-top")
      @logger 'toggle expand'
      @collapse_entry()
    else
      throw new Error "Unkown toggle state"


  # ###### @expand_entry()
  expand_entry: () ->
    $innerElem = @$container.find ".inner"
    $arrowElem = @$container.find ".collapse-toggle"
    #$contentElem = $(innerElem).find ".content"
    #metadataTagElem = entryElem.find(".metadata-tags")
    #metadataAuthorElem = entryElem.find(".metadata-author")

    @logger 'expand', $arrowElem, $innerElem
    $arrowElem.removeClass    "glyphicon-triangle-bottom"
    $arrowElem.addClass "glyphicon-triangle-top"
    if @animation
      $innerElem.slideDown("fast")
      #$(metadataTagElem).fadeOut "fast", ->
        #$(metadataAuthorElem).fadeIn "fast", ->
    else
      $innerElem.show()

      #$(metadataTagElem).hide()
      #$(metadataAuthorElem).show()
    @$container
      .find '.select-select-add, .select-action-add'
      .removeClass 'collapse'

    if @isNew()
      @$container
        .find 'button.button-delete'
        .addClass 'collapse'


  # ###### @collapse_entry()
  collapse_entry: () ->
    # TODO: Replace add a Bootstrap notification/dialog
    if @isEditMode()
      @disable_editing()

    $innerElem = @$container.find ".inner"
    $arrowElem = @$container.find ".collapse-toggle"
    #contentElem = $(innerElem).find ".content"
    #metadataTagElem = entryElem.find(".metadata-tags")
    # metadataAuthorElem = entryElem.find(".metadata-author")

    @logger 'collapse', @name, $arrowElem
    $arrowElem.removeClass "glyphicon-triangle-top"
    $arrowElem.addClass    "glyphicon-triangle-bottom"

    if @animation
      $innerElem.slideUp("fast")
      #$(metadataAuthorElem).fadeOut "fast", ->
        #$(metadataTagElem).fadeIn "fast"
    else
      $innerElem.hide()
      #$(metadataAuthorElem).hide()
      #$(metadataTagElem).show()
    @$container
      .find '.select-action-add, .select-select-add'
      .addClass 'collapse'


  # ###### @updateOrderNumber( index )
  # move this into Rule
  updateOrderNumber: ( index )->
    ruleIndex = @getRuleElement()
    cardElem = $(element).find('.card-global-rule')
    cardElem.data("id", index)
    cardElem.attr("data-id", index)
    $(this).attr("data-id", index)
    orderNo = $(element).find('.card-global-rule-orderno p')
    orderNo.html(index + 1)
    $(element).find('.selector-entry, .action-entry').each (index, element) ->
      $(element).data("rule-id", ruleIndex)
      $(element).attr("data-rule-id", ruleIndex)



# ------------------------------------------
# ## Class RuleGroup

# An instance of a Rule for groups
class RuleGroup extends Rule

  @dom_name     = 'rule'
  @dom_data_id  = 'rule'
  @dom_class    = 'card-global-rule-li'
  @dom_selector  = '.'+@dom_class

  @template_id = "#template-rule"
  @template_html = $(@template_id).html()
  @container_el = 'li'

  constructor: ( index, options )->
    super index, options
    @index = index
    @group = options.group or throw new Error "No group"
    


# ------------------------------------------
# ## Class RuleGroupSelect

# An instance of a Rule used for a group select.
# Doesn't have configurable actions
class RuleGroupSelect extends Rule

  @dom_name     = 'group-rule-select'
  @dom_data_id  = 'rule'
  @dom_class    = 'card-global-rule-li'
  @dom_selector  = '.'+@dom_class

  @template_id = "#template-group-rule-select"
  @template_html = $(@template_id).html()
  @container_el = 'li'

  constructor: ( index, options )->
    super index, options
    @index = index
    @group = options.group


  # ###### @refresh_Async( collapse<Boolean> )
  # We don't have a rule set in the group so duplicate refresh_Async
  # Should probably move the selects into their own ruleset. Then
  # there could also be multiple rules
  refresh_Async: ( collapse = false ) ->
    self = @
    index = @index
    self.event_rules.refresh_Async()
    .then (results) ->
      self.event_rules.render()
      if collapse then self.collapse_entry() else self.expand_entry()
      unless self.isEditMode()
        #self.$container.find('.selector-select-add,.selector-action-add')
          #.addClass('collapse')
        self.disable_editing()
        self.selects.disable_editing()
        self.actions.disable_editing()
      results

  # ###### @updateAsync( collapse<Boolean> )
  # Trigger an update message to the server for a group rule.
  # This overrides the default `update_Async` for the gorup specifics
  update_Async: ( yaml_obj )->
    self = @
    new Promise ( resolve, reject )->

      errors = new DomErrorSet
      yaml = self.dom_to_yaml_obj( errors: errors )
      unless errors.ok()
        UI.showErrorDialog "Failed to Update Rule!", errors.to_html()
        return reject errors.to_string()
        
      msg =
        index: self.index
        rule: yaml

      options = {}
      options.group = self.group if self.group isnt undefined
      self.logger 'group options', options, self.group
      self.toggleLoadingCover()

      self.event_rules.socketio_Async "event_rules::group::update_select", msg, options
      .timeout 20000
      .then ( result )->
        self.new = false
        self.disable_editing()
        resolve result

      .catch ( error )->
        reject error
