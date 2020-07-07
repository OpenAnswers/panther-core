# # Actions

# Manages all the actions and how they parse/render/validate.
# Generic stuff goes in ActionBase.
# Each action verb has a class. 
# 
# For example when `set` appears in a Rule yaml definition, 
# ActionSet is used etc.



# -------------------------------------------------------------------
# ## ActionBase
# #### Base Action implementation

# Base class for specific Actions to extend
# Most of what was here has been moved to RuleVerbBase 
# So selects, actions, options can all use it
class @ActionBase extends RuleVerbBase

  @logger ?= debug 'oa:event:rules:action'

  @verb ?= '_actionbase_'

  @verb_type  = 'action'

  @dom_name   = @verb_type
  @dom_data_id = 'verb'
  @dom_class  = 'action-entry'
  @dom_selector  = '.'+@dom_class

  handlers: ( options = {} )->
    super options
    Typeaheads.add_typeahead_to_action @.$container


# -------------------------------------------------------------------
# ## Action Type implementations

# 3 main types to implement, replace being a fourth special case

# #### Class ActionOnly

# Action with no other user input than it exists
# on the rule. These are boolean in the yaml
class ActionOnly extends ActionBase

  @template_id = '#template-action-only'
  @generate_templates()

  constructor: ( options )->
    super options
    @value = options.value

  @generate: ( yaml_def, options = {} )->
    @logger "Action '#{@verb}' from yaml", yaml_def, options
    throw new Error "No '#{@verb}' to generate" unless yaml_def[@verb]?
    opts = value: yaml_def[@verb]
    verb_class = ActionTypes.get_type(@verb)
    new verb_class _.defaults(opts, options)

  dom_to_properties: ()->
    @value = true

  to_yaml_obj: ()->
    o = {}
    o[@verb] = !!@value
    o


# #### Class ActionField

# An action with just a field paramater to view or edit
# We don't have any of these yet. Delete could be one.
class ActionField extends ActionBase

  @template_id = '#template-action-field'
  @generate_templates()

  constructor: ( options )->
    super options
    @field = options.field
    @logger "new Action '%s' field - %s", @verb, @field

  @generate: ( yaml_def, options = {} )->
    @logger "Action #{@verb} from yaml", yaml_def, options
    throw new Error "No #{@verb} to generate from" unless yaml_def[@verb]?
    name = yaml_def[@verb]
    opts = field: name
    verb_class = ActionTypes.get_type(@verb)
    new verb_class _.defaults(opts, options)

  get_dom_field: ()->
    field = @$template_edit_el.find('.action-field > input').val()
    @logger 'field', field
    field

  dom_to_properties: ()->
    @field = @get_dom_field()

  to_yaml_obj: ()->
    o = {}
    o[@verb] = @field
    o


# #### Class ActionFieldValue

# An action with both field and value.
#
# For example `set` has a field name and what the value you 
# want to set that field to.
class ActionFieldValue extends ActionBase

  @template_id = '#template-action-field-value'
  @generate_templates()

  constructor: ( options )->
    super options
    @field = options.field
    @value = options.value
    @logger 'set field to [%s] set value to [%s]', @field, @value

  @generate: ( yaml_obj, options = {} )->
    @logger "Action #{@verb} from yaml", yaml_obj, options
    throw new Error unless yaml_obj[@verb]?
    actions = for field, value of yaml_obj[@verb]
      new_options = _.defaults {field: field, value: value}, options
      verb_class = ActionTypes.get_type(@verb)
      new verb_class new_options
    @logger "Actions from #{@verb}", actions
    actions

  get_dom_field: ()->
    field = @$template_edit_el.find('.action-field > input').val()
    @logger 'field', field
    field

  get_dom_value: ()->
    value = @$template_edit_el.find('.action-value > input').val()
    @logger 'value', value
    value

  dom_to_properties: ()->
    @value = @get_dom_value()
    @field = @get_dom_field()

  to_yaml_obj: ()->
    o = {}
    o[@verb] = {}
    o[@verb][@field] = @value
    o

# ------------------------------------------------
# ## Action Types
# The specific Action classes.


# #### Class ActionInitial

# Initial is a dummy action that we can initialise rules with
# So they have a UI select box. It won't serialize anything back
# in the yaml object, just renders something for the user to use
class @ActionInitial extends ActionBase

  @verb: '_initial'
  @label: 'Initial'
  @help: 'This is a new action, set me to one of the action types'
  
  @logger: debug 'oa:event:rules:action__initial'
  @hidden: true

  @template_id = '#template-action-initial'
  @generate_templates()

  # Custom methods for our special case
  constructor: ( options )->
    super options
    @field = options.field

  @generate: ( yaml_def, options = {} )->
    @logger "Action #{@verb} from yaml", yaml_def, options
    opts = field: false
    new ActionInitial _.defaults(opts, options)
  
  dom_to_properties: -> true
  
  dom_to_yaml_obj: -> {}
  
  to_yaml_obj: -> {}


# #### Class ActionDiscard

# Discard the event
class @ActionDiscard extends ActionOnly

  @verb: 'discard'
  @label: 'Discard'
  @label_long: 'Discard these events'
  @help: 'Discard this event and stop rule processing'
  @logger: debug 'oa:event:rules:action_discard'
# #### Class ActionSet

# Set a field in the event
class @ActionSet extends ActionFieldValue

  @verb: 'set'
  @label: 'Set'
  @label_long: 'Set the field %s to %s'
  @help: 'Set a field to a new value'
  @logger: debug 'oa:event:rules:action_set'


# #### Class ActionReplace

# Replace a field in the event with new content. This is a
# slightly custom setup compared to the others. There's no
# type implementation for it
class @ActionReplace extends ActionBase
  @template_id = '#template-action-replace'

  @verb = 'replace'
  @label = 'Replace'
  @label_long: 'Replace %s with %s in %s'
  @logger = debug 'oa:event:rules:action_replace'
  @generate_templates()

  @generate: ( yaml_obj, options )->
    @logger "Gen Action '#{@verb}' from yaml", yaml_obj, options
    throw new Error "No 'replace' to generate" unless yaml_obj.replace
    replaces = Helpers.ensure_array yaml_obj.replace
    for replace in replaces
      @logger 'replace found', replace
      options.field = replace.field
      options.this = replace.this
      options.with = replace.with
      new ActionReplace options

  constructor: ( options )->
    super options
    @this   = options.this
    @field  = options.field
    @with   = options.with
    @logger @to_english()

  to_english: ( options )->
    "look in field [#{@field}] for this [#{@this}] and replace with [#{@with}]"

  dom_to_properties: ()->
    @field = @get_dom_input('field')
    @this = @get_dom_input('this')
    @with = @get_dom_input('with')

  to_yaml_obj: ()->
    o = {}
    o[@verb] =
      field: @field
      this: @this
      with: @with
    o

  # Special addition of typeahead for replace `field` field
  handlers: ( options )->
    super options

# #### Class ActionStop

# Action to stop processing completely and return the even object.
class @ActionStop extends ActionOnly

  @verb = 'stop'
  @label = "Stop"
  @label_long: 'Stop processing rules completely'
  @help = 'Stop rule immediately and return the event'
  @logger = debug 'oa:event:rules:action_stop'


# #### Class ActionStopRuleSet

# Action to stop only the current rule_set and move to the next.
class @ActionStopRuleSet extends ActionOnly

  @verb = 'stop_rule_set'
  @label = "Stop Rule Set"
  @label_long: 'Stop processing event and move to the next rule set'
  @help = 'Stop processing the current rule set and move to the next. Helps short circuit rule processing.'
  @logger = debug 'oa:event:rules:action_stop_rule_set'



# -------------------------------------------------------------------
# ### Class ActionTypes

# Describes the various types of Action configured above
class @ActionTypes extends RuleVerbTypes

  @verb_type = 'action'
  
  @verb_lookup_class = ActionTypes
  
  @verb_class = ActionBase

  @logger = debug 'oa:event:rules:action_types'

  @types:
    _initial: ActionInitial
    discard: ActionDiscard
    replace: ActionReplace
    set: ActionSet
    stop: ActionStop
    stop_rule_set: ActionStopRuleSet



# -------------------------------------------------------------------
# ### Class Actions

# Houses all the Actions. It's the public API for people to get 
# access to actions. 
#
#     Action.generate( yamlRule, options )
#
class @Actions extends RuleVerbSet

  @verb_type: 'action'

  @logger: debug 'oa:event:rules:action'

  @verb_lookup_class = ActionTypes
  @verb_class = ActionBase


  # Removing an action
  remove_action: ( action_to_remove )->
    remove_instance action_to_remove

  # Add an array of VerbType instances
  add_actions: ( new_actions )->
    for new_action in new_actions
      @add_action new_action

  add_action: ( action )->
    unless action instanceof ActionBase
      throw new Error 'Adding an Action that is not an ActionType'
    @add_instance action

  # Combine the list of actions, with a replace array merge
  # Note that the data is merged to handle a verb with multiple fields
  to_yaml_obj: ->
    o = {}
    for action in @verb_instances
      @logger "to_yaml_obj building '#{action.id}'"
      if action.verb is 'replace'
        o.replace = [] unless o.replace
        o.replace.push action.to_yaml_obj().replace
      else
        _.defaultsDeep o, action.to_yaml_obj()
    o

  validate: ( options = {} )->
    errors = super options
    if @verb_instances.length is 0
      errors.add_new_error 'You must have at least one action in a rule',
        $element: @.$container
    for instance in @verb_instances
      instance.validate errors:errors
    errors

