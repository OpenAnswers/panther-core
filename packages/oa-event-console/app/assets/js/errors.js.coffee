class DomErrorBase extends Error
  name: 'DomErrorBase'
  constructor: (@message, options = {} )->
    if typeof Error.captureStackTrace is 'function'
      super()
      Error.captureStackTrace(this, DomErrorBase)
    
    # An optional friendly user error message
    @friendly = options.friendly
    
    # A dom element for bootstrap error classes to use
    @$element = options.$element
    
    # A code, just in case
    @code = options.code

    @name = @constructor::name

  to_string: ->
    "#{@friendly or @message}"

  # relies on the helpers, escapeHTML on the prototype
  to_html: ->
    "<div class=\"#{@name}\">#{(@friendly or @message).escapeHTML()}</div>"

  highlight_elements: ->
    throw new Error 'implement highlight_elements'


class DomError extends DomErrorBase
  name: 'DomError'
  type: 'error'
  label: 'Error'

  highlight_elements: ->
    if @.$element
      @.$element.addClass "has-error"


class DomWarning extends DomErrorBase
  name: 'DomWarning'
  type: 'warning'
  label: 'Warning'

  highlight_elements: ->
    if @.$element
      @.$element.addClass "has-warning"


class DomErrorSet

  @logger = debug 'oa:event:errors'

  constructor: ( options = {} )->
    { @label, @default_message, @default_$element, @default_friendly } = options
    @errors = []
    @warnings = []
    @defaults()
    @logger = @constructor.logger

  add_error: ( error )->
    @logger 'adding error', error
    @errors.push error

  add_warning: ( warning )->
    @logger 'adding warning', warning
    @warnings.push warning

  add_new_error: ( message, options )->
    o = _.defaults {}, options, @default_obj
    err = new DomError message, options
    @add_error err

  add_new_warning: ( message, options )->
    o = _.defaults {}, options, @default_obj
    warn = new DomWarning message, options
    @add_warning warn

  ok: -> @errors.length is 0

  all_errors: -> @errors

  all_warnings: -> @warnings

  to_html: ->
    @logger 'errors [%s] warnings [%s]', @errors.length, @warnings.length
    out = (warning.to_html() for warning in @warnings)
    out = out.concat (error.to_html() for error in @errors)
    out.join ''

  to_string: ->
    @logger 'errors [%s] warnings [%s]', @errors.length, @warnings.length
    out = (warnings.to_string() for warning in @warnings)
    out = out.concat (error.to_string() for error in @errors)
    @logger out
    out.join '\n'

  throw: ->
    error = new DomError @to_string()
    error.domerrors = @
    throw error

  check_throw: ->
    if @errors.length > 0
      error = new DomError @to_string()
      error.domerrors = @
      throw error

  defaults: ->
    o = {}
    o.message = @default_message if @default_message
    o.friendly = @default_friendly if @default_friendly
    o.$element = @default_$element if @default_$element
    @default_obj = o
