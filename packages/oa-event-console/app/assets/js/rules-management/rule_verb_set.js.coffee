


# # RuleVerbSet

# Configure and hold a set of RuleVerbs
class RuleVerbSet extends Rendered

  @verb_type = '_verbtype_'

  # Id of the verb type to override
  @id = 'Type'

  # What RuleVerbBase class we are a set of?
  @verb_class = RuleVerbBase

  # What RuleVerbTypes class should be use to lookup
  @verb_lookup_class   = RuleVerbTypes
  
  # Dom properties to apply
  @dom_class    = 'verb-entry'
  @dom_name     = 'verb_set'
  @dom_data_id  = 'verb_set'

  # Debug logger to override
  @logger = debug 'oa:event:rules:rule_verb_set'

  # Expect we have a correct class type
  @expect_class_type: ( obj, type = @verb_class)->
    unless obj instanceof type
      throw new Error "Object #{typeof obj} is not of type #{type.name}"

  # Check we have the local class type
  @check_class_type: ( obj )->
    obj instanceof @verb_class

  # Generate all the types in the yaml defintion
  # Stores all the instance in an array
  # Has to deal with arrays of instances as well
  @generate: ( yaml_def, options = {} )->
    verbs_in_def = @verb_lookup_class.find_types_in(yaml_def)

    verb_set = new @ options
    @logger 'options are', options
    verb_options = _.omit options, '$container'
    @logger 'options are now', options
    # Render a view warning that no rules exist and the add/edit
    # interface only.
    if verbs_in_def.length is 0
      unless @verb_type is 'option'
        console.error "No #{@verb_type} verbs in yaml_def", yaml_def
      return verb_set

    # Now process the verbs 
    for verb_name in verbs_in_def
      @logger 'Generate found a verb `%s`', verb_name
      verb_opts = _.defaults verb_set: verb_set, verb_options
      verb_class = @verb_lookup_class.get_type verb_name
      generated = verb_class.generate yaml_def, verb_opts

      if generated instanceof Array
        verb_set.add_instances generated, render: false
      else unless generated
        @logger 'Discarding a falsey value for [%s]', verb_name
      else
        verb_set.add_instance generated, render: false

      @logger 'Generate %s `verbs` now contains %s items', @id, verb_set.length

    verb_set


  # new RuleVerbSet
  # Not meant to be called directly, you should be extending the 
  # class with your own verbs and verb type
  constructor: ( options = {} )->
    super()
    @verb_instances = []
    @verb_type  = options.verb_type or @constructor.verb_type

    # Attach the parent rule
    @rule       = options.rule or throw new Error 'No rule'

    # Due to the two template setup we are not relying on 
    # `Renderers` template setup, disable it
    @template_none = true

    # What RuleVerbBase class we are a set of?
    @verb_class = options.verb_class or
                  @constructor.verb_class or
                  throw new Error 'verb_class'

    # What RuleVerbTypes class should be use to lookup
    @verb_lookup_class  = options.verb_lookup_class or
                          @constructor.verb_lookup_class or
                          throw new Error 'verb_class'

    @rendered_init options
    @logger "new #{@constructor.name} building the rule verb container", options

        # Check we have been passed verbs
    if options.verbs
      @add_instances options.verbs, render: false

  # Run a function for every verb instance
  # Passes in the `verb` object, `index`, and `this`
  each_instance: ( fn )->
    for verb_instance, i in @verb_instances
      fn verb_instance, i, @

  # Add a new VerbType instance
  add_instance: ( new_verb, options )->
    @constructor.expect_class_type new_verb
    @verb_instances.push new_verb
    new_verb.verb_set = @
    $instance_container = $('<div/>')
    @.$container.append $instance_container
    new_verb.set_container $instance_container
    unless options and options.render is false
      new_verb.render()
    new_verb

  # Adds an array of VerbType instances
  add_instances: ( new_verbs, options )->
    for verb in new_verbs
      @add_instance verb, options

  # Return a single verb instance
  get_instance: ( lookup )->
    @logger 'get_instance lookup', lookup, _.isString(lookup), _.isNumber(lookup), _.isObject(lookup)
    res = if _.isString(lookup)
      _.find @verb_instances, euid: lookup
    else if _.isNumber(lookup)
      @verb_instances[lookup]
    else if _.isObject(lookup)
      _.find @verb_instances, lookup
    else false
    @logger 'get_instance lookup', lookup, !!@verb_instances[lookup]
    res

  # Return the array
  get_instances: ()->
    @verb_instances

  # Return the index of an Verb object in the set
  get_index: ( lookup )->
    query = if _.isString(lookup) then euid: lookup else lookup
    _.findIndex @verb_instances, query

  # Removing from array, check the ref is the same
  # could use auid too?
  remove_instance: ( lookup )->
    verb_instance = @get_instance lookup
    return false unless verb_instance
    verb_removes = _.remove @verb_instances, verb_instance
    debug "removed %s %s verb instances",
      verb_removes.length, @verb_type, verb_removes
    if verb_removes.length > 1
      throw new Error "Removed more than one verb instance #{verb_removes.length}"
    verb_removes[0].remove()
    verb_removes

  # Generates a new blank verb for this set and adds it to the instance
  generate_verb: ( verb = '_initial', options = {} )->
    options.render = true unless options.render?
    verbi = @add_instance @create_verb(verb), options
    @logger 'create_new blank verb instance', verb, @verb_type
    verbi.enable_editing()
    verbi

  # Creates a new verb ready for this instance
  create_verb: ( verb = '_initial', options = {} )->
    type = @verb_lookup_class.get_type(verb)
    verb_opts =
      yaml: {}
      rule: @rule
      verb_set: @
    verbi = new type _.defaults verb_opts, options

  # Replace an existing Verb in the set with a new Verb
  # can pass in a verb types string to generate or an already
  # built RuleVerbBase
  replace_verb: ( verb_to_replace, new_verb )->
    old_verb = @get_instance verb_to_replace
    throw new Error "No existing verb could be found" unless old_verb
    if _.isString new_verb
      @logger 'generating new Verb for [%s]', new_verb
      new_verb = @create_verb(new_verb)
    @constructor.expect_class_type(new_verb)
    @constructor.expect_class_type(verb_to_replace)
    
    verb_index = @get_index verb_to_replace
    old_verb.replace new_verb
    @verb_instances[verb_index] = new_verb
    new_verb.render()
    new_verb


  # Find the closest(parent) verb object via jquery `data()`.
  # Relies on the class `@verb_class` property being set.
  closest_verb: ( $element = @.$container)->
    @verb_class.closest $element

  # Find the class for a verb string.
  # Relies on the class `@verb_lookup_class` property being set.
  verb_class_from_string: ( verb_string )->
    @verb_lookup_class.lookup_type verb_string

  # --------------------------------------------------------------------
  # #### View management

  # # Render all the verb elements
  # render_custom_html: ( options = {} ) ->
  #   @logger 'render() verb_instances', @verb_instances
  #   html = for verb_instance in @verb_instances
  #     @logger 'render() verb_instance', verb_instance
  #     verb_instance.render( options ).html()
  #   html.join('')

  # Render all the verb elements
  render_custom: ( options = {} ) ->
    @logger 'render() verb_instances', @verb_instances
    html = for verb_instance in @verb_instances
      @logger 'render() verb_instance', verb_instance
      verb_instance.render( options )
    @.$container.append html


  # Render the tags whereever they go
  render_tag_html: ()->
    for verb_instance in @verb_instances
      @logger 'tag_render() verb_instance', verb_instance
      verb_instance.render_tag_html()

  
  initial_handlers: ( options )->
    self = @
    super options

    # Delete a verb
    css_selector = [
      '.action-delete-button'
      '.select-delete-button'
      '.verb-delete-button'
    ]
    @.$container.on 'click.verb-delete', "#{css_selector}", (ev)->
      verb = self.verb_class.closest $(this)
      self.remove_instance verb

    # Add a new verb is in Rule, due to the link being rendered there

    # Change an existing verb
    # SELECT AND ACTION specific handlers are in their own class
    css_selector = [
      '.verb-operator input'
      '.action-operator input'
      '.select-operator input'
    ]
    @.$container.on 'input.verb-change', "#{css_selector}", (ev)->
      verb = self.verb_class.closest $(this)
      new_verb_name = $(this).val()
      self.logger 'Verb change current[%s] new[%s]',
        verb.verb, new_verb_name
      if verb.verb is new_verb_name
        self.logger 'Verb already set current[%s] new[%s]',
          verb.verb, new_verb_name
        return true
      unless self.verb_class_from_string(new_verb_name)
        err = new ValidationError 'Unknown verb [#{new_verb_name}]',
          $element: $(this)
        return console.log err
      new_verb = self.replace_verb verb, new_verb_name
      new_verb.enable_editing()


  # Get all the dom properties in the objects and render it
  # Could become obsolete with proper `on 'change'` data handing
  dom_to_properties: ( custom_fn = undefined )->
    for verb_instance in @verb_instances
      verb_instance.dom_to_properties()
    @to_yaml_obj()

  # Get all the dom properties in the objects and render it
  # Could become obsolete with proper `on 'change'` data handing
  dom_to_yaml_obj: ( custom_fn = undefined )->
    for verb_instance in @verb_instances
      verb_instance.dom_to_properties()
    @to_yaml_obj()

  # Dump the yaml object for all the verb instances and
  # munge them together
  to_yaml_obj: ( custom_fn = undefined )->
    o = {}
    for verb_instance in @verb_instances
      @logger 'to_yaml() verb_instance', verb_instance
      _.merge o, verb_instance.to_yaml_obj(), custom_fn
    o

  # What are we doing?
  is_edit_mode: ()-> @edit_mode

  # Enable editing
  enable_editing: ( animate = @animate )->
    for verb_instance in @verb_instances
      verb_instance.enable_editing()
    @edit_mode = true

  # Disable editing
  disable_editing: ( animate = @animate ) ->
    for verb_instance, i in @verb_instances
      verb_instance.disable_editing()
    @remove_initials()
    @edit_mode = false

  # Toggle the current verbs edit state
  toggle_editing: ( animate = @animate ) ->
    if is_edit_mode() then disable_editing() else enable_editing()

  # Remove any `_initial` verbs
  remove_initials: ()->
    _.remove @verb_instances, verb: '_initial'

  # Validate all the whole set, and report on it all
  validate: ( options = {} )->
    error_set = options.errors or new DomErrorSet

    for verb_instance in @verb_instances
      verb_instance.validate( errors: error_set )
    
    error_set

  # Run a mock test against an event.
  # This is duplicating the server side event rules.
  # Maybe make this into a service.
  test_event: ( event )->
    @logger 'RuleVerbBase test_event ran'
    true

  # These are really test helpers, app lookups should all go via the
  # `data` object `$container.find()` or one of the `closest` functions
  gen_euid_selector: ( euid, name )->
    "##{euid} .#{@verb_type}-#{name} > input"
  
  # These are really test helpers
  # Again, don't use these
  find_input_el: ( euid, name )->
    selector = @gen_euid_selector(euid, name)
    $res = @.$container.find( selector )
    unless $res.length is 1
      throw new Error "Input not found [#{selector}]"
    $res
