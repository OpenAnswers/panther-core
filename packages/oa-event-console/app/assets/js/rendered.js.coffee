
class Rendered extends Module

  @logger = debug 'oa:event:rendered'

  @template_id = '#template-rendered'
  
  # `@template_id`
  # The css id of the template to use for this render

  # `@dom_selector`
  # `The selector to find the parent rendered element for this class

  # `@dom_class`
  # The css class to apply to the rendered parent element

  # `@dom_name`
  # The name use to refernce this class. `data` will be stored under this

  # Initial template setup, call it on instantiation when you set
  # a @template_id... `@template_setup()`
  # Sets properties on the class that `constructor` looks up
  @template_setup: ->
    @template_html = $(@template_id).html()
    unless @template_html and @template_html.length > 0
      err = new Error "Input template was not found [#{@template_id}]"
      console.error err
      return err
    Mustache.parse @template_html
  #@template_setup()


  # `closest( $jQueryElement )`
  # Lookup the jquery `data` object named `@dom_data_id` that is attached to the
  # `@dom_selector` element, from any child element. Throws and logs an error on failure
  @closest: ( $that ) ->
    unless @dom_selector
      unless @dom_class
        @dom_class = @dom_name
      @dom_selector = '.' + @dom_class

    unless $that
      err = new Error "No DOM element to start search from [#{$that}]"
      console.error err, $that, $el
      throw err

    $el = $that.closest( @dom_selector )

    unless $el
      err = new Error "Couldn't get a closest element from [#{@dom_selector}]"
      console.error err, $that, $el
      throw err
    
    unless $el.length is 1
      err = new Error "Couldn't find any close elements named [#{@dom_selector}]"
      console.error err, $that, $el
      throw err
    
    required_object = $el.data @dom_data_id
    unless required_object
      err = new Error "Couldn't find [#{@dom_data_id}] in data for [#{@dom_selector}]. Had [#{_.keys($el.data())}]"
      console.error err, $.data($el), $el.data(), $el
      throw err

    required_object


  # `check `closest_check( $jQueryElement )`
  # Lookup the `@dom_data_id` object on `@dom_selector` from any child element
  # Returns false on failure.
  @closest_check: ( $that ) ->
    $el = $that.closest( @dom_selector )
    unless $el.length is 1
      return false
    object = $el.data Rule.dom_data_id
    unless object
      return false
    object


  # Setup all the default Rendered options
  # Super this in your `constructor`
  # Most will default from the same properties in your class definition
  constructor: () ->

  rendered_init: ( options = {} )->
    # `@logger` debug log instance for this class
    @logger ?= options.logger or @constructor.logger

    # `@dom_name`
    # We need a name, for htmly element naming
    @dom_name ?= options.dom_name or @constructor.dom_name
    unless @dom_name
      throw new Error "A `dom_name` option is required for a rendered element"

    # `@dom_data_id`
    # We need an id to attach this object to jquery `data()`.
    # This defaults to `@dom_name` if not configured in the class.
    @dom_data_id ?= options.dom_data_id or @constructor.dom_data_id or @dom_name

    # `@dom_class`
    # We need a class name for the dom, defaults to `@dom_name`
    # Also create a selector with a class `.` prefix. Doesn't to `#ids`.
    @dom_class ?= options.dom_class or @constructor.dom_class or @dom_name
    @dom_selector ?= options.dom_selector or ".#{@dom_class}"

    # `@euid`
    # Create a element unique id (euid) for use as a dom id (base62)
    @euid_prefix ?= options.euid_prefix or @constructor.euid_prefix or ''
    @euid_suffix ?= options.euid_suffix or @constructor.euid_suffix or ''
    @euid_length ?= options.euid_length or @constructor.euid_length or 8
    @euid        ?= @euid_prefix + Helpers.random_string @euid_length + @euid_suffix
 
    # #### Templates
    # `@template_none` - boolean option not render a template to the $container
    @template_none ?= options.template_none or
                      @constructor.template_none or
                      false
    
    # `@template_id` - `#id` of the mustache template element
    @template_id ?= options.template_id or
                    @constructor.template_id
    
    # `@template_html` - html store of the mustache template element
    @template_html ?= options.template_html or
                      @constructor.template_html or
                      $(@template_id).html()

    # #### HTML Container
    # Provide a default element type to build from
    @logger 'container el', @container_el, options.container_el, @constructor.container_el
    @container_el ?= options.container_el or @constructor.container_el or 'div'

    # `$container` - Store a jquery reference to the container element
    #                defaults to creating an internal element.
    @.$container ?= options.$container or $("<#{@container_el}/>")
    
    # Setup the container and add the initial handlers
    @set_container_data()
    @initial_handlers()

    # `@on_render` callback after render
    @on_render ?= options.on_render or @constructor.on_render

    # `@on_dataupdate` callback after data changes
    @on_dataupdate ?= options.on_dataupdate or @constructor.on_dataupdate

    # Optionally `render()` on creation
    if options.render
      @render()


  # The the container for this object to something new
  set_container: ( $ele, options = {} )->
    { remove, replace, render } = options
    @logger 'set_container Setting container to new element', $ele, options
    if remove
      @logger 'set_container removing current element', @.$container
      @.$container.remove()
    if replace
      @logger 'set_container replacing current element', @.$container
      @.$container.replaceWith $ele
    @.$container = $ele
    @set_container_data()
    if render
      @render()
    @initial_handlers()
    @

  # Set the data for the container
  set_container_data: ()->
    @logger 'setting container dom info c[%s] d[%s] u[%s]',
      @dom_class, @dom_data_id, @euid, @.$container
    @.$container.addClass @dom_class
    @.$container.attr 'id', @euid
    #$.data @.$container, @dom_data_id, @
    @.$container.data @dom_data_id, @
    @

  # Render the html data with the object
  render_html: ( custom_data )->
    unless @template_html and @template_html.length > 0
      console.error "No template html to render - template_html"
    
    variables =
      data: @

    if custom_data
      variables.custom_data = custom_data

    Mustache.render @template_html, variables

  # Render the data to the jquery $container
  # Many places will override this. It's not in a useful format
  # to use `super` due to the the `.html('')`. 
  #
  # The `render_custom()` function will be called if defined
  #
  render: ( options = {} )->
    html_string = ''
    
    # We might not have a mustache template
    unless @template_none
      html_string += @render_html()

    # Classes can insert custom html strings
    # This is a bit quicker than appending all the time
    if _.isFunction(@render_custom_html)
      html_string += @render_custom_html(options)

    @.$container.html(html_string)

    # Classes can insert custom data, most do
    if _.isFunction(@render_custom)
      @render_custom(options)
    
    @handlers()
    
    @.$container


  # Handlers setup event watchers that live on rendered elements
  # Don't put too much in here as it will run on every render()
  handlers: ()-> true

  # Initial handlers setup event watcher that listen to anything.
  # Generally you can't attach to rendered elements as they come and go
  # But you can listen for bubbled events on the $container, which may
  # be more performant anyway as there's no setup/teardown on every render.
  # These will be setup on any `set_container()`
  initial_handlers: ()-> true

  # Find something in our container. Optionally throw an error
  container_find: ( selector, options )->
    $el = @.$container.find selector
    unless $el.length > 0
      err = new Error "No element found [#{selector}] in #{@dom_class} - #{@euid}"
      if options and options.error
        console.error err, selector, @.$container, $el
      if options and options.throw
        throw err
    $el

  # Find something in our container or false
  container_check: ( selector )->
    $els = @.$container.find selector
    if $els.length > 0 then $els else false

  container_find_throw: ( selector )->
    @container_find selector, throw: true



class RenderedSave extends Rendered

  constructor: ( options = {} )->
    super()
    @rendered_init options
    self.save_Async = options.save_Async
    self.validate_fn = options.validate_fn

  # Validate all properties, include childrens properties (i.e. those that 
  # also implement the `validate()` function.
  validate: ( options = {} )->
    errors = options.errors or new DomErrorSet
    validate_local errors: errors
    # provide simple validate_fn
    # `'input'` runs `()-> whatever`
    # provide selector > validate_fn or regex mapping
    # `{ '.fields': ()-> whatever }`
    # provide some default types. 
    # character sets, whitespace, null, blah blah blah

  # Only validate the local properties, rather than traversing
  # a whole tree for nested objects
  validate_local: ( options = {} )->
    errors = options.errors or new DomErrorSet


  # Save the data back to wherever it came from
  save: ()->
    errors = self.validate()
    unless errors.ok()
      return Message.label "Validation: "+errors.to_string(), errors

    self.save_Async().then ( res )->
      @save_cancel = false
      self.render()

    .catch ( error )->
      console.error 'There was a problem saving your data', error
      Message.exception 'There was a problem saving your data', error

  save_Async: ()->
    new Promise ( resolve, reject )->
      reject new Error "Override with you custom save logic"
