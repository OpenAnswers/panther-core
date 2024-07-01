#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 


# node modules
util     = require 'util'
crypto   = require 'crypto'

# npm modules
_        = require 'lodash'
bluebird = require 'bluebird'
uuid     = require 'node-uuid'
debug    = require('debug')('oa:helpers')

# oa modules
objhash = require './objhash'

bluebird.promisifyAll crypto

# ## Helpers

# Helpers are a bunch of generic javascript helpers that are missing from
# core js and might be useful for other projects

# The Helpers class is just a namespace to be easily exported at the end
# You can call all the functions directly when you require oa-helpers

#     Helpers = require 'oa-helpers'
#     Helpers.ends_with "last", "st"

# Or with coffeescripts object derefence shortcut

#     { ends_with } = require 'oa-helpers'
#     ends_with "last", "st"

# JS

#     ends_with = require('oa-helpers').ends_with
#     ends_with("last", "st")


class Helpers

  # Give everyone access to our lodash, uuid and bluebird
  @_: _
  @uuid: uuid
  @bluebird: bluebird
  @Promise: bluebird

  # #### `objhash`
  # Create a consistant sha hash of an unordered JS object
  @objhash: objhash

  # #### `.delay( timeout, fn )`
  # Switch setTimeout arguments around for coffee niceness
  #
  #     delay 5000, ->
  #       do_something_delayed()

  @delay: ( timeout, cb ) ->
    setTimeout cb, timeout


  # ###### .map_object( obj , mapping )
  # To map properties of an object to new properties.
  # Returns `undefined`, as it modifies original object
  #
  #     obj = { one: 1, two: 2}
  #     map_object(obj, { one: 'new' });
  #     # => undefined
  #     obj
  #     # => { new: 1, two: 2 }

  @map_object: ( obj , mapping ) ->
    for from, to of mapping
      if obj[from]?
        obj[to] = obj[from]
        delete obj[from]
      else
        obj[to] = undefined
    undefined


  # ###### .map_objects( array, mapping )
  #
  # Run object mapping across an array of objects
  # See `map_object` for mapping setup
  #
  #     map_objects( obj_array, { one: 'new' });

  @map_objects: ( array, mapping ) ->
    for obj in array
      Helpers.map_object obj, mapping
    undefined


  # ###### .mapped_object( array, mapping )
  # see `map_object`, returns new object
  # could be quicker but meh
  # Note this is not a deep clone
  @map_clone_object: ( obj, mapping ) ->
    obj = _.clone obj
    Helpers.map_object obj, mapping
    obj


  # ###### .mapped_objects( array, mapping )
  # see `map_objects`, returns new objects
  @map_clone_objects: ( obj, mapping ) ->
    for obj in array
      Helpers.map_clone_object obj, mapping


  # ###### ends_with( str, ending )
  #
  # Check if a string ends with a certain string
  # Returns true/false
  #
  #     ends_with('abc', 'c');
  #     // => true
  #
  #     ends_with('abc', 'd');
  #     // => false
  #
  @ends_with: (str, end) ->
    return false unless _.isString str
    len = str.length - end.length
    str.indexOf( end, len ) != -1


  # ###### starts_with( str, start )
  #
  # Check if a string starts with a certain string
  # Returns true/false
  #
  #     starts_with('abc', 'a');
  #     // => true
  #
  #     starts_with('abc', 'z');
  #     // => false
  #
  @starts_with: (str, start) ->
    return false unless _.isString str
    str.lastIndexOf( start, 0 ) == 0


  # ###### format_string( string, variables... )
  # Take a string like {whatever} and replace with the
  # variable { whatever: 'value' }
  #
  # Implementation of stacks string formatter
  # http://stackoverflow.com/a/23087471/1318694
  #
  #     format_string( 'wha{wha}wha', { wha: 2 } );
  #     // => wha2wha
  @format_string: ( str, args... )->
    return str if typeof str isnt 'string'
    return str unless args
    return str unless str.indexOf('{') > -1 and str.indexOf('}') > -1
    args = args[0] if typeof args[0] is 'object'
    for arg of args
      re  = RegExp "\\{#{arg}\\}", "gi"
      lookedup = _.get( args, arg )
      got = if typeof lookedup is 'string'
        lookedup
      else
        try
          JSON.stringify lookedup
        catch error
          debug "Error ", error
          ""

      str = str.replace re, got
      return str unless str.indexOf('{') > -1
    return str


  # ###### format_string_object( string, object )
  #
  # Take a string like `a {what} b` and replace with the property `what`
  #
  #     format_string_object( 'a {what} b', {what: 'value'} )
  #
  # Like `format_string()` except purely for objects
  # Can use `.` notation to access sub properties of the object.
  # This does the replace the opposite way to `format_string`, it finds the
  # key name from the string and then looks up the key in the object. Should
  # be faster when using large objects with many properties.
  @format_string_re = RegExp "\\{(.+?)\\}", "ig"
  @format_string_object: ( str, object )->
    debug 'format_string_object str', str
    return str if typeof str isnt 'string'
    return str unless object
    return str unless matches = str.match(Helpers.format_string_re)
    debug 'format_string_object matches', matches
    for match in matches
      key = match.slice 1, -1
      val = _.get object, key
      if val isnt undefined and val isnt null
        str = str.replace match, val
        debug 'format_string_object new str m[%s] v[%s] str[%s]', match, val, str

    return str
      

  # ###### ensure_array( value )
  #
  # Turn a variable into an array element if it isnt an Array
  # Useful for fields that can be either singular or arrays

  @ensure_array: ( some_var ) ->
    some_var = Array some_var unless some_var instanceof Array
    some_var


  # ###### throw_error( message, vars... )
  #
  # Simple error thrower that can include formatted
  # variables in the message
  #
  # Create a [] enclosed string from each variable argument

  @throw_error: ( message, vars... ) ->
    var_str = ''
    if vars.length > 0
      var_join = ( util.inspect(vari) for vari in vars ).join '] ['
      var_str = " [#{var_join}]"

    throw new Error "#{message}#{var_str}"



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
  # http://stackoverflow.com/users/48077/gracenotes
  @re_quote_special: ///
      (           # group
        [.?*+^$[\]\\(){}|-] # and match any of the re special chars
      )
    ///g          #globally

  @regex_escape: ( string ) ->
    string.replace Helpers.re_quote_special, '\\$1'


  # ###### regex_from_array: ( values )
  #
  # Return an `or` regex from an array of values
  #
  @regex_from_array: ( values ) ->
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


  # ###### under_to_class( string )
  #
  # Take an underscored_word and turns it into
  # a ClassWord
  #
  #     under_to_class('test_this_thing')
  #     # => TestThisThing

  @under_to_class: ( underscored ) ->
    # First word
    semi_class = underscored.replace /^[a-z]/, (g)->
      g.toUpperCase()
    # Any other word starting with _
    semi_class.replace /_[a-z]/g, (g)->
      g[1].toUpperCase()


  # ###### class_to_under( string )
  #
  # Take a ClassWord and return a underscored version
  #
  #     class_to_under('TestThisThing')
  #     # => test_this_thing
  @class_to_under: ( classed )->
    # First word
    semi_under = classed.replace /^[A-Z]/, (g)->
      g.toLowerCase()
    # Any other word with a capital
    # It will get tripped up on something like AcePAC
    semi_under.replace /[A-Z]/g, (g)->
      '_' + g.toLowerCase()



  # Test if a var is numeric
  # For some reason js thinks '' is numeric
  @is_numeric: ( val )->
    !isNaN(val) and val isnt ''


  # Test if a string is regex delimited
  @is_regexy: ( val )->
    !!( _.isString(val) and
      Helpers.starts_with(val, '/') and
      val.match(/\/[img]*$/) )

  
  # ###### is_stringy( quoted_string )
  # Tests if a string is quoted, forcing stringyness
  @is_stringy: ( val )->
    _.isString(val) and
    ( Helpers.starts_with( val, "'" ) and Helpers.ends_with( val, "'" )) or
    ( Helpers.starts_with( val, '"' ) and Helpers.ends_with( val, '"' ))


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
      throw new Error 'Regexy match failed for ['+val+'] ['+match+']'


  # ###### regexy_to_regex( stregex )
  # Test if a string is regex delimited, if it is turn is into a regexp
  @regexy_to_regex: ( val )->
    regex_components = Helpers.ensure_array Helpers.regexy_to_string(val)
    new RegExp regex_components...


  # Remove a single value from an array and add new value
  # Useful for css class arrays
  @array_replace: ( array, new_val, old_val )->
    idx = array.indexOf old_val
    array.splice idx, 1, new_val




  # ### random_string( length, char_set )
  #
  # Generate a random base64ish string

  @rand_numbers: '0123456789'
  @rand_lower:  'abcdefghijklmnopqrstuvwxyz'
  @rand_upper:  @rand_lower.toUpperCase()
  @rand_chars:  @rand_numbers + @rand_lower + @rand_upper
  @base64_chars: @rand_chars + '-_'
  @base32_chars: @rand_numbers + 'abcdefghijklmnopqrstuv'

  @random_string: ( length, chars = Helpers.rand_chars )->
    string = for [1..length]
      n = Math.floor( Math.random() * chars.length )
      chars.substring( n, n+1 )
    string.join ''


  @crypto_random_hex: ( bytes )->
    buf = crypto.randomBytes(bytes)
    {
      bytes: buf
      string: buf.toString('hex')
    }

  @crypto_random_base64: ( bytes )->
    buf = crypto.randomBytes(bytes)
    {
      bytes: buf
      string: buf.toString('base64')
    }

  @crypto_random_base64_url: ( bytes )->
    res = Helpers.crypto_random_base64( bytes )
    res.string = res.string
      .replace /\//g, '_'
      .replace /\+/g, '-'
      .replace /\=/g, ''


  # No nice base62 for node, without delving into it, base64 does
  # most of what we want and probably better than I can.
  
  # This is not a value you can convert back to a buffer, just a 
  # random string

  # A couple of bits on the end might not be as random but ¯\_(ツ)_/¯

  @crypto_random_base62_string: ( length )->
    string = crypto.randomBytes(length+3).toString 'base64'
    Helpers.base62_from_base64 string, length

  @crypto_random_base62_string_async: ( length )->
    crypto.randomBytesAsync(length)
      .then (buf)->
        string = buf.toString 'base64'
        Helpers.base62_from_base64 string, length

  @base62_from_base64: ( b64string, length )->
    # Remove the `=` padding and any non full bytes on the end
    unless length % 3 is 0
      rem = 0 - (length % 3) - 1
      b64string = b64string.slice(0,rem)

    # Remove the 2 base64 chars
    string = b64string
      .replace /\+|\//g, ''

    if string.length is length
      return string
    
    if string.length > length
      return string.slice(0,length)

    if string.length < length
      debug 'base62_from_base64 was short', length, string.length
      new_string = @crypto_random_base62_string(length)
      string = (string + new_string).slice(0, length)

    if string.length < length
      debug 'base62_from_base64 was really short', length, string.length
      new_string = @crypto_random_base62_string( Math.ceil(string.length / 2) )
      string = (string + new_string).slice(0, length)

    if string.length < length
      debug "base62_from_base64 had too many /'s and +'s 3 times"
      throw new Error 'crypto.randomBytes base64 statistical anomoly'

    return string.slice(0,length)


module.exports = Helpers
