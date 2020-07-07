

# Some methods cross over class tree boundaries
# So if class tree runs vertically, sometimes you want to apply
# a method to a horizontal selection of classes. For this we have
# Mixins (from Ruby). Apply a function to many classes without
# inheriting something. Requires `Module` which provices `@include` for 
# class instance properties and `@extend` for class properties

class MixinMustacheSelect

  # Takes a key/value object and turns it into a Mustache renderable array
  # This includes generating a select/option array for each element
  # Require `this.options_list` to function

  object_to_array: ( values_object )->
    index = -1
    arr = for name,val of values_object
      index++
      # Build an options list for this name/value, setting selected if needed
      options_list = for select_option in @options_list
        new_option = _.defaults {}, select_option
        new_option.selected = true if new_option.value is val
        new_option.label = value unless new_option.label
        new_option

      # Now we have a mustache renderable blob, add it to the array
      { name: name, options_list: options_list, index: index }
    @max_index = index
    arr



class GenericGroup extends Module

  @logger = debug 'oa:event:rules:generic_group'

  @class = 'generic-group-entry'
  @template_id = '#template-generic-group'
  @template_grouped_id = '#generic-grouping-replace-me'

  @template_setup: ->
    @template_html = $("#{@template_id}").html()
    unless @template_html and @template_html.length > 0
      err = new Error "Input template was not found [#{@template_id}]"
      console.error err
      return err
    Mustache.parse @template_html
  @template_setup()

  constructor: ( options = {} )->
    super()
    @logger = options.logger or @constructor.logger
    @name = options.name or '_noname'
    @label = options.label or @name
    @label_detail = options.label_detail or undefined
    @class = options.class or @constructor.class
    @euid = 'gg' + Helpers.random_string 6

    # Collapse grouping
    @collapsable = options.collapsable

    # Function to add new entries
    @addable = options.addable or false

    # Help text
    @help = options.help or false

    @grouped = options.grouped or throw new Error "Groups don't work without something to group"

    @$container = options.$container or $('<div/>')
    @template_id = options.template_id or @constructor.template_id
    @template_html = options.template_html or @constructor.template_html
    @template_grouped_id = options.template_grouped_id or @constructor.template_grouped_id

    @set_container_data()

  set_container: ( $ele, options )->
    @logger 'set_container Setting container to new element', $ele
    @.$container = $ele
    @set_container_data()
    @render()
    #@initial_handlers()
    @

  # Set the data for the container
  set_container_data: ()->
    @.$container.addClass @class
    @.$container.addClass 'generic-input-handler'
    @.$container.data 'group', @
    @.$container.data 'handler', @
    @.$container.attr 'id', @euid
    @

  render_html: ( options )->
    unless @template_html and @template_html.length > 0
      console.error "No template html to render - template_html"
    Mustache.render @template_html, data: @

  render: ( options )->
    @$container.html @render_html()
    $group_inner = @$container.find(@template_grouped_id)
    unless $group_inner and $group_inner.length is 1
      return console.error "No $group_inner to append", @template_grouped_id, $group_inner
    @grouped.set_container $group_inner
    @grouped.render()
    @handlers()
    @.$container

  handlers: ()-> true

  # Difficult
  #groupify: ( gen )->
    #@render()
    #gen.set_container @.$container.find('')
    #gen.render() 
    #@


# ## GenericInput

# Base class for other to customise
# Input Fields, groups, bootstrappy
class GenericInput extends Module

  @logger = debug 'oa:event:rules:generic_input'
  
  @template_setup: ->
    @template_edit_html = $("#{@template_id}-edit").html()
    unless @template_edit_html and @template_edit_html.length > 0
      return console.error new Error "Input template was not found [#{@template_id}-edit]"
    Mustache.parse @template_edit_html

  constructor: ( options = {} )->
    super()
    @logger = options.logger or @constructor.logger
    @logger "new GenericInput-#{@constructor.name} generating input with ", options

    @name = options.name or '_noname'
    @label = options.label or undefined
    @class = options.class or @constructor.class
    
    @euid = 'gi' + Helpers.random_string 6
    
    @$container = options.$container or $('<div/>')
    @template_id = options.template_id or @constructor.template_id
    @template_edit_html = options.template_edit_html or @constructor.template_edit_html

    # Allow for custom save/cancel interfaces
    @save_cancel_selector = options.save_cancel_selector or ".generic-value-save-interface"

    # Selector to apply the new handler to, look in `$(document)`
    @new_handler = options.new_handler or false

    # Validation is done via external functions
    @validate_fn = options.validate_fn
    @validate_field_fn = options.validate_field_fn
    @validate_value_fn = options.validate_value_fn

    # Saving is done via external function
    #@save_fn = options.save_fn
    #throw new Error if @save_fn and !_.isFunction @save_fn
    @save_Async = options.save_Async
    throw new Error unless @save_Async or !_.isFunction @save_Async

    @refresh_Async = options.refresh_Async
    throw new Error unless @save_Async or !_.isFunction @save_Async

    # Size/layout options. Bootstrap `col` values mostly
    @size_value = options.size_value or 5
    @size_field = options.size_field or 5
    @size_delete = options.size_delete or 1
    @size_join = options.size_join or 1
    @join_text = options.join_text or false
    #heading.field heading.value will be used as the headings
    @heading = options.heading or false

  set_container: ( $ele, options )->
    @logger 'set_container Setting container to new element', $ele
    @.$container = $ele
    @set_container_data()
    @render()
    @initial_handlers()
    @

  # Set the data for the container
  set_container_data: ()->
    @.$container.addClass @class
    @.$container.data 'input', @
    @.$container.attr 'id', @euid
    @

  render: ( options = {} )->
    @.$container.html('')
    @.$container.append $(Mustache.render @template_edit_html, data: @)
    @handlers()
    @.$container

  handlers: ()->
    self = @

    $new = @container_find '.generic-newentry'
    $new.on 'click', ( ev )->
      self.logger 'adding new entry event', ev
      self.add_new_entry()
      novalue = self.container_find '.generic-novalue'
      novalue.remove()
      $('html,body').animate scrollTop: self.$container.offset().top

    $cancel = @container_find '.button-cancel'
    @logger 'Adding cancel event on [%s] $inputs', $cancel.length
    $cancel.on 'click', ( ev )->
      self.save_cancel = false
      self.logger 'cancel click', ev
      self.render()

    $save = @container_find '.button-save'
    @logger 'Adding save event on [%s] $inputs', $cancel.length
    $save.on 'click', ( ev )->
      self.logger 'save click', ev
      self.save(ev)

    inputs = @value_selector
    inputs += ', '+@field_selector if @field_selector
    $inputs = @container_find inputs
    @logger 'Adding change event on [%s] $inputs', $inputs.length, inputs, $inputs
    $inputs.on 'input', ( ev )->
      self.logger 'on change fired'
      self.validate_one(this)
      self.show_save_cancel( this )

    @save_cancel = false


  initial_handlers: ()->
    self = @

    if @new_handler
      $(@new_handler).on 'click', (ev)->
        self.logger 'adding new entry event', ev
        self.add_new_entry()
        novalue = self.container_find '.generic-novalue'
        novalue.remove()
        $('html,body').animate scrollTop: self.$container.offset().top



  # Save the data back to wherever it came from
  save: ( that )->
    @logger 'Save triggered by', that
    self = @
    errors = @validate()
    unless errors.ok()
      return Message.error "Validation" + errors.to_string()
    @container_find('.button-save').prop('disabled', true)
    @save_Async( @dom_to_yaml_obj() )
    .timeout(15000)
    .then ( res )->
      self.logger 'Inputs saved. got res: ', res
      Message.label 'Updates saved', 'Your updates have been saved to the server, ready to be deployed'
      @save_cancel = false
      self.refresh_Async( res )
    .then ( res )->
      self.render()
    .catch Promise.TimeoutError, ( error )->
      console.error error
      Message.exception 'Your save timed out, try again', error
    .catch ( error )->
      console.error 'There was a problem saving your data', error
      Message.exception 'There was a problem saving your data', error
    .finally ->
      self.container_find('.button-save').prop('disabled', false)


  container_find: ( selector, single = false )->
    $ref = @$container.find selector
    if !$ref or $ref.length < 1
      console.error 'Selector returned no results [%s]', selector, @$container
      #throw new Error 'Selector returned no results - '+selector
    if single and $ref.length > 1
      console.error 'Selector returned [%s] results',
        $ref.length, selector, @$container
      #throw new Error 'Selector returned more than 1 result - '+selector
    $ref

  validate_one: ( el, errors )->
    @logger 'validating', el
    val = $(el).val()
    $fg = $(el).closest('.form-group')
    errors = new DomErrorSet
    
    if val is ''
      errors.add_new_error 'Field names must have a value'
    
    if val.match /\s/
      errors.add_new_error 'Field names can\'t contain white space'
    
    if @validate_fn
      result = @validate_fn(val)
      if result is false
        errors.add_new_error "Validation Failed"
      if _.isObject( result )
        unless result.ok
          errors.add_new_error result.message
    
    unless errors.ok()
      unless $fg.hasClass 'has-error'
        $fg.addClass 'has-error'
        return Message.label "Input error", errors.to_string()
    else
      @logger "remove error"
      $fg.removeClass 'has-error'

  validate: ( errors )->
    self = @
    errors ?= new DomErrorSet
    
    return errors if !@field_values or _.keys(@field_values).length > 0
    $values = @container_find @value_selector
    $fields = @container_find @field_selector
    
    $values.each (i,e)-> self.validate_one(e, errors)
    $fields.each (i,e)-> self.validate_one(e, errors)
    errors

  show_save_cancel: ( ev, generic_input )->
    unless @save_cancel
      @$container.find(@save_cancel_selector).removeClass "hidden"
    unless @save_Async
      @$container.find(@save_cancel_selector+' .btn-save').addClass "hidden"
    @save_cancel = true

  add_new: ()-> throw new Error "add_new must be overridden"

  set_value: ( @value )-> @value

  dom_to_properties: ()-> throw new Error "dom_to_properties must be overridden"

  dom_to_yaml_obj: ()->
    @dom_to_properties()
    @to_yaml_obj()

  to_yaml_obj: ()-> throw new Error "to_yaml_obj must be overridden"

  object_to_array: ( values_object )->
    index = -1
    for name,val of values_object
      index++
      { name: name, value: val, index: index }




# One value (field static)
class GenericInputLabelValue extends GenericInput

  @logger = debug 'oa:event:rules:generic_input_value'
  
  @template_id = '#template-generic-value'
  @template_setup()
  
  constructor: ( options = {} )->
    super options
    @field_selector = ''
    @value_selector = '.generic-value-value > input'
    @value = options.value

  dom_to_properties: ()->
    $el = @container_find('.generic-value-value > input')
    throw new Error "Couldn't locate form data" unless $el.length is 1
    @value = $el.val()

  to_yaml_obj: ()->
    o = {}
    o[@name] = @value
    o


# One value (field static)
class GenericInputLabelEnum extends GenericInput

  @logger = debug 'oa:event:rules:generic_input_enum'
  
  @template_id = '#template-generic-labelenum'
  @template_setup()
  
  constructor: ( options = {} )->
    super options
    @field_selector = ''
    @value_selector = '.generic-labelenum-value > input'
    @value = options.value
    @options_list = options.options_list

  dom_to_properties: ()->
    $el = $('.generic-labelenum-value > input')
    throw new Error "Couldn't locate form data" unless $el.length is 1
    @value = $el.val()

  set_value: ( @value )-> @value

  validate: ()->
    @validate_fn @value

  to_yaml_obj: ()->
    o = {}
    o[name] = @value
    o


# ## Class GenericInputValues

# Many values (field static)
class GenericInputLabelValues extends GenericInput

  @logger = debug 'oa:event:rules:generic_input_values'
  @template_id = '#template-generic-values'
  @template_setup()

  constructor: ( options = {} )->
    super options
    @field_selector = ''
    @value_selector = '.generic-values-value > input'
    @field_values = options.field_values
    @field_values_array = @object_to_array(@field_values)

  dom_to_properties: ()->
    for field, value of @field_values
      #$el = $(@value_selector+"[data-field[\"#{@field}\"]")
      selector = @value_selector+"[data-field=\"#{field}\"]"
      $el = @$container.find(selector)
      unless $el and $el.length > 0
        throw new Error "Couldn't locate form data - #{selector}"
      if $el.length > 1
        throw new Error "Found too many inputs [#{$el.length}]"
      @field_values[field] = $el.val()
    @

  set_field_values: (@field_values)->
    @field_values_array = @object_to_array(@field_values)
    @field_values

  to_yaml_obj: ()->
    o = {}
    o[@name] = _.cloneDeep( @field_values )
    o


# ## Class GenericInputEnums

# Many enums (field static)
class GenericInputLabelEnums extends GenericInput
  # Mixin from `Module`
  @include MixinMustacheSelect::

  @logger = debug 'oa:event:rules:generic_input_enums'
  @template_id = '#template-generic-labelenums'
  @template_setup()

  constructor: ( options = {} )->
    super options
    @field_selector = false
    @value_selector = '.generic-labelenums-value > select'
    @options_list = options.options_list
    throw new Error "InputEnums need an options_list array" unless _.isArray @options_list 
    @field_values = options.field_values
    @field_values_array = @object_to_array(@field_values)

  dom_to_properties: ()->
    for field, value of @field_values
      $el = $(@value_selector+"[data-field[\"@field\"]")
      throw new Error "Couldn't locate form data" unless $el and $el.length > 0
      throw new Error "Found too many inputs [#{$el.length}]" if $el.length > 1
      value = $(el).val()

  set_field_values: (@field_values)->
    @field_values_array = @object_to_array(@field_values)
    @field_values

  to_yaml_obj: ()->
    o = {}
    o[@name] = _.cloneDeep( @field_values )
    o


# ## Class GenericInputFieldValue

# One field and value
class GenericInputFieldValue extends GenericInput

  @logger = debug 'oa:event:rules:generic_input_field_value'
  @template_id = '#template-generic-fieldvalue'
  @template_setup()

  constructor: ( options = {} )->
    super options
    @field_selector = '.generic-fieldvalue-field > input'
    @value_selector = '.generic-fieldvalue-value > input'
    @field = options.field
    @value = options.value



# ## Class GenericInputFieldValuesBase

# For any time thats allow a list of field/value edits
# Can be of multiple types but the same concept
class GenericInputFieldValuesBase extends GenericInput

  set_field_values: (@field_values)->
    @field_values_array = @object_to_array(@field_values)
    @field_values

  to_yaml_obj: ()->
    o = {}
    o[@name] = _.cloneDeep( @field_values )
    o

  dom_to_properties: ()->
    $els = @container_find '.generic-fieldvalues-entry'
    o = {}
    for el in $els
      field = $(el).find( @field_selector ).val()
      value = $(el).find( @value_selector ).val()
      o[field] = value
    @set_field_values o

  handlers: ()->
    self = @
    $delete = @container_find '.generic-delete-button'
    $delete.on 'click', ( ev )->
      self.logger 'delete click', ev
      $(this).closest('tr').remove()
      self.show_save_cancel( this )
    super()

  add_new: ()-> true


# ## Class GenericInputFieldValues

# Many fields and values
class GenericInputFieldValues extends GenericInputFieldValuesBase

  @logger = debug 'oa:event:rules:generic_input_field_values'
  @template_id = '#template-generic-fieldvalues'
  @template_setup()

  constructor: ( options = {} )->
    super options
    @field_selector = '.generic-fieldvalues-field > input'
    @value_selector = '.generic-fieldvalues-value > input'
    @entry_selector = '.generic-fieldvalues-entry'

    # Seperate row template for adding a new field easily
    @entry_template_id = '#template-generic-fieldvaluesrow-edit'
    @entry_template_html = $(@entry_template_id).html()
    Mustache.parse @entry_template_html

    @set_field_values options.field_values

  add_new_entry: ()->
    blank_entry_obj = { name: '', value: '' , index: @max_index+1, data: @ }
    $html = $(Mustache.render @entry_template_html, blank_entry_obj)
    @logger 'add new entry html', $html, @entry_template_html
    @container_find('.generic-fieldvalues-entries').append $html
    @show_save_cancel()
    $html

# ## Class GenericInputFieldValues

# Many fields and values
# Supports munging multiple fields of the same name into 
# a `values` array.  field_transform needs this
class GenericInputFieldValuesArray extends GenericInputFieldValuesBase

  @logger = debug 'oa:event:rules:generic_input_values_array'

  dom_to_properties: ()->
    $els = @container_find @entry_selector
    o = {}
    for el in $els
      field = $(el).find( @field_selector ).val()
      value = $(el).find( @value_selector ).val()
      if o[field]?
        unless _.isArray( o[field] )
          o[field] = [ o[field] ]
        o[field].push value
      else
        o[field] = value
    @set_field_values o

  object_to_array: ( values_object )->
    index = -1
    arr = for name,val of values_object
      unless _.isArray val
        val = [ val ]
      for value in val
        index++
        { name: name, value: val, index: index }
    @max_index = index
    arr


# ## Class GenericInputFieldEnums

# Many enums (field static)
class GenericInputFieldEnums extends GenericInputFieldValuesBase
  # Mixin via `Module`
  @include MixinMustacheSelect::

  @logger = debug 'oa:event:rules:generic_input_enums'
  @template_id = '#template-generic-fieldenums'
  @template_setup()

  constructor: ( options = {} )->
    super options
    @field_selector = '.generic-fieldenums-field > input'
    @value_selector = '.generic-fieldenums-value > select'
    @options_list = options.options_list
    throw new Error "InputEnums need an options_list array" unless _.isArray @options_list 
    @set_field_values options.field_values

  add_new_field: ()-> true


# ## Class GenericInputFieldEnums

# Many enums (field static)
class GenericInputFieldEnumsArray extends GenericInputFieldValuesArray

  @logger = debug 'oa:event:rules:generic_input_enums_array'
  @template_id = '#template-generic-fieldenums'
  @template_setup()

  constructor: ( options = {} )->
    super options
    @field_selector = '.generic-fieldenums-field > input'
    @value_selector = '.generic-fieldenums-value > select'
    @entry_selector = '.generic-fieldenums-entry'
    
    # Seperate row template for adding a new field easily
    @entry_template_id = '#template-generic-fieldenumsrow-edit'
    @entry_template_html = $(@entry_template_id).html()
    Mustache.parse @entry_template_html

    @options_list = options.options_list
    throw new Error "InputEnumsArray need an options_list array" unless _.isArray @options_list 
    @set_field_values options.field_values


  # Takes a key/value object and turns it into a Mustache renderable array
  # This includes generating the select/option array for each element
  # It also supports the array munging of multiple values
  # 
  #    afield: 'whatever'
  #    bfield: [ 'whatever' ]
  #    cfield: [ 'whatever', 'otherever' ]
  #
  # into
  #
  #    {
  #      name: afield,
  #      options_list: [
  #        { value: 'whatever', selected: true, label: "Whatever" },
  #        { value: 'otherever', label: "Otherever" }
  #      ],
  #      index: 0
  #    }
  # 
  object_to_array: ( values_object )->
    index = -1
    arr = []
    for name,val of values_object
      unless _.isArray(val)
        val = [ val ]
      for value in val
        index++        
        # Build an options list for this name/value, setting selected if needed
        options_list = @generate_select_option_array(value)
        # Now we have a mustache renderable blob, add it to the array
        arr.push { name: name, options_list: options_list, index: index }
    @max_index = index
    arr


  generate_select_option_array: ( value, check_selected = true )->
    # Build an options list for this name/value, setting selected if needed
    option_selected = false

    # Now loop over the options list and create a `{ value: 'a', label: 'A', selected: true }` list 
    list = for select_option in @options_list
      new_option = _.defaults {}, select_option
      if new_option.value is value
        new_option.selected = true
        option_selected = true
      new_option.label = value unless new_option.label
      new_option

    if check_selected and !option_selected
      Message.exception "Invalid select value", "The Field [#{name}] has a value that is not available [#{value}]. Saving the rule will reset the value to one of the allowed values"

    list


  add_new_entry: ()->
    options_list = @generate_select_option_array( '', false )
    blank_entry_obj = { name: '', options_list: options_list , index: @max_index+1, data: @ }
    $html = $(Mustache.render @entry_template_html, blank_entry_obj)
    @logger 'add new entry html', $html, @entry_template_html
    @container_find('.generic-fieldenum-entries').append $html
    @show_save_cancel()
    $html

