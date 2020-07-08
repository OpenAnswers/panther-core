# # Selects

# Manages all the actions and how they parse/render/validate.
# Generic stuff goes in SelectBase.
# Each action verb has a class.
#
# For example when `set` appears in a Rule yaml definition,
# SelectSet is used etc.



# -------------------------------------------------------------------
# ## SelectBase
# #### Base Select implementation
# Base class for specific Selects to extend
class SelectBase extends RuleVerbBase

  @logger = debug 'oa:event:rules:selectbase'

  # `RuleVerbBase` options
  @verb      ?= '_selectbase_'
  @verb_type  = 'select'

  # `Rendered` options
  @dom_name     = @verb_type
  @dom_data_id  = 'verb'
  @dom_class    = 'select-entry'
  @dom_selector = '.' + @dom_class

  # Generate a type from a yaml rule object
  @generate: ( yaml_obj, options = {} ) ->
    override_generate_please()

  # Take the dom edit elements and go back to yaml, for sending back
  # to the server
  to_yaml_obj: ->
    override_to_yaml_object_please()

  # Add the typeaheads to field inputs on each render
  handlers: ( options = {} ) ->
    super options
    self = @

    Typeaheads.add_typeahead_to_select @.$container

  # any additional frontend checks to be performed on input 
  sanity_check: (values) ->
    @logger "looks sane"

# -------------------------------------------------------------------
# ## Select Type implementations

# 3 main types to implement, Or being a fourth special case

# #### Class SelectOnly

# Select with no other user input than it exists
# on the rule. These are boolean in the yaml
class SelectOnly extends SelectBase

  @template_id = '#template-select-only'
  @template_tags_id = "#template-tags-#{@verb}"
  @generate_templates()

  constructor: ( options )->
    super options
    @value = options.value

  @generate: ( yaml_def, options = {} ) ->
    @logger "Select '#{@verb}' from yaml", yaml_def, options
    unless yaml_def and yaml_def[@verb]?
      throw new Error "No '#{@verb}' to generate"
    opts = { value: yaml_def[@verb] }
    select_type = SelectTypes.get_type(@verb)
    new select_type _.defaults(opts, options)
  
  dom_to_properties: () ->
    @value = true

  to_yaml_obj: () ->
    o = {}
    o[@verb] = !!@value
    o

class SelectSchedule extends SelectBase

  @template_id = '#template-select-schedule'
  @generate_templates()

  constructor: ( options ) ->
    super options
    @field = options.field
    @logger 'new SelectSchedule: ', @field, options


  @generate: ( yaml_def, options = {} ) ->
    @logger "Select #{@verb} from yaml", yaml_def, options
    throw new Error "No #{@verb} to generate from" unless yaml_def[@verb]?
    sched = yaml_def[@verb]
    opts = {}
    opts.field = sched.name
    opts.value = sched.name
    select_type = SelectTypes.get_type(@verb)
    new select_type _.defaults opts, options

  dom_to_properties: () ->
    @logger "Getting DOM field"
    @field = @get_dom_input('field')
    @logger "GOT ", @field
    # @field


  to_yaml_obj: () ->
    console.log "YAML ", @
    @logger "schedule to yaml: ", @verb, @field
    o = {}
    o[@verb] = {}
    o[@verb]["name"] = @field
    o

  # Add the typeaheads to field inputs on each render
  handlers: ( options = {} ) ->
    super options
    self = @

    Typeaheads.add_typeahead_to_schedule @.$container



# #### Class SelectField

# An action with just a field paramater to view or edit
# We don't have any of these yet. Delete could be one.
class SelectField extends SelectBase

  @template_id = '#template-select-field'
  @generate_templates()

  constructor: ( options )->
    super options
    @field = options.field
    @logger 'new SelectField field:',@field

  @generate: ( yaml_def, options = {} ) ->
    @logger "Select #{@verb} from yaml", yaml_def, options
    throw new Error "No #{@verb} to generate from" unless yaml_def[@verb]?
    name = yaml_def[@verb]
    opts = { field: name }
    select_type = SelectTypes.get_type(@verb)
    new select_type _.defaults(opts, options)

  dom_to_properties: () ->
    @field = @get_dom_input('field')

  to_yaml_obj: () ->
    o = {}
    o[@verb] = @field
    o


# #### Class SelectFieldValue

# An action with both field and value.
#
# For example `set` has a field name and what the value you
# want to set that field to.
class SelectFieldValue extends SelectBase

  @template_id = '#template-select-fieldvalue'
  @generate_templates()

  constructor: ( options )->
    super options
    @field = options.field
    @value = options.value
    @value_placeholder  ?= options.value_placeholder or
                          @constructor.value_placeholder
    @logger "new set field [#{@value}] value [#{@field}]", @value, @field

  @generate: ( yaml_obj, options = {} ) ->
    @logger "Select #{@verb} from yaml", yaml_obj, options
    throw new Error unless yaml_obj[@verb]?
    selects = for field, value of yaml_obj[@verb]
      new_options = _.defaults { field: field, value: value }, options
      select_type = SelectTypes.get_type(@verb)
      new select_type new_options
    @logger "Selects from #{@verb}", selects
    selects

  dom_to_properties: () ->
    @value = @get_dom_input('value')
    @field = @get_dom_input('field')

  to_yaml_obj: () ->
    o = {}
    o[@verb] = {}
    o[@verb][@field] = @value
    o


# #### Class SelectFieldValueNumeric

# Form values are strings, turn the value into a number
class SelectFieldValueNumeric extends SelectFieldValue

  constructor: ( options )->
    super options
    @value_placeholder = "Number"

  dom_to_properties: () ->
    @value = parseInt @get_dom_input('value')
    @field = @get_dom_input('field')


# #### Class SelectFieldValueOr

# A select with field/values that lets you set multiple values
# as an array.  This array turns into a logical OR.
#
# For example `match` can specifiy an array of values that will
# all be checked against the match. liek /test|what/
class SelectFieldValueOr extends SelectBase
  
  @template_id = '#template-select-fieldvalueor'
  @generate_templates()

  constructor: ( options )->
    super options
    @field = options.field
    @value = options.value
    @value = [ @value ] unless _.isArray(@value)
    @build_values_string()
 
    @value_placeholder ?= options.value_placeholder or
                          @constructor.value_placeholder

    # Mustache is balls with loops :/
    # Give it a helper so it can figure out an index
    # `render()` has to reset this each time!
    @value_index = 0
    self = @
    @value_fn = -> self.value_index++

    @logger "new set field [#{@value}] value [#{@field}]", @value, @field

  @generate: ( yaml_obj, options = {} ) ->
    @logger "Select #{@verb} from yaml", yaml_obj, options
    unless yaml_obj[@verb]?
      throw new Error "No verb [#{@verb}] to generate from"
    selects = for field, value of yaml_obj[@verb]
      select_type = SelectTypes.get_type(@verb)
      new_options = _.defaults { field: field, value: value }, options
      new select_type new_options

    @logger "Selects from #{@verb}", selects
    selects

  dom_to_properties: () ->
    @value = @get_dom_inputs('values') # Note the s's
    @value = [ @value ] unless _.isArray(@value)
    @field = @get_dom_input('field')
    @sanity_check @value
    @build_values_string()

  to_yaml_obj: () ->
    value = if _.isArray(@value) and @value.length is 1
      @value[0]
    else
      @value
    o = {}
    o[@verb] = {}
    o[@verb][@field] = value
    o

  render: ( options ) ->
    @value_index = 0
    super options

  handlers: ( options = {} ) ->
    super options
    self = @

    @.$container.off('click.add').on 'click.add', '.select-add-values', ->
      self.logger 'click .select-add-values handler'
      self.value.push ''
      self.render()

    @.$container.off('click.del').on 'click.del', ".select-values-delete", ->
      self.logger 'click .select-values-delete handler'
      
      # This is the array index of the deletion
      index = $(this).attr("data-index")
      if "#{parseInt(index)}" isnt index
        return Message.error "There was a problem deleting the value "+
                              "as it didn't have an index [#{index}]"
      if self.value.length is 1
        Message.label "Can not delete", "You need at east one value!"
        return
      if index > self.value.length - 1
        Message.error "Can not delete", "There aren't that many values"
        return
      self.value.splice(index, 1)
      self.render()


  # Deal with the trailing `or` problem in code
  build_values_string: () ->
    str = '<code>'
    values = _.map @value, (v) -> "#{v}".escapeHTML()
    str += values.join '</code> or <code>'
    str += '</code>'
    @values_string = str


# ------------------------------------------------
# ## Select Types
# The specific Select classes.

# #### Class SelectInitial

# Initial is a dummy action that we can initialise rules with
# So they have a UI select box. It won't serialize anything back
# in the yaml object, just renders something for the user to use
class @SelectInitial extends SelectBase

  @verb: '_initial'
  @logger: debug 'oa:event:rules:action__initial'
  @hidden: true

  @template_id = '#template-select-initial'
  @generate_templates()

  # Custom methods for our special case
  constructor: ( options )->
    super options
    @field = options.field

  @generate: ( yaml_def, options = {} ) ->
    @logger "Action #{@verb} from yaml", yaml_def, options
    opts = { field: false }
    new SelectInitial _.defaults(opts, options)
  
  dom_to_properties: -> true
  
  dom_to_yaml_obj: -> {}
  
  to_yaml_obj: -> {}

  test_event: ( ev ) ->
    false


# #### Class SelectAll

# Set a field in the event
class SelectAll extends SelectOnly

  @verb = 'all'
  @label = 'All'
  @verb_english = 'All events'
  @help = 'Match every event, useful for setting default values or '+
          'transforming data'
  @logger = debug 'oa:event:rules:select_all'

  test_event: ( ev ) ->
    true

# #### Class SelectNone

# Select to stop processing completely and return the even object.
class SelectNone extends SelectOnly

  @verb = 'none'
  @label = 'None'
  @verb_english = 'No events'
  @help = 'Don\'t match any events'
  @logger = debug 'oa:event:rules:select_none'

  test_event: ( ev ) ->
    false

# #### Class SelectMatch

# Select to stop only the current rule_set and move to the next.
class SelectMatch extends SelectFieldValueOr

  @verb = 'match'
  @label = 'Matches'
  @value_placeholder = 'String or /regex/'
  @verb_english = 'matches'
  @help = 'Field matches a string search. Can be a Javascript // regex '+
          'definition or plain string'
  @logger = debug 'oa:event:rules:select_match'

  # additional checks for `match` should warn against double pipe usage
  sanity_check: (values)->
    for value in values
      if value.match /\|\|/
        Message.warn "Double pipe '||' detected - will match everything"
    true


  test_event: ( ev ) ->
    unless ev[@field]?
      return false
    re = Helpers.regex_from_array(@value)
    @logger 'SelectMatch testing value[%j] re[%s] field[%s]', @value, re, @field
    return true if "#{ev[@field]}".match(re)
    false


# #### Class SelectEquals

# Skip processing this rule, like comment it.
# This should become an Option!
class SelectEquals extends SelectFieldValueOr

  @verb = 'equals'
  @label = 'Equals'
  @value_placeholder = 'String'
  @verb_english = 'equals'
  @help = 'Field exactly matches a string'
  @logger = debug 'oa:event:rules:select_equals'

  test_event: ( ev ) ->
    for value in @value
      return true if ev[@field] is value
    false

# #### Class SelectScheduleName

class SelectScheduleName extends SelectSchedule

  @verb = 'schedule'
  @label = 'Schedule Name'
  @verb_english = 'schedule'
  @help = 'Named Schedule'
  @logger = debug 'oa:event:rules:select_schedule'

  test_event: (ev) ->
    for value in @value
      return true if ev[@field] is value
    false

# #### Class SelectFieldExists

# Turn on debug for this rule providing extra info
# to event_server about it's inner machinations
class SelectFieldExists extends SelectField

  @verb = 'field_exists'
  @label = 'Fields exists'
  @verb_english = 'exists'
  @help = 'Field exists in the event'
  @logger = debug 'oa:event:rules:select_field_exists'

  test_event: ( ev ) ->
    ev[@field]?


# #### Class SelectFieldMissing

# Turn on debug for this rule providing extra info
# to event_server about it's inner machinations
class SelectFieldMissing extends SelectField

  @verb = 'field_missing'
  @label = 'Fields is missing'
  @verb_english = 'is missing'
  @help = 'Field does not exist in the event'
  @logger = debug 'oa:event:rules:select_field_missing'

  test_event: ( ev ) ->
    !(ev[@field]?)


# #### Class SelectStartsWith

# Turn on debug for this rule providing extra info
# to event_server about it's inner machinations
class SelectStartsWith extends SelectFieldValue

  @verb = 'starts_with'
  @label = 'Starts with'
  @value_placeholder = 'String'
  @verb_english = 'starts with'
  @help = 'Field starts with a specific string'
  @logger = debug 'oa:event:rules:select_starts_with'

  test_event: ( ev ) ->
    "#{ev[@field]}".startsWith @value


# #### Class SelectEndsWith

# Turn on debug for this rule providing extra info
# to event_server about it's inner machinations
class SelectEndsWith extends SelectFieldValue

  @verb = 'ends_with'
  @label = 'Ends with'
  @value_placeholder = 'String'
  @verb_english = 'ends with'
  @help = 'Field ends with a specific string'
  @logger = debug 'oa:event:rules:select_ends_with'

  test_event: ( ev ) ->
    "#{ev[@field]}".endsWith @value


# #### Class SelectLessThan

# Turn on debug for this rule providing extra info
# to event_server about it's inner machinations
class SelectLessThan extends SelectFieldValueNumeric

  @verb = 'less_than'
  @label = 'Less than'
  @verb_english = 'is less than'
  @help = 'Field is less than (integers only)'
  @logger = debug 'oa:event:rules:select_less_than'

  test_event: ( ev ) ->
    ev[@field] < @value


# #### Class SelectGreaterThan

# Turn on debug for this rule providing extra info
# to event_server about it's inner machinations
class SelectGreaterThan extends SelectFieldValueNumeric

  @verb = 'greater_than'
  @label = 'Greater than'
  @verb_english = 'is greater than'
  @help = 'Field is greater than (integers only)'
  @logger = debug 'oa:event:rules:select_greater_than'

  test_event: ( ev ) ->
    ev[@field] > @value


# -------------------------------------------------------------------
# ### Class SelectTypes

# Describes the various types of Action configured above
class @SelectTypes extends RuleVerbTypes

  @verb_type = 'select'

  @logger = debug 'oa:event:rules:select_types'

  @types:
    _initial:       SelectInitial
    all:            SelectAll
    none:           SelectNone
    match:          SelectMatch
    equals:         SelectEquals
    field_exists:   SelectFieldExists
    field_missing:  SelectFieldMissing
    starts_with:    SelectStartsWith
    ends_with:      SelectEndsWith
    less_than:      SelectLessThan
    greater_than:   SelectGreaterThan
    schedule:       SelectScheduleName


# -------------------------------------------------------------------
# ### Class Selects

# Houses all the Selects. It's the public API for the rules system
# to get access to a select instances
#
#     Select.generate( yamlRule, options )
#
# Please note its possible for `.generate` to return an array of
# `SelectVerb` as verbs with multiple keys will be split into an
# instance for each key, that can me merged at the other end.
class @Selects extends RuleVerbSet

  @logger = debug 'oa:event:rules:selects'

  @verb_type = 'select'
  @verb_lookup_class = SelectTypes
  @verb_class = SelectBase


  validate: ( options ) ->
    errors = super options
    if @verb_instances.length is 0
      errors.add_new_error "You must have at least one #{@verb_type}",
        { $element: @.$container }
    errors

  test_event: ( ev ) ->
    for verb_instance in @verb_instances
      return false unless verb_instance.test_event(ev)
    return true