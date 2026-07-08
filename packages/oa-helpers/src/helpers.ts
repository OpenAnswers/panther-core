// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// node modules
const util = require('util');
const crypto = require('crypto');

// npm modules
const _ = require('lodash');
const bluebird = require('bluebird');
const uuid = require('uuid');
const debug = require('debug')('oa:helpers');

// oa modules
const objhash = require('./objhash');

bluebird.promisifyAll(crypto);

// ## Helpers

// Helpers are a bunch of generic javascript helpers that are missing from
// core js and might be useful for other projects

// The Helpers class is just a namespace to be easily exported at the end
// You can call all the functions directly when you require oa-helpers

//     const Helpers = require('oa-helpers')
//     Helpers.ends_with("last", "st")

// Or with destructuring

//     const { ends_with } = require('oa-helpers')
//     ends_with("last", "st")

class Helpers {
  static initClass() {
    // Give everyone access to our lodash, uuid and bluebird
    this._ = _;
    this.uuid = uuid;
    this.bluebird = bluebird;
    this.Promise = bluebird;

    // #### `objhash`
    // Create a consistant sha hash of an unordered JS object
    this.objhash = objhash;

    // ###### format_string_object( string, object )
    //
    // Take a string like `a {what} b` and replace with the property `what`
    //
    //     format_string_object( 'a {what} b', {what: 'value'} )
    //
    // Like `format_string()` except purely for objects
    // Can use `.` notation to access sub properties of the object.
    // This does the replace the opposite way to `format_string`, it finds the
    // key name from the string and then looks up the key in the object. Should
    // be faster when using large objects with many properties.
    this.format_string_re = RegExp('\\{(.+?)\\}', 'ig');

    // ###### .regex_escape( string )
    // Function to create a string with all special regex
    // characters escaped
    //
    // Returns a new string with escaped regex characters
    //
    //     regex_escape('a\d+5]');
    //     // => 'a\\d+5\]'
    //
    // http://stackoverflow.com/a/494122
    // http://stackoverflow.com/users/48077/gracenotes
    this.re_quote_special = new RegExp(
      `\
(\
[.?*+^$[\\]\\\\(){}|-]\
)\
`,
      'g'
    );

    // ### random_string( length, char_set )
    //
    // Generate a random base64ish string

    this.rand_numbers = '0123456789';
    this.rand_lower = 'abcdefghijklmnopqrstuvwxyz';
    this.rand_upper = this.rand_lower.toUpperCase();
    this.rand_chars = this.rand_numbers + this.rand_lower + this.rand_upper;
    this.base64_chars = this.rand_chars + '-_';
    this.base32_chars = this.rand_numbers + 'abcdefghijklmnopqrstuv';
  }

  // #### `.delay( timeout, fn )`
  // Switch setTimeout arguments around for callback-last style
  //
  //     delay(5000, () => {
  //       do_something_delayed()
  //     })

  static delay(timeout, cb) {
    return setTimeout(cb, timeout);
  }

  // ###### .map_object( obj , mapping )
  // To map properties of an object to new properties.
  // Returns `undefined`, as it modifies original object
  //
  //     obj = { one: 1, two: 2}
  //     map_object(obj, { one: 'new' });
  //     # => undefined
  //     obj
  //     # => { new: 1, two: 2 }

  static map_object(obj, mapping) {
    for (var from in mapping) {
      var to = mapping[from];
      if (obj[from] != null) {
        obj[to] = obj[from];
        delete obj[from];
      } else {
        obj[to] = undefined;
      }
    }
    return undefined;
  }

  // ###### .map_objects( array, mapping )
  //
  // Run object mapping across an array of objects
  // See `map_object` for mapping setup
  //
  //     map_objects( obj_array, { one: 'new' });

  static map_objects(array, mapping) {
    for (var obj of Array.from(array)) {
      Helpers.map_object(obj, mapping);
    }
    return undefined;
  }

  // ###### .mapped_object( array, mapping )
  // see `map_object`, returns new object
  // could be quicker but meh
  // Note this is not a deep clone
  static map_clone_object(obj, mapping) {
    obj = _.clone(obj);
    Helpers.map_object(obj, mapping);
    return obj;
  }

  // ###### .mapped_objects( array, mapping )
  // see `map_objects`, returns new objects
  static map_clone_objects(obj, mapping) {
    return (() => {
      const result = [];
      for (obj of Array.from(array)) {
        result.push(Helpers.map_clone_object(obj, mapping));
      }
      return result;
    })();
  }

  // ###### ends_with( str, ending )
  //
  // Check if a string ends with a certain string
  // Returns true/false
  //
  //     ends_with('abc', 'c');
  //     // => true
  //
  //     ends_with('abc', 'd');
  //     // => false
  //
  static ends_with(str, end) {
    if (!_.isString(str)) {
      return false;
    }
    const len = str.length - end.length;
    return str.indexOf(end, len) !== -1;
  }

  // ###### starts_with( str, start )
  //
  // Check if a string starts with a certain string
  // Returns true/false
  //
  //     starts_with('abc', 'a');
  //     // => true
  //
  //     starts_with('abc', 'z');
  //     // => false
  //
  static starts_with(str, start) {
    if (!_.isString(str)) {
      return false;
    }
    return str.lastIndexOf(start, 0) === 0;
  }

  // ###### format_string( string, variables... )
  // Take a string like {whatever} and replace with the
  // variable { whatever: 'value' }
  //
  // Implementation of stacks string formatter
  // http://stackoverflow.com/a/23087471/1318694
  //
  //     format_string( 'wha{wha}wha', { wha: 2 } );
  //     // => wha2wha
  static format_string(str, ...args) {
    if (typeof str !== 'string') {
      return str;
    }
    if (!args) {
      return str;
    }
    if (!(str.indexOf('{') > -1) || !(str.indexOf('}') > -1)) {
      return str;
    }
    if (typeof args[0] === 'object') {
      args = args[0];
    }
    for (var arg in args) {
      var re = RegExp(`\\{${arg}\\}`, 'gi');
      var lookedup = _.get(args, arg);
      var got =
        typeof lookedup === 'string'
          ? lookedup
          : (() => {
              try {
                return JSON.stringify(lookedup);
              } catch (error) {
                debug('Error ', error);
                return '';
              }
            })();

      str = str.replace(re, got);
      if (!(str.indexOf('{') > -1)) {
        return str;
      }
    }
    return str;
  }
  static format_string_object(str, object) {
    let matches;
    debug('format_string_object str', str);
    if (typeof str !== 'string') {
      return str;
    }
    if (!object) {
      return str;
    }
    if (!(matches = str.match(Helpers.format_string_re))) {
      return str;
    }
    debug('format_string_object matches', matches);
    for (var match of Array.from(matches)) {
      var key = match.slice(1, -1);
      var val = _.get(object, key);
      if (val !== undefined && val !== null) {
        str = str.replace(match, val);
        debug('format_string_object new str m[%s] v[%s] str[%s]', match, val, str);
      }
    }

    return str;
  }

  // ###### ensure_array( value )
  //
  // Turn a variable into an array element if it isnt an Array
  // Useful for fields that can be either singular or arrays

  static ensure_array(some_var) {
    if (!(some_var instanceof Array)) {
      some_var = Array(some_var);
    }
    return some_var;
  }

  // ###### throw_error( message, vars... )
  //
  // Simple error thrower that can include formatted
  // variables in the message
  //
  // Create a [] enclosed string from each variable argument

  static throw_error(message, ...vars) {
    let var_str = '';
    if (vars.length > 0) {
      const var_join = Array.from(vars)
        .map(vari => util.inspect(vari))
        .join('] [');
      var_str = ` [${var_join}]`;
    }

    throw new Error(`${message}${var_str}`); //globally
  }

  static regex_escape(string) {
    return string.replace(Helpers.re_quote_special, '\\$1');
  }

  // ###### regex_from_array: ( values )
  //
  // Return an `or` regex from an array of values
  //
  static regex_from_array(values) {
    //Build strings for `new RegExp`
    const regex_values = Array.from(values).map(item =>
      item instanceof RegExp
        ? item.source
        : Helpers.is_regexy(item)
          ? Helpers.regexy_to_string(item)
          : Helpers.regex_escape(`${item}`)
    );
    //Return a new regexp
    return new RegExp(regex_values.join('|'));
  }

  // ###### under_to_class( string )
  //
  // Take an underscored_word and turns it into
  // a ClassWord
  //
  //     under_to_class('test_this_thing')
  //     # => TestThisThing

  static under_to_class(underscored) {
    // First word
    const semi_class = underscored.replace(/^[a-z]/, g => g.toUpperCase());
    // Any other word starting with _
    return semi_class.replace(/_[a-z]/g, g => g[1].toUpperCase());
  }

  // ###### class_to_under( string )
  //
  // Take a ClassWord and return a underscored version
  //
  //     class_to_under('TestThisThing')
  //     # => test_this_thing
  static class_to_under(classed) {
    // First word
    const semi_under = classed.replace(/^[A-Z]/, g => g.toLowerCase());
    // Any other word with a capital
    // It will get tripped up on something like AcePAC
    return semi_under.replace(/[A-Z]/g, g => '_' + g.toLowerCase());
  }

  // Test if a var is numeric
  // For some reason js thinks '' is numeric
  static is_numeric(val) {
    return !isNaN(val) && val !== '';
  }

  // Test if a string is regex delimited
  static is_regexy(val) {
    return !!(_.isString(val) && Helpers.starts_with(val, '/') && val.match(/\/[img]*$/));
  }

  // ###### is_stringy( quoted_string )
  // Tests if a string is quoted, forcing stringyness
  static is_stringy(val) {
    return (
      (_.isString(val) && Helpers.starts_with(val, "'") && Helpers.ends_with(val, "'")) ||
      (Helpers.starts_with(val, '"') && Helpers.ends_with(val, '"'))
    );
  }

  // ###### regexy_to_string( stregex )
  // Test if a string is regex delimited, if it is turn is into a regexp
  // If there is a modifier as well, return an array or strings

  //    regexy_to_string( /test/ )
  //    => 'test'

  //    regexy_to_string( /test/m )
  //    => [ 'test', 'm' ]

  static regexy_to_string(val) {
    let match;
    if (_.isString(val)) {
      match = val.match(/^\/(.*)\/([img]*)$/);
    }
    if (match) {
      if (match[2]) {
        return [match[1], match[2]];
      } else {
        return match[1];
      }
    } else {
      throw new Error('Regexy match failed for [' + val + '] [' + match + ']');
    }
  }

  // ###### regexy_to_regex( stregex )
  // Test if a string is regex delimited, if it is turn is into a regexp
  static regexy_to_regex(val) {
    const regex_components = Helpers.ensure_array(Helpers.regexy_to_string(val));
    return new RegExp(...Array.from(regex_components || []));
  }

  // Remove a single value from an array and add new value
  // Useful for css class arrays
  static array_replace(array, new_val, old_val) {
    const idx = array.indexOf(old_val);
    return array.splice(idx, 1, new_val);
  }

  static random_string(length, chars) {
    if (chars == null) {
      chars = Helpers.rand_chars;
    }
    const string = (() => {
      const result = [];
      for (let i = 1, end = length, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
        var n = Math.floor(Math.random() * chars.length);
        result.push(chars.substring(n, n + 1));
      }
      return result;
    })();
    return string.join('');
  }

  static crypto_random_hex(bytes) {
    const buf = crypto.randomBytes(bytes);
    return {
      bytes: buf,
      string: buf.toString('hex'),
    };
  }

  static crypto_random_base64(bytes) {
    const buf = crypto.randomBytes(bytes);
    return {
      bytes: buf,
      string: buf.toString('base64'),
    };
  }

  static crypto_random_base64_url(bytes) {
    const res = Helpers.crypto_random_base64(bytes);
    return (res.string = res.string.replace(/\//g, '_').replace(/\+/g, '-').replace(/\=/g, ''));
  }

  // No nice base62 for node, without delving into it, base64 does
  // most of what we want and probably better than I can.

  // This is not a value you can convert back to a buffer, just a
  // random string

  // A couple of bits on the end might not be as random but ¯\_(ツ)_/¯

  static crypto_random_base62_string(length) {
    const string = crypto.randomBytes(length + 3).toString('base64');
    return Helpers.base62_from_base64(string, length);
  }

  static crypto_random_base62_string_async(length) {
    return crypto.randomBytesAsync(length).then(function (buf) {
      const string = buf.toString('base64');
      return Helpers.base62_from_base64(string, length);
    });
  }

  static base62_from_base64(b64string, length) {
    // Remove the `=` padding and any non full bytes on the end
    let new_string;
    if (length % 3 !== 0) {
      const rem = 0 - (length % 3) - 1;
      b64string = b64string.slice(0, rem);
    }

    // Remove the 2 base64 chars
    let string = b64string.replace(/\+|\//g, '');

    if (string.length === length) {
      return string;
    }

    if (string.length > length) {
      return string.slice(0, length);
    }

    if (string.length < length) {
      debug('base62_from_base64 was short', length, string.length);
      new_string = this.crypto_random_base62_string(length);
      string = (string + new_string).slice(0, length);
    }

    if (string.length < length) {
      debug('base62_from_base64 was really short', length, string.length);
      new_string = this.crypto_random_base62_string(Math.ceil(string.length / 2));
      string = (string + new_string).slice(0, length);
    }

    if (string.length < length) {
      debug("base62_from_base64 had too many /'s and +'s 3 times");
      throw new Error('crypto.randomBytes base64 statistical anomoly');
    }

    return string.slice(0, length);
  }
}
Helpers.initClass();

module.exports = Helpers;
