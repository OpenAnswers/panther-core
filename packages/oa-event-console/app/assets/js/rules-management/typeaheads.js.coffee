# Typeaheads
# =====================

# This class handles the drop-down 'typeaheads' that are used
# on input fields to provide suggested values. These are most
# commonly used on selectors and actions to recommend operators
# and fields. It is worth noting that Typeaheads don't appear
# to be particularly quick and constitute a great deal of the
# time spent loading.

class @Typeaheads
  @debugNamespace = 'oa:event:rules:typeaheads'
  @logger = debug("#{@debugNamespace}")

  # Configuration defaults for Typeaheads
  @default_options =
    minLength: 0
    showHintOnFocus: true
    autoSelect: true
    items: 'all'
    scrollHeight: 0
    afterSelect: ( data )->
      Typeaheads.logger 'typeahead after select', data
    updater: ( item )->
      Typeaheads.logger 'typeahead updated', item
      item

  # Set Selector Typeaheads
  # -------------------
  # Apply the appropriate Typeaheads to selector fields and operators.
  @NOPEsetSelectTypeaheads: ( $elem ) ->
    timer = new Timer()
    timer.start()

    

    # If this method was called with a specific selector in mind, only apply to
    # that selector, otherwise apply to all selectors that we can find in the
    # document (SLOW!)
    $field_els = if $elem
      $elem.find selector_string
    else
      $(".select-field input[type=text]")

    elemsAffected = 0

    @logger "Adding the select typeaheads..", $elem
    # Destroy any existing Typeaheads on this selector as it causes a lot of
    # problems if you apply a Typeahead twice to the same element
    $field_els.typeahead 'destroy'
    
    # Apply the Typeahead to the element
    $field_els.typeahead _.defaults({source: Data.fields}, @typeahead_defaults)

    # Same as previously seen in this method
    $operator_els = if $elem
      $elem.find ".select-operator input[type=text]"
    else
      $(".select-operator input[type=text]")

    $operator_els.typeahead 'destroy'
    opts = _.defaults source: SelectTypes.active_types(), @default_options
    $operator_els.typeahead opts

    @logger "Done adding the select typeaheads op[%s] field[%s] [%s]ms",
      $operator_els.length, $field_els.length, timer.end()


  @add_typeahead_to_select: ( $container )->
    css_select_selector = ".select-field input[type=text]"
    $fields = $container.find css_select_selector
    @add_fields_typeahead $fields

    $verbs = $container.find ".select-operator input[type=text]"
    @add_selects_typeahead $verbs


  @add_typeahead_to_action: ( $container )->
    css_action_selector = ".action-field input[type=text]"
    $fields = $container.find css_action_selector
    @add_fields_typeahead $fields

    $verbs = $container.find ".action-operator input[type=text]"
    @add_actions_typeahead $verbs


  @add_typeahead_to_schedule: ( $container )->
    css_schedule_selector = ".schedule-field input[type=text]"
    $schedules = $container.find css_schedule_selector
    @add_schedules_typeahead $schedules

  # Fields

  @add_fields_typeahead: ( $els )->
    unless $els.length? and $els.length > 0
      return
    $els.typeahead 'destroy'
    $els.typeahead @fields_typeahead_opts()

  @fields_typeahead_opts: ->
    #_.defaults source: Fields.all(), @default_options
    _.defaults source: @get_fields(), @default_options

  @get_fields: ->
    return @fields if @fields
    @fields = Data?.fields #or $.get('/api/fields').then (r)->


  # Actions

  @add_actions_typeahead: ($els)->
    $els.typeahead 'destroy'
    $els.typeahead @actions_typeahead_opts()

  @actions_typeahead_opts: ->
    _.defaults source: ActionTypes.active_types(), @default_options

  # Schedules

  @add_schedules_typeahead: ( $els )->
    $els.typeahead 'destroy'
    $els.typeahead @schedules_typeahead_opts()

  @schedules_typeahead_opts: ->
    _.defaults source: @get_schedules(), @default_options

  @get_schedules: ->
    @logger "get_schedules 1 ", @schedules
    return @schedules if @schedules
    @schedules = Data?.scheduleNames
    @logger "get_schedules 2 ", @schedules
    @schedules

  # Selects

  @add_selects_typeahead: ($els)->
    $els.typeahead 'destroy'
    $els.typeahead @selects_typeahead_opts()

  @selects_typeahead_opts: ->
    _.defaults source: SelectTypes.active_types(), @default_options


  @add_groups_typeahead: ($els)->
    $els.typeahead 'destroy'
    $els.typeahead @groups_opts()

  @group_opts: ->
    _.defaults source: Groups.names(), @default_options


  # Set Action Typeaheads
  # -------------------
  # Apply the appropriate Typeaheads to action fields and operators.
  @NOPEsetActionTypeaheads: ( $elem ) ->
    @logger "Adding the action typeaheads", $elem

    selector_string = ".action-operator > input[type=text]"
    # If this method was called with a specific action in mind, only apply to
    # that action, otherwise apply to all actions that we can find in the
    # document (SLOW!)
    $operator_els = if $elem
      $elem.find selector_string
    else
      $(selector_string)

    $operator_els.typeahead 'destroy'
    opts = _.defaults source: ActionTypes.active_types(), @default_options
    $operator_els.typeahead opts

    field_selector_string = ".action-field > input"
    $field_els = if $elem
      $elem.find field_selector_string
    else
      $(field_selector_string)

    $field_els.typeahead 'destroy'
    $field_els.typeahead _.defaults(source: Data.fields, @typeahead_defaults)

    @logger "Done adding the action typeaheads op[%s] field[%s]", 
      $operator_els.length, $field_els.length

