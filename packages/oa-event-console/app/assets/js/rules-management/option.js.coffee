# # Option

# Options are verbs that modify behaviour but dont
# fit in the select/action grouping. So they apply
# no matter what selects you have setup
#
# - skip - enable or disable a rule, like commenting it out
# - debug - TBA but you get the drift

# ## Class OptionBase

class OptionBase extends RuleVerbBase

  @verb_type  = 'option'
  @dom_name   = @verb_type
  @dom_class  = 'option-entry'

  @template_id: "#template-option-boolean"
  @generate_templates()

  @generate: ( yaml_def, options = {} )->
    @logger "generate() the #{@verb_type} '#{@verb}' from yaml", yaml_def, options
    throw new Error "No '#{@verb}' to generate" unless yaml_def[@verb]?
    unless yaml_def[@verb]
      @logger "generate() found a false value for [#{@verb}], dumping out"
      return false
    opts = value: yaml_def[@verb]
    new @ _.defaults(opts, options)

  constructor: ( options )->
    super options
    @value = options.value

  remove: ()->
    @rule.options.remove @

  dom_to_properties: ()->
    #@value = @get_dom_input 'value'
    # Existence means makes options true so there is no data to get.
    # Deletion means false
    @value = true

  # Note the skipping of falsey values
  # And true/false only nature
  to_yaml_obj: ()->
    o = {}
    if @value
      o[@verb] = !!@value
    o


# ## Class OptionDebug

class OptionDebug extends OptionBase
  @logger = debug 'oa:event:rules:option_debug'
  
  @verb   = 'debug'
  @label  = 'Debug'
  @verb_english = 'Enable debug'
  @help   = 'Create debug logging for this rule as events pass through'

  # This isn't active yet
  @disabled = true


# ## Class OptionSkip

class OptionSkip extends OptionBase
  @logger = debug 'oa:event:rules:option_skip'
  
  @verb   = 'skip'
  @label  = 'Skip'
  @verb_english = 'Skip this rule'
  @help   = 'Skip processing of this rule but keep it in the list. Useful for debugging'


# ------------------------------------------------------------
# ## Class OptionsTypes

class OptionTypes extends RuleVerbTypes

  @logger = debug 'oa:event:rules:options'

  @verb_type          = 'option'

  @types:
    debug: OptionDebug
    skip:  OptionSkip


# ------------------------------------------------------------
# ## Class Options

# Stores the types of options and the list of option instances
class Options extends RuleVerbSet

  @logger = debug 'oa:event:rules:options'

  @verb_type = 'option'
  @verb_lookup_class  = OptionTypes
  @verb_class         = OptionBase

  @generate: ( yaml_def, options )->
    option_list = super yaml_def, options
    option_reject_list = _.reject option_list, value: true
    @logger 'generate() is rejecting these false gods:', option_reject_list
    option_list
