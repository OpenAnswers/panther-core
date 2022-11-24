# # Helper Functions


# ## Mixin Module

# Add a ruby like mixin to coffeescript
# mixins - https://arcturo.github.io/library/coffeescript/03_classes.html

moduleKeywords = ['extended', 'included']

class Module

  @extend: (obj) ->
    for key, value of obj when key not in moduleKeywords
      @[key] = value

    obj.extended?.apply(@)
    this

  @include: (obj) ->
    for key, value of obj when key not in moduleKeywords
      # Assign properties to the prototype
      @::[key] = value

    obj.included?.apply(@)
    this


# ## Browser detection
# http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
class Browser
  # Opera 8.0+
  isOpera = (!!window.opr and !!opr.addons) or !!window.opera or navigator.userAgent.indexOf(' OPR/') >= 0
  # Firefox 1.0+
  isFirefox = typeof InstallTrigger isnt 'undefined'
  # At least Safari 3+: "[object HTMLElementConstructor]"
  isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0
  # Internet Explorer 6-11
  # isIE = /*@cc_on!@*/ false or !!document.documentMode
  isIE = Function.apply(window,['','return /*@cc_on!@*/ false || !!window.document.documentMode;'])()
  # Edge 20+
  isEdge = !isIE && !!window.StyleMedia
  # Chrome 1+
  isChrome = !!window.chrome && !!window.chrome.webstore
  # Blink engine detection
  isBlink = (isChrome or isOpera) && !!window.CSS


# ## Helper Functions

# Move this to using the node oa-helpers module

class Helpers

  # Test if a var is numeric
  # For some reason js thinks '' is numeric
  @is_numeric = ( val )->
    !isNaN(val) and val isnt ''

  # Test if a string is regex delimited
  @is_regexy = ( val )->
    _.isString(val) and val.match(/^\/[\s\S]*\/$/)

  # Test if a string is quoted, forcing stringyness
  @is_stringy = ( val )->
    _.isString(val) and ( val.match(/^"[\s\S]*"$/) or val.match(/^'[\s\S]*'$/) )


  # ###### .regex_escape( string )
  # Function to create a string with all special regex
  # characters escaped
  #
  # Returns a new string with escaped regex characters
  #
  #     regex_escape('a\d+5]');
  #     // => 'a\\d+5\]'
  #
  # http://stackoverflow.com/a/494122
  # http://stackoverflow.com/users/48077/gracenotesv
  @re_quote_special = ///
      (           # group
        [.?*+^$[\]\\(){}|-] # and match any of the re special chars
      )
    ///g          #globally

  @regex_escape = ( string ) ->
    string.replace Helpers.re_quote_special, '\\$1'


  # ###### regex_from_array( values )
  #
  # Return an `or` regex from an array of values
  #
  @regex_from_array = ( values ) ->
    #Build strings for `new RegExp`
    regex_values = for item in values
      if item instanceof RegExp
        item.source
      else if Helpers.is_regexy item
        Helpers.regexy_to_string item
      else
        Helpers.regex_escape "#{item}"
    #Return a new regexp
    new RegExp regex_values.join('|')


  # ###### regexy_to_string( stregex )
  # Test if a string is regex delimited, if it is turn is into a regexp
  # If there is a modifier as well, return an array or strings

  #    regexy_to_string( /test/ )
  #    => 'test'

  #    regexy_to_string( /test/m )
  #    => [ 'test', 'm' ]
  
  @regexy_to_string: ( val )->
    if _.isString(val)
      match = val.match /^\/(.*)\/([img]*)$/
    if match
      if match[2]
        return [ match[1], match[2] ]
      else
        return match[1]
    else
      throw new Error "Regexy match failed for [#{val}] [#{match}]"


  # ###### regexy_to_regex( stregex )
  # Test if a string is regex delimited, if it is turn is into a regexp
  @regexy_to_regex: ( val )->
    regex_components = Helpers.ensure_array Helpers.regexy_to_string(val)
    new RegExp regex_components...



  # Quick is array or make array
  @ensure_array = ( some_var ) ->
    if some_var instanceof Array
      some_var
    else
      Array some_var

  # Remove a single value from an array and add new value
  # Useful for css class arrays
  @array_replace = ( array, new_val, old_val )->
    idx = array.indexOf old_val
    array.splice idx, 1, new_val


  # ###### random_string()
  #
  # The character set defaults to alpha/numeric upper and
  # lower. Base62
  #
  #     random_string( length<Integer>, charset<String> )
  #
  # Create a default set of characters to select from
  @default_rnd_set =
    'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  @random_string = ( length, set = Helpers.default_rnd_set ) ->
    _.sampleSize(set, length).join ''
      

  # ###### delay( ms_Integer, fn_Function )
  # Coffeescript a `setTimeout`
  @delay = ( ms, fn )->
    setTimeout fn, ms

  # Bootstrap fade and collapse
  @bs_fade_collapse = ( $el, cb )->
    $el.addClass 'fade'
    $el.removeClass 'in'
    Helpers.delay 150, ->
      $el.addClass 'collapse'
      cb($el) if cb

  # Bootstrap uncollapse and fade in
  @bs_uncollapse_fadein = ( $el, cb )->
    $el.removeClass 'collapse'
    Helpers.delay 5, ->
      $el.addClass 'in'
      if cb
        delay 150, -> cb($el)


  # Make a number more easily read by humans with suffixes.
  # `digits` below 3 will be weird.
  @round_number = ( number, digits = 3 )->
    number = parseInt(number)
    
    divisor = 1
    suffix = ''

    if number > 999999999
      divisor = 1000000000
      suffix = 'b'
    
    else if number > 999999
      divisor = 1000000
      suffix = 'm'
    
    else if number > 999
      divisor = 1000
      suffix = 'k'
    
    else
      return number

    # Create our smaller number for human consumption
    short_number = number / divisor

    # Get the value before and after the `.`
    [ before, after ] = "#{short_number}".split('.')

    # Setup the length, -1 for a decimal.
    rounded_length = digits - before.length - 1
    if rounded_length < 0
      rounded_length = 0
    
    # Now we can create a value with variable length decimals
    rounded = short_number.toFixed(rounded_length)

    return rounded + suffix


  # http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors

  @shadeRGBColor = ( color, percent )->
    [ R, G, B ] = color.split ","
    t = if percent < 0 then 0 else 255
    pct = if percent < 0 then ( percent * -1 ) else percent
    R = parseInt R.slice(4)
    G = parseInt G
    B = parseInt B
    newR = Math.round( ( t - R ) * pct ) + R
    newG = Math.round( ( t - G ) * pct ) + G
    newB = Math.round( ( t - B ) * pct ) + B
    "rgb(#{newR},#{newG},#{newB})"


# ###### String.format()

# Implementation of stacks string formatter
# http://stackoverflow.com/a/23087471/1318694
#    "{first} {last}".format({ first: "matt", last: "hoyle" })
#    "{0} {1}".format( "matt", "hoyle" )
if !String.prototype.format
  console.log 'Adding String.format()'
  String.prototype.format = (args...)->
    str = this.toString()
    return str unless args
    return str unless str.indexOf('{') > -1 and str.indexOf('}') > -1
    args = args[0] if typeof args[0] is 'object'
    for arg of args
      re  = RegExp "\\{#{arg}\\}", "gi"
      str = str.replace re, _.get(args, arg)
    return str
else
  console.error 'Can\'t add a String.format function as it already exists'


# ###### String.startsWith()
# Add startsWith() to pre ecma6 runtimes
if !String.prototype.startsWith
  console.log 'Adding String.startsWith()'
  String.prototype.startsWith = ( string )->
    @slice(0, str.length) is str

# ###### String.endsWith()
# Add endsWith() to pre ecma6 runtimes
if !String.prototype.endsWith
  console.log 'Adding String.endsWith()'
  String.prototype.endsWith = ( string )->
    @slice(-str.length) is str

# ###### String.escapeHTML()
# Add escapeHTML() function to String
if !String.prototype.escapeHTML
  console.log 'Adding String.escapeHTML()'
  String.prototype.escapeHTML = ()->
    el = document.createElement 'textarea'
    el.textContent = @
    el.innerHTML
else
  console.error 'Can\'t add a String.escapeHTML function as it already exists'


# ###### String.unescapeHTML()
# Add unescapeHTML() function to String
if !String.prototype.unescapeHTML
  console.log 'Adding String.unescapeHTML()'
  String.prototype.unescapeHTML = ()->
    el = document.createElement 'textarea'
    el.innerHTML = @
    el.textContent
else
  console.error 'Can\'t add a String.unescapeHTML function as it already exists'


# ###### String.capitalize()
# Add capitalize() function to String
if !String.prototype.capitalize
  String.prototype.capitalize = ()->
    @charAt(0).toUpperCase() + @slice(1)
else
  console.error 'Can\'t add a String.capitalize function as it already exists'

