# OA Helpers


Some helper functions for nodejs apps, includes and exports _

Written in coffescript in `src/`

Packaged as js in `lib/`

Docco in `docs/`

## Exports

    _ = lodash
    uuid = uuid
    bluebird = bluebird
    Promise = bluebird
    
### `objhash(obj)`

Provides a consistant hash of a Javascript Object. 

*Note*: This relies on Javascript `sort` which isn't always stable. Like on 
V8 with an array containing more than 10 items :/

    objhash({test:true}) => '8228c84d64b8a95c6b1a1ebc17ce8732cf1a7a21'
    
### `delay( timeout, cb )`

coffeescript setTimeout( cb, timeout )

### `map_object()`

### `map_objects()`
 
### `map_clone_object()`

### `map_clone_objects()`

### `ends_with()`

### `starts_with()`

### `format_string()`

    format_string( 'wha{wha}wha', { wha: 2 } ) => 'wha2wha'

### `format_string_object()`

    format_string_object( 'a {what} b', {what: 'value'} ) => 'a value b'
    
### `throw_error()`


### `ensure_array()`

Make sure something is an array. If not, turn it into an array.

### `regex_escape()`

Returns a new string with any regex special characters escaped.

### `regex_from_array()`

### `under_to_class()`

Take an underscored_word and turns it into a ClassWord
  
### `class_to_under()`

Take a ClassWord and return a underscored version

### `is_numeric()`

Test if a var is numeric. For some reason js thinks '' is numeric.
  
### `is_regexy()`

Test if a string is regex delimited `/string/`

### `is_stringy()`

Tests if a string is quoted, forcing stringyness.

### `regexy_to_string()`

Test if a string is regex delimited, if it is turn is into a regexp
If there is a modifier as well, return an array of strings
 
    regexy_to_string( /test/ )
    => 'test'

    regexy_to_string( /test/m )
    => [ 'test', 'm' ]
    
### `regexy_to_regex()`

Turn a regex like string into a regex

### `array_replace()`

Remove a single value from an array and add new value

### `random_string( length, <char_set> )`

Generate a random base64ish string. Uses `Math.random`

### `crypto_random_hex(bytes)`

### `crypto_random_base64(bytes)`

### `crypto_random_base64_url(bytes)`

### `crypto_random_base62_string(bytes)`


generate a base64 url safe random string. 
### throw_error

Error helper, deals with vars nicely

### under_to_class

convert an undescored work to class name

### class_to_under

convert a class name to underscored
