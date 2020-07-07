# # RuleVerbTypes

# Configure and hold a set of RuleVerbs
# Option, Action, Select extend this
class RuleVerbTypes

  # The name of the type. `option`, `action`, `select` etc
  @verb_type: '_verbtype_'

  # ID of the verb type to override
  @id: 'Type'
  @contains_class: RuleVerbBase
  @class: 'verb-entry'

  # Object to hold the verb name -> Class mapping
  @types: {}

  # Debug logger to override
  @logger: debug 'oa:event:rules:rule_verb_type'

  # Lookup a verb type
  @lookup_type: ( type )->
    @types[type] or false

  # Get a verb type and throw
  @get_type: ( type )->
    @logger 'type', type, @types
    @types[type] or throw new Error "No #{@verb_type} verb #{type}"

  # Return all the type names
  @all_types: ()->
    @types_keys ?= _.keys @types

  # Return only the active type names
  @active_types: ()->
    @types_keys_active ?= _.compact _.map( @types, ( v, k )->
      k if v.disabled isnt true and v.hidden isnt true
    )

  # Find all the `types` verbs also found in a as passed in object.
  # Usually for the yaml definition
  @find_types_in: ( yaml_def )->
    _.intersection _.keys(yaml_def), _.keys(@types)

  # Expect we have a correct class type
  @expect_class_type: ( obj, type = @contains_class )->
    unless obj instanceof type
      throw new Error "Object #{typeof obj} is not of type #{type.name}"

  # Check we have the local class type
  @check_class_type: ( obj )->
    obj instanceof @contains_class

