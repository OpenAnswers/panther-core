// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Helper Functions

// ## Mixin Module

// Ruby-like mixin support for classes

const moduleKeywords = ['extended', 'included'];

class Module {
  static extend(obj) {
    for (var key in obj) {
      var value = obj[key];
      if (!moduleKeywords.includes(key)) {
        this[key] = value;
      }
    }

    if (obj.extended != null) {
      obj.extended.apply(this);
    }
    return this;
  }

  static include(obj) {
    for (var key in obj) {
      // Assign properties to the prototype
      var value = obj[key];
      if (!moduleKeywords.includes(key)) {
        this.prototype[key] = value;
      }
    }

    if (obj.included != null) {
      obj.included.apply(this);
    }
    return this;
  }
}

// ## Browser detection
// http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
var Browser = (function () {
  let isOpera = undefined;
  let isFirefox = undefined;
  let isSafari = undefined;
  let isIE = undefined;
  let isEdge = undefined;
  let isChrome = undefined;
  let isBlink = undefined;
  Browser = class Browser {
    static initClass() {
      // Opera 8.0+
      isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.includes(' OPR/');
      // Firefox 1.0+
      isFirefox = typeof InstallTrigger !== 'undefined';
      // At least Safari 3+: "[object HTMLElementConstructor]"
      isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
      // Internet Explorer 6-11
      // isIE = /*@cc_on!@*/ false or !!document.documentMode
      isIE = Function.apply(window, ['', 'return /*@cc_on!@*/ false || !!window.document.documentMode;'])();
      // Edge 20+
      isEdge = !isIE && !!window.StyleMedia;
      // Chrome 1+
      isChrome = !!window.chrome && !!window.chrome.webstore;
      // Blink engine detection
      isBlink = (isChrome || isOpera) && !!window.CSS;
    }
  };
  Browser.initClass();
  return Browser;
})();

// ## Helper Functions

// Move this to using the node oa-helpers module

class Helpers {
  static initClass() {
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
    // http://stackoverflow.com/users/48077/gracenotesv
    this.re_quote_special = new RegExp(
      `\
(\
[.?*+^$[\\]\\\\(){}|-]\
)\
`,
      'g'
    );

    // ###### random_string()
    //
    // The character set defaults to alpha/numeric upper and
    // lower. Base62
    //
    //     random_string( length<Integer>, charset<String> )
    //
    // Create a default set of characters to select from
    this.default_rnd_set = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }

  // Test if a var is numeric
  // For some reason js thinks '' is numeric
  static is_numeric(val) {
    return !isNaN(val) && val !== '';
  }

  // Test if a string is regex delimited
  static is_regexy(val) {
    return _.isString(val) && val.match(/^\/[\s\S]*\/$/);
  }

  // Test if a string is quoted, forcing stringyness
  static is_stringy(val) {
    return _.isString(val) && (val.match(/^"[\s\S]*"$/) || val.match(/^'[\s\S]*'$/)); //globally
  }

  static regex_escape(string) {
    return string.replace(Helpers.re_quote_special, '\\$1');
  }

  // ###### regex_from_array( values )
  //
  // Return an `or` regex from an array of values
  //
  static regex_from_array(values) {
    //Build strings for `new RegExp`
    const regex_values = values.map(item =>
      item instanceof RegExp
        ? item.source
        : Helpers.is_regexy(item)
          ? Helpers.regexy_to_string(item)
          : Helpers.regex_escape(`${item}`)
    );
    //Return a new regexp
    return new RegExp(regex_values.join('|'));
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
      throw new Error(`Regexy match failed for [${val}] [${match}]`);
    }
  }

  // ###### regexy_to_regex( stregex )
  // Test if a string is regex delimited, if it is turn is into a regexp
  static regexy_to_regex(val) {
    const regex_components = Helpers.ensure_array(Helpers.regexy_to_string(val));
    return new RegExp(...(regex_components || []));
  }

  // Quick is array or make array
  static ensure_array(some_var) {
    if (some_var instanceof Array) {
      return some_var;
    } else {
      return Array(some_var);
    }
  }

  // Remove a single value from an array and add new value
  // Useful for css class arrays
  static array_replace(array, new_val, old_val) {
    const idx = array.indexOf(old_val);
    return array.splice(idx, 1, new_val);
  }

  static random_string(length, set) {
    set ??= Helpers.default_rnd_set;
    return _.sampleSize(set, length).join('');
  }

  // ###### delay( ms_Integer, fn_Function )
  static delay(ms, fn) {
    return setTimeout(fn, ms);
  }

  // Bootstrap fade and collapse
  static bs_fade_collapse($el, cb) {
    $el.addClass('fade');
    $el.removeClass('in');
    return Helpers.delay(150, function () {
      $el.addClass('collapse');
      if (cb) {
        return cb($el);
      }
    });
  }

  // Bootstrap uncollapse and fade in
  static bs_uncollapse_fadein($el, cb) {
    $el.removeClass('collapse');
    return Helpers.delay(5, function () {
      $el.addClass('in');
      if (cb) {
        return delay(150, () => cb($el));
      }
    });
  }

  // Make a number more easily read by humans with suffixes.
  // `digits` below 3 will be weird.
  static round_number(number, digits) {
    digits ??= 3;
    number = parseInt(number);

    let divisor = 1;
    let suffix = '';

    if (number > 999999999) {
      divisor = 1000000000;
      suffix = 'b';
    } else if (number > 999999) {
      divisor = 1000000;
      suffix = 'm';
    } else if (number > 999) {
      divisor = 1000;
      suffix = 'k';
    } else {
      return number;
    }

    // Create our smaller number for human consumption
    const short_number = number / divisor;

    // Get the value before and after the `.`
    const [before, after] = `${short_number}`.split('.');

    // Setup the length, -1 for a decimal.
    let rounded_length = digits - before.length - 1;
    if (rounded_length < 0) {
      rounded_length = 0;
    }

    // Now we can create a value with variable length decimals
    const rounded = short_number.toFixed(rounded_length);

    return rounded + suffix;
  }

  // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors

  static shadeRGBColor(color, percent) {
    let [R, G, B] = color.split(',');
    const t = percent < 0 ? 0 : 255;
    const pct = percent < 0 ? percent * -1 : percent;
    R = parseInt(R.slice(4));
    G = parseInt(G);
    B = parseInt(B);
    const newR = Math.round((t - R) * pct) + R;
    const newG = Math.round((t - G) * pct) + G;
    const newB = Math.round((t - B) * pct) + B;
    return `rgb(${newR},${newG},${newB})`;
  }
}
Helpers.initClass();

// ###### String.format()

// Implementation of stacks string formatter
// http://stackoverflow.com/a/23087471/1318694
if (!String.prototype.format) {
  console.log('Adding String.format()');
  String.prototype.format = function (...args) {
    let str = this.toString();
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
      str = str.replace(re, _.get(args, arg));
    }
    return str;
  };
} else {
  console.error("Can't add a String.format function as it already exists");
}

// ###### String.startsWith()
// Add startsWith() to pre ecma6 runtimes
if (!String.prototype.startsWith) {
  console.log('Adding String.startsWith()');
  String.prototype.startsWith = function (string) {
    return this.slice(0, str.length) === str;
  };
}

// ###### String.endsWith()
// Add endsWith() to pre ecma6 runtimes
if (!String.prototype.endsWith) {
  console.log('Adding String.endsWith()');
  String.prototype.endsWith = function (string) {
    return this.slice(-str.length) === str;
  };
}

// ###### String.escapeHTML()
// Add escapeHTML() function to String
if (!String.prototype.escapeHTML) {
  console.log('Adding String.escapeHTML()');
  String.prototype.escapeHTML = function () {
    const el = document.createElement('textarea');
    el.textContent = this;
    return el.innerHTML;
  };
} else {
  console.error("Can't add a String.escapeHTML function as it already exists");
}

// ###### String.unescapeHTML()
// Add unescapeHTML() function to String
if (!String.prototype.unescapeHTML) {
  console.log('Adding String.unescapeHTML()');
  String.prototype.unescapeHTML = function () {
    const el = document.createElement('textarea');
    el.innerHTML = this;
    return el.textContent;
  };
} else {
  console.error("Can't add a String.unescapeHTML function as it already exists");
}

// ###### String.capitalize()
// Add capitalize() function to String
if (!String.prototype.capitalize) {
  String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };
} else {
  console.error("Can't add a String.capitalize function as it already exists");
}

window.Module = Module;
window.Helpers = Helpers;
