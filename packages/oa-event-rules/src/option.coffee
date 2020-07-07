
# # Rule Options

# Options allow you to change the way a rule ia applied

# - `original`
#   select an action on the original message content instead of copy
#   being modified as the event progresses through the rules
#
# - `unless`
#   Special cases to not match a match

# Logging
{ logger, debug } = require('oa-logging')('oa:event:rules:action')

# NPM modules
yaml = require 'js-yaml'

# OA modules
{ throw_error, _ } = require 'oa-helpers'



# ## OptionBase

# Generic Option to implement
class OptionBase
  
  @label = '__base'

  @generate: ( yaml, options )->
    new @ yaml: yaml

  @description: -> {
    name: @label
    input: []
  }

  constructor: ->
    @label = @constructor.label


  to_object: ->
    o = {}
    o[@label] = true
    o
    
  to_yaml_obj: ->
    o = {}
    o[@label] = true
    o

  to_yaml: ->
    yaml.dump @to_yaml_obj()


# ## OptionOriginal

# Match on the original input message instead of the modified copy
class OptionOriginal extends OptionBase
  
  @label = 'original'
  @disabled = true


# ## OptionSkip

# Skip this rule in certain cases
class OptionSkip extends OptionBase
  
  @label = 'skip'


# ## OptionDebug

# Skip this rule in certain cases
class OptionDebug extends OptionBase
  
  @label = 'debug'


# ## OptionAuthor
# Might be for metadata? probably not an option
class OptionAuthor extends OptionBase

  @label = 'author'
  @disabled = true


# ## OptionUnless
# Skip this rule in certain cases
class OptionUnless extends OptionBase
  
  @label = 'unless'
  @disabled = true


# ## Option

# Option that a Rule interacts with
class Option

  @types:
    original: OptionOriginal
    skip:     OptionSkip
    debug:    OptionDebug
    unless:   OptionUnless
    author:   OptionAuthor

  @types_list: ()->
    return @_types_list if @_types_list
    @_types_list = []
    for type of @types
      @_types_list.push(type) unless type.disabled
  
  @all_types_list: ()->
    @_all_types_list ?= _.keys @types

  @disabled_types_list: ()->
    return @_disabled_types_list if @_disabled_types_list
    @_disabled_types_list = []
    for type of @types
      @_disabled_types_list.push(type) if type.disabled

  # Store a static variable of all the type information
  @types_description = {}
  for name of @types
    @types_description[name] = @types[name].description()

  # Generate an object from a yaml definition
  @generate: (yaml_def) ->
    debug 'generate option from', yaml_def

    option_instances = []

    options = _.intersection  _.keys(yaml_def), @types_list()

    # Generate the actions present in the yaml
    for option in options
      debug 'found option', option
      option_instance = @types[option].generate yaml_def

      # Should probaly check if the instances in the array are
      # of the right type as well
      unless option_instance instanceof OptionBase or
             option_instance instanceof Array
        throw_error 'option is not of type ActionBase', option_instance
      option_instances = option_instances.concat option_instance

    # Create the object
    debug 'built options', option_instances
    new Option option_instances

  # Add a contstructor so generate can pass in `options`
  constructor: (@options) ->

  to_object: ->
    o = {}
    for option in @options
      _.defaults o, option.to_object()
    o

  to_yaml_obj: ->
    o = {}
    for option in @options
      _.defaults o, option.to_yaml_obj()
    o

  to_yaml: ->
    yaml.dump @to_yaml_obj()


module.exports =
  Option: Option
  OptionBase: OptionBase
  OptionUnless: OptionUnless
  OptionDebug: OptionDebug
  OptionSkip: OptionSkip
  OptionAuthor: OptionAuthor
  OptionOriginal: OptionOriginal
