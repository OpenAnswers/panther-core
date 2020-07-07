# # RuleVerbBase

# An interface for all the rule verbs to implement

class RuleVerbBase extends Rendered
  #@include classProperties
  #@extend instanceProperties

  # Add a logger, other classes should override
  @logger: debug 'oa:event:rules:rule_verb_base'

  # The verb. `skip`, `match`, `discard`
  @verb ?=       '_basse_'
  
  # The type for the verb. `action`, `option`, `select`
  @verb_type =   '_basetype_'

  # Class for the container the edit/view live in
  @dom_class    = 'verb-entry'
  @dom_name     = 'verb'
  @dom_data_id  = @dom_name
  @dom_selector = '.'+@dom_class

  # All verbs need a plain html mustache template to lookup
  # `-view` and `-edit` will be appended to the id.
  @template_id ?= '#template-_base_'
  
  # Due to the two template setup we are not relying on 
  # `Renderers` template setup, disable it
  @template_none = true

  # Generate all the standard mustache templates.
  # You class will need to call `@generate_templates()` at load.
  # If you need to add more templates in a specific class
  # override `@generate_templates` and `super` this copy of
  # the function.
  # The view and edit templates are build from `@template_id` unless
  # you manually set them in a class
  @generate_templates: ()->
    @template_view_id ?= "#{@template_id}-view"
    @template_edit_id ?= "#{@template_id}-edit"
    @logger 'generate() template from ids', @template_view_id, @template_edit_id
    @template_view = @generate_template @template_view_id
    @template_edit = @generate_template @template_edit_id

  # Generate a single mustache template for `generate_templates()`
  @generate_template: ( element_id )->
    html = $(element_id).html()
    unless html and html.length > 0
      console.error "#{@name} No template found for '#{element_id}'"
    Mustache.parse html
    html

  # Generate a class instance from yaml def
  # You extended verb types should now how to do this
  @generate: ( yaml_def, options = {} )->
    throw new Error "implement generate"

  # --------------------------------------------------------------
  # `new RuleVerbBase { rule: Rule }`
  #
  # #### Properties
  constructor: ( options = {} )->
    super()
    @logger ?= @constructor.logger
    @logger 'new %s rule verb has options', @constructor.name, options
    
    # - `@verb` verb string for this object
    # - `@verb_type` the class of this verb
    @verb ?= options.verb_type or @constructor.verb
    @verb_type ?= options.verb_type or @constructor.verb_type

    # - `@template_view` the html of the raw view template
    @template_view_selector = ".#{@verb_type}-entry-view"
    @template_view = options.template_view or @constructor.template_view

    # - `@template_edit` the html of the raw edit template
    @template_edit_selector = ".#{@verb_type}-entry-edit"    
    @template_edit = options.template_edit or @constructor.template_edit
    
    # - `@template_tag` the html of the verbs tag (or gem)
    @template_tag = options.template_tag or @constructor.template_tag

    # - `@template_none` due to Rules two template setup we are not 
    # relying on `Renderers` single template setup, disable it
    @template_none = true

    # - `@label` for this verb (Ucase, spaces etc)
    @label  = options.label or
              @constructor.label or
              @verb

    # - `@verb_english` The english written verb for use in sentences
    @verb_english = options.verb_english or
                    @constructor.verb_english or
                    @verb

    # - `@help` snippit for users
    @help = options.help or
            @constructor.help or
            @verb

    # - `@animate` should we animate transitions
    @animate = !!options.animate or false
    
    # - `@typeaheads` Should we enable typeheads (mainly for testing)
    @typeaheads = if options.typeaheads? then !!options.typeaheads else true
    
    # - `@rule` the parent RuleVerbBase object of this action
    @rule = options.rule or throw new Error "#{@constructor.name} requires a rule"

    # - `@verb_set` is the parent verb set housing the verb
    @verb_set = options.verb_set

    @rendered_init options

  # ------------------------------------------------------------------
  # #### Edit mode

  # What are we? 
  is_edit_mode: ()-> @edit_mode

  # Enable editing
  enable_editing: ( animate = @animate )->
    if animate
      $(@.$template_view_el).fadeOut 'fast', ->
        $(@.$template_edit_el).fadeIn 'fast'
    else
      @.$template_view_el?.addClass 'collapse'
      @.$template_edit_el?.removeClass 'collapse'
    #if @typeaheads
      #Typeaheads.setTypeaheads(@verb_type)
    @edit_mode = true

  # Disable editing
  disable_editing: ( animate = @animate ) ->
    if animate
      $(@.$template_edit_el).fadeOut 'fast', ->
        $(@.$template_view_el).fadeIn 'fast'
    else
      @.$template_edit_el?.addClass 'collapse'
      @.$template_view_el?.removeClass 'collapse'
    @edit_mode = false

  # Toggle the current verbs edit state
  toggle_editing: (  animate = @animate ) ->
    if is_edit_mode() then disable_editing() else enable_editing()
    

  # Remove the tracked elements. 
  # Would need render after this to work again
  remove_elements: ()->
    @.$template_view_el?.remove()
    @.$template_edit_el?.remove()
    @.$template_tags?.remove()

  # Remove downwards. Delete the instance from Types
  # and remove the dom elements.
  # Do we need a remove the other way?? Types up?
  remove: ()->
    #@rule[@verb_type].remove_instance @
    @remove_elements()
    @.$container?.remove()

  # Replace this verb object with a new object
  # See `.replace()` in `RuleVerbSet`
  replace: ( new_verb )->
    @.$container.replaceWith new_verb.$container
    new_verb.set_container_data()

  # # Set a new jquery container for the verb
  # set_container: ( $container )->
  #   if @.$container
  #     @logger 'removing current container', @.$container
  #     @.$container.remove()
  #   @.$container = $container
  #   @set_container_data()
  #   @render()

  # # Apply this verbs data set to the jquery container
  # set_container_data: ->
  #   @.$container.addClass "#{@verb_type}-entry"
  #   $.data @.$container, 'verb', @
  #   $.attr @.$container, 'id', @uvid

  # selector for you dom input fields
  get_dom_input_class: ( label )->
    "input-verb-#{@verb_type}-#{@verb}-#{label}"

  # selector for you dom input fields
  get_dom_input_selector: ( label )->
    "input.#{@get_dom_input_class(label)}"

  # Get an input field from the dom
  get_dom_input: ( label )->
    sel = @get_dom_input_selector( label )
    $input_el = @$template_edit_el.find( sel )
    unless $input_el and $input_el.length is 1
      throw new Error "No input element for #{sel}"
    input = $input_el.val()
    @logger "Got input #{sel} from dom [%s]", input
    input

  # Get many input fields from the dom
  get_dom_inputs: ( label )->
    sel = @get_dom_input_selector( label )
    $input_el = @$template_edit_el.find( sel )
    unless $input_el and $input_el.length > 0
      throw new Error "No input element for #{sel}"
    input = if $input_el.length is 1
      $input_el.val()
    else 
      for input in $input_el
        $(input).val()

    @logger "Got input #{sel} from dom [%s]", input
    input


  render_html_view: ()->
    @logger "render_html_view", @
    Mustache.render @template_view, data: @

  render_html_edit: ()->
    @logger "render_html_edit", @
    Mustache.render @template_edit, data: @

  # The main `render` function has been overridden here. This is due to the
  # multi template setup for edit/view from the original rule UI. This doesn't
  # gel with the `Rendered` template setup.
  render: ( options = {} )->
    if options.data
      data = data: options.data
      @logger 'Rendering the view and edit templates with options data', data
    else
      data = data: @
      @logger 'Rendering the view and edit templates with `this`'

    @.$container.html( @render_html_view() + @render_html_edit() )

    @.$template_view_el = @container_find_throw @template_view_selector
    #@.$template_view_el.data 'verb', @

    @.$template_edit_el = @container_find_throw @template_edit_selector
    #@.$template_edit_el.data 'verb', @

    @enable_editing() if @is_edit_mode()

    @set_container_data()
    @handlers()

    @.$container

  
  handlers: ( options = {} )->
    @handle_input_change()

  # Handle an input change
  handle_input_change: ->
    self = @
    @.$container.on 'input', 'input', ( ev )->
      self.dom_to_properties()


  # Add the tag template to the screen. I'm not sure about this.
  # Could just to it with jquery as it's not a template
  render_tag_html: ()->
    return if @verb is '_initial'
    el = $("#template-tag-#{@verb}")
    unless el.length is 1
      throw new Error "Couldn't find tag el for #template-tag-#{@verb}"
    @logger 'tag render el', el
    el.html()

  # Get the dom properies into this instance
  # Input should maybe happen automatically, on `change` or somesuch
  dom_to_properties: ()->
    throw new Error "Override dom_to_properties for each type"

  # Retrive the dom values and produce the yaml
  dom_to_yaml_obj: ()->
    @dom_to_properties()
    @to_yaml_obj()

  # Return the yaml def from the dom fields
  to_yaml_obj: ()->
    throw new Error "implement to_yaml_obj"

  # Default to returning an ok or existing error set
  validate: ( options ) ->
    errors = options.errors or new DomErrorSet