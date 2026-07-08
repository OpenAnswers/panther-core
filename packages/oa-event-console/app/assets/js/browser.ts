// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Browser

// Tests browsers for various things
// Trusts javascript before userAgent, can let you know when they are different

class Browser {
  static initClass() {
    this.versions = {
      tested: {
        chrome: 40,
        firefox: 40,
      },
      //      ie: 11

      allowed: {
        chrome: 20,
        firefox: 20,
      },
    };

    // http://stackoverflow.com/a/9851769

    // Opera 8.0+
    this.is_opera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.includes(' OPR/');

    // Firefox 1.0+
    this.is_firefox = typeof InstallTrigger !== 'undefined';

    // At least Safari 3+: "[object HTMLElementConstructor]"
    this.is_safari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;

    // Internet Explorer 11
    this.is_ie_11 = !window.ActiveXObject && Array.from(window).includes('ActiveXObject');

    // IE < 11
    this.is_old_ie = !this.is_ie_11;

    // Internet Explorer 6-11
    this.is_ie = Function.apply(window, ['', 'return /*@cc_on!@*/ false || !!window.document.documentMode;'])();

    // Edge 20+
    this.is_edge = !this.is_ie && !!window.StyleMedia;
    this.isnt_edge = !this.is_edge;

    // Chrome 1+
    this.is_chrome = !!window.chrome && !!window.chrome.webstore;
    this.isnt_chrome = !this.is_chrome;

    // Blink engine detection
    this.is_blink = (this.is_chrome || this.is_opera) && !!window.CSS;
  }
  //      ie: 11

  constructor(options) {
    this.allowed_versions = {};

    this.allowed_versions.chrome = options.chrome_greater_than || 0;
    this.allowed_versions.firefox = options.firefox_greater_than || 0;
  }

  static type() {
    switch (false) {
      case !this.is_opera:
        return 'opera';
      case !this.is_firefox:
        return 'firefox';
      case !this.is_safari:
        return 'safari';
      case !this.is_ie:
        return 'ie';
      case !this.is_edge:
        return 'edge';
      case !this.is_chrome:
        return 'chrome';
      case !this.is_blink:
        return 'blink';
      default:
        return 'unknown';
    }
  }

  // http://stackoverflow.com/a/2401861
  static browser_details() {
    let mobiley;
    const o = {
      bad: false,
      tested: false,
      trusted: false,
      mobiley: false,
      version: undefined,
      messages: [],
      browser_info: this.browser_info(),
    };

    if (this.is_chrome) {
      let chrome_match;
      if (!(chrome_match = navigator.userAgent.match(/Chrome\/(\d+)/))) {
        Message.log("Useragent doesn't match browser", this.browser_info());
        o.messages.push('Chrome version could not be identified');
        o.trusted = false;
      } else {
        o.version = chrome_match[1];
        o.trusted = true;
        if (o.version > this.versions.tested.chrome) {
          o.tested = true;
        } else {
          o.messages.push = 'It looks like you are running an old version of Chrome';
          o.tested = false;
        }
      }
    }

    if (this.is_firefox) {
      let firefox_match;
      if (!(firefox_match = navigator.userAgent.match(/Firefox\/(\d+)/))) {
        Message.log("Useragent doesn't match browser", this.browser_info());
        o.messages.push('Firefox version could not be identified');
        o.trusted = false;
      } else {
        o.trusted = true;
        o.version = firefox_match[1];
        if (o.version > this.versions.tested.firefox) {
          o.tested = true;
        } else {
          o.messages.push('It looks like you are running an old version of Firefox');
          o.version = firefox_match[1];
          o.tested = false;
        }
      }
    }

    if (this.is_ie && !this.is_ie_11) {
      o.bad = true;
      o.messages.push('Please use Chrome, Firefox or upgrade to IE 11');
    }

    if ((mobiley = navigator.userAgent.match(/(Mobile|Android|iPad|iPhone)/))) {
      o.mobiley = true;
      o.mobiley_match = mobiley;
      o.messages.push('It looks like you are on a mobile or touch device');
    }

    return o;
  }

  static browser_info() {
    let o;
    return (o = {
      is_opera: this.is_opera,
      is_firefox: this.is_firefox,
      is_safari: this.is_safari,
      is_ie: this.is_ie,
      is_edge: this.is_edge,
      is_chrome: this.is_chrome,
      is_blink: this.is_blink,
      type: this.type(),
      navigator,
    });
  }

  // This is a generic html5 css property.
  // User something useful to the site
  static outdated() {
    return !this.supports('borderImage');
  }

  // Check if a browser supports a style
  //
  // JAVASCRIPT "Outdated Browser"
  // Version:    1.1.0 - 2014
  // author:     Burocratik
  // website:    http://www.burocratik.com
  // MIT
  static supports() {
    const div = document.createElement('div');
    const vendors = 'Khtml Ms O Moz Webkit'.split(' ');

    return function (prop) {
      if (Array.from(div.style).includes(prop)) {
        return true;
      }

      prop = prop.replace(/^[a-z]/, val => val.toUpperCase());

      for (var vendor of Array.from(vendors)) {
        if (Array.from(div.style).includes(`${vendor}${prop}`)) {
          return true;
        }
      }

      return false;
    };
  }
}
Browser.initClass();

window.Browser = Browser;
