
# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:action')

# npm modules
yaml  = require 'js-yaml'

# oa modules
{ _
  is_regexy
  regexy_to_regex
  throw_error
  format_string  } = require 'oa-helpers'

Errors = require 'oa-errors'


# We need self as we are building the classes on this (`@`) for export
# If we reference need to reference the classes anywhere @ changes
# probably should go back to module.exports to be less esoteric
self = this


# ## Class ActionBase
# The base Action implementation

class @ActionBase

  @label: '__base'

  # Provides a description of the Actions fields
  @description: -> {
    name: @label
    input: []
  }

  @generate: (yaml_def) ->
    unless yaml_def[@label]?
      Errors.throw_a Errors.ValidationError, "No [#{@label}] field in definition", yaml_def
    new @

  # The action_id must be a truthey value
  constructor: (@action_id = true) ->
    @label = @constructor.label

  run: (event_obj) ->
    throw_error 'run not implemented'

  toString: ->
    "@::constructor.label"

  to_yaml_obj: ->
    throw_error 'to_yaml_obj not implemented'

  to_yaml: ->
    yaml.dump @to_yaml_obj()


  # ###### format_string( event, value = @value )

  # Field `{field}` and re match group `{match.1}` replacement
  @match_group_re = /\{match\.\d+\}/
  @input_re = /\{input\.[\w\.]+}/


  #@format_string_re: /\{match\.\d+\}/
  replace_format_string: ( event, value = @value )->
    unless _.isString value
      return value

    # first replace the {values} with anything from the modified event
    value = format_string @value, event.copy

    # Check if the have a {input.structuredData} group in the message
    if value.match( /\{input\.structuredData\.[\w\._]+}/ )
      if event.has_structured_data()
        debug 'found a {input.structuredData} value to replace', value, event.input.structuredData
        value = ActionBase.format_string_with_prefix 'input.structuredData', @value, event.input.structuredData
      else
        logger.warn 'Rule was looking for structured data but none was available'

    # Check if the have a {input.} group in the message
    if value.match( /\{input\.[\w\._]+}/ )
      debug 'found a {input.} value to replace', value, event.input
      value = ActionBase.format_string_with_prefix 'input', @value, event.input

    # Check if the have a {match.1} group still in the message
    unless value.match( /\{match\.\d+\}/ )
      return value

    match_arr = event.match_groups()
    unless match_arr.length > 0
      debug "format_string: event didn't have match groups", match_arr
      logger.warn "A rule tried to replace match groups but the supplied event didn't have any", event, value
      return value

    debug "format_string: doing a match replace with match_arr", match_arr
    match_format_vars = {}
    for matched, i in match_arr
      match_format_vars["match.#{i+1}"] = matched

    debug "format_string: doing a match replace @val[%s] val[%s] vars[%j]", @value, value, match_format_vars
    
    value = format_string value, match_format_vars


  # Replace only {prefix.field} values with data.
  # For log4j2/RFC5424 syslog.implementation.
  # Does not recurse down objects!
  # I did this quickly, It needs a generic solution for . notation replacements
  # like `format_string` in `oa-helpers` where most of this is yanked from
  @format_string_with_prefix: ( prefix, str, args... )->
    debug 'format_string_with_prefix in', prefix, str, args
    # leave if there's something odd
    return str if typeof str isnt 'string'
    # leave unless we have data
    return str unless args
    # leave unless we have something to replace `{blah}`
    # which is a bit quicker than failing to match every arg
    return str unless str.indexOf('{') > -1 and str.indexOf('}') > -1

    args = args[0] if typeof args[0] is 'object'
    for arg of args
      debug 'format_string_with_prefix arg', arg, prefix, str
      re  = RegExp "\\{#{prefix}\.#{arg}\\}", "gi"
      str = str.replace re, args[arg]
    return str


# ### ActionSet

# Set an event field to a value
# Supports a {field} notation to reference fields from the event
# Supports a {match.n} notation to reference captured groups from 
# Select Match

# Plain values

#    set:
#      afield: value

# Multiple values

#    set:
#      afield: value
#      bfield: value

# Use entities from the event object

#    set:
#      afield: "Use the value from {another_event_field}"


# Use capture groups from the Select Match

#    set:
#      afield: "Use the capture group from select > {match.1}"

class @ActionSet extends @ActionBase

  @label: 'set'

  @description: -> {
    name: @label
    description: 'Sets the value of a field to a specified value.'
    input: [{
      name: 'field'
      label: 'field'
      type: 'string'
    },
    {
      name: 'value'
      label: 'value'
      type: 'string'
      beforetext: 'to'
    }]
  }


  # Generate a set

  #     set:
  #       a_field: new_view
 
  #     set:
  #       a_field: new_valuesys
  #       both_field: other value

  # Returns an array of set objects

  @generate: (yaml_def) ->
    Errors.throw_a Errors.ValidationError, "no [#{@label}] in definition", yaml_def unless yaml_def[@label]?
    
    sets = for field, value of yaml_def[@label]
      Errors.throw_a Errors.ValidationError, "no [#{@label}] value in definition", yaml_def unless value?
      new @ field, value


  constructor: (@field, @value) ->
    # Check for emptiness of field and value
    throw_error 'Action param 1: field' unless @field?
    throw_error 'Action param 2: value' unless @value?
    throw_error 'Action param 1: field' if @field == ''
    throw_error 'Action param 2: value' if @value == ''
    debug 'new', @label, @field, @value
    @label = @constructor.label

  # store the {match.n} regexp
  #@match_re: /\{match\.\d+\}/g

  run: (event_obj) ->
    debug "run about to set field [%s] to [%s]", @field, @value
    value = @value

    # magical field and match group replacement
    value = @replace_format_string event_obj

    event_obj.set @field, value
    debug "set field [%s] to [%s]", @field, value
    event_obj


  toString: ->
    "set [#{@field}] to [#{@value}]"


  to_yaml_obj: ->
    action_obj = {}
    action_obj[@field] = @value
    action_obj



# ### ActionDiscard

#    discard: true

# Discard this event, and stop rule processing

class @ActionDiscard extends @ActionBase
  
  @label: 'discard'

  @description: -> {
    name: @label
    description: 'Discards the event immediately, and applies no further processing.'
    friendly_name: 'Discard'
    friendly_after: 'this event'
    input: []
  }

  run: (event_obj) ->
    debug 'discarding event', @action_id
    event_obj.set 'severity', -1
    event_obj.discard @action_id
    event_obj.stop @action_id
    event_obj

  to_yaml_obj: ->
    action_obj = {}
    action_obj[@constructor.label] = true
    action_obj


# ### ActionReplace

#    replace:
#      field: name
#      this:  /what to look for/
#      with:  whatever

class @ActionReplace extends @ActionBase
  
  @label: 'replace'

  @description: -> {
    name: @label
    description: 'Replaces content within a field. Regex is allowed.'
    input: [{
      name: 'field'
      label: 'field'
      type: 'string'
      beforetext: 'in'
    },
    {
      name: 'this'
      label: 'search text or /regex/'
      type: 'stregex'
      beforetext: 'where'
    },
    {
      name: 'with'
      label: 'replacement'
      type: 'string'
      beforetext: 'with'
    }]

  }

  # ###### generate( yaml_def )
  # Generates a *Replace* from an object in the yaml format
  @generate: (yaml_def) ->
    Errors.throw_a Errors.ValidationError, 'No field [replace] in definition', yaml_def unless yaml_def.replace?
    replace_def  = yaml_def.replace

    # horrible but had problems calling an `@` function from in here
    if replace_def instanceof Array
      replaces = for replace in replace_def
        Errors.throw_a Errors.ValidationError, 'No field [field] in replace definition', yaml_def unless replace.field?
        Errors.throw_a Errors.ValidationError, 'No field [field] in replace definition', yaml_def if replace.field == ''

        Errors.throw_a Errors.ValidationError, 'No field [this] in replace definition', yaml_def unless replace.this?
        Errors.throw_a Errors.ValidationError, 'No field [with] in replace definition', yaml_def unless replace.with?
        if is_regexy(replace.this)
          replace_this = regexy_to_regex(replace.this)
        else 
          replace_this = replace.this
        new ActionReplace replace.field, replace_this, replace.with

    else
      Errors.throw_a Errors.ValidationError, 'No field [field] in replace definition', yaml_def unless replace_def.field?
      Errors.throw_a Errors.ValidationError, 'No field [field] in replace definition', yaml_def if replace_def.field == ''

      Errors.throw_a Errors.ValidationError, 'No field [this] in replace definition', yaml_def unless replace_def.this?
      Errors.throw_a Errors.ValidationError, 'No field [with] in replace definition', yaml_def unless replace_def.with?

      debug 'is_regexy', replace_def.this, is_regexy, is_regexy('test'), is_regexy('/test/')
      if is_regexy(replace_def.this)
        replace_this = regexy_to_regex(replace_def.this)
      else 
        replace_this = replace_def.this

      new ActionReplace replace_def.field, replace_this, replace_def.with


  # ###### new Replace( field_name, serach, replace )
  # Run an *Event* object though the *Replace* action
  # Note, this isn't the plain event but the Event class
  constructor: (@field, @this, @with) ->
    # check for emptiness
    # we don't car about 'this' or 'with' as emptiness may be desired
    throw_error 'param 1: field'  unless @field?
    throw_error 'param 2: this'   unless @this?
    throw_error 'param 3: with'   unless @with?
    throw_error 'param 1: field'  if @field == ''
    @label = @constructor.label


  # ###### run( event_object )
  # Run an *Event* object though the *Replace* action
  # Note, this isn't the plain event but the Event class
  run: (event_obj) ->
    field = event_obj.get @field
    debug 'replace run: [%s] [%s] [%s]', field, @this, @with
    new_field = "#{field}".replace @this, @with
    event_obj.set @field, new_field
    debug 'replace ran: [%s]', new_field
    event_obj

  # ###### toString()
  # Create a human readable representation of the object
  toString: ->
    "replace this [#{@this}] with [#{@with}] in [#{@field}]"

  # ###### to_yaml_obj()
  # Turn it back into the yaml format of object
  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] =
      field: @field
      this:  @this
      with:  @with



# ### ActionStop

# This stops rule processing completely

class @ActionStop extends @ActionBase
  
  @label: 'stop'

  constructor: (@id) ->
    # end should be a hash identifying the
    # RuleSet:Rule doing the ending
    @label = @constructor.label

  run: (event_obj) ->
    debug "end", @id
    event_obj.stop()

  toString: ->
    "stop processing rules"

  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] = true



# ### ActionStopRuleSet

# This stops processing for the current ruleset, but will
# continue to the next

class @ActionStopRuleSet extends @ActionBase
  
  @label: 'stop_rule_set'

  constructor: (@id) ->
    # end should be a hash identifying the
    # RuleSet:Rule doing the ending
    @label = @constructor.label

  run: (event_obj) ->
    debug "end", @id
    event_obj.stop_rule_set()

  toString: ->
    "stop processing this rule set"

  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] = true



# ### ActionNothing

# Do nothing.. no matter what is defined skip these actions
# This lives in Selects as well so no actions will take effect

class @ActionNothing extends @ActionBase
  
  @label: 'skip'

  run: ->
    debug "nothing"
    true

  toString: ->
    "nothing"

  to_yaml_obj: ->
    o = {}
    o[@constructor.label] = true
    o



# ### Action

# Public interface to the Actions on a Rule

# This is a kind of factory class.
# It takes the YAML definition of a rule in and sets up
# an array of Actions of the required types. 
# That array can then be `run` on an event and
# make the required modifications.
# Selects guard the event object from actions.

class @Action

  # Map the yaml words to classes (should be auto Action+CamelWord)
  @types =
    discard:        self.ActionDiscard
    replace:        self.ActionReplace
    set:            self.ActionSet
    stop:           self.ActionStop
    stop_rule_set:  self.ActionStopRuleSet

  # Return the list of types
  @types_list: ->
    _.keys @types

  # Build the types description object from all the different
  # Action types
  @types_description = {}
  for name of @types
    @types_description[name] = @types[name].description()
  
  # Generate an object from a yaml definition
  @generate: (yaml_def) ->
    debug 'generate action from', yaml_def

    action_instances = []

    actions = _.intersection  _.keys(yaml_def), _.keys(@types)
    
    if actions.length == 0
      msg = "Action generate: No action found in definition"
      Errors.throw_a Errors.ValidationError, msg, yaml_def, _.keys(yaml_def), _.keys(@types)

    # Generate the actions present in the yaml
    for action in actions
      debug 'found action', action
      action_instance = @types[action].generate yaml_def

      # Should probaly check if the instances in the array are 
      # of the right type as well
      unless action_instance instanceof self.ActionBase or
             action_instance instanceof Array
        throw_error 'action is not of type ActionBase', action_instance
      action_instances = action_instances.concat action_instance

    # Create the object
    debug 'built actions', action_instances
    new Action action_instances

  # Add a contstructor so generate can pass in `actions`
  constructor: (@actions) ->

  # Run the event through the actions
  # This will generally only happen after a *Select*
  # has returned `true`
  run: (event_obj) ->
    for action in @actions
      action.run event_obj
    event_obj

  # Create a string for a hu-man
  toString: ->
    (action.toString() for action in @actions).join ' and '

  # Loop through the actions and generate the object for yaml
  # FIXME This doesn't deal with arrays in `replace:`!!
  to_yaml_obj: ->
    o = {}
    for action in @actions
      if action is 'replace'
        o.replace = [] unless o.replace
        o.replace.push action.to_yaml_obj().replace
      else
        _.defaults o, action.to_yaml_obj()
    o
  
  # Convert the object into yaml
  to_yaml: ->
    yaml.dump @to_yaml_obj()
