// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
class DomErrorBase extends Error {
  static initClass() {
    this.prototype.name = 'DomErrorBase';
  }
  constructor(message, options) {
    super(message);
    options ??= {};
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, DomErrorBase);
    }

    // An optional friendly user error message
    this.friendly = options.friendly;

    // A dom element for bootstrap error classes to use
    this.$element = options.$element;

    // A code, just in case
    this.code = options.code;

    this.name = this.constructor.prototype.name;
  }

  to_string() {
    return `${this.friendly || this.message}`;
  }

  // relies on the helpers, escapeHTML on the prototype
  to_html() {
    return `<div class=\"${this.name}\">${(this.friendly || this.message).escapeHTML()}</div>`;
  }

  highlight_elements() {
    throw new Error('implement highlight_elements');
  }

  // Error.prototype sets `message` as a non-enumerable own property, so the
  // default JSON.stringify(err) drops it. See oa-errors/src/errors.ts for the
  // full explanation — same fix applied here so socket.io ack payloads and any
  // other JSON boundary preserve name, message, friendly, code, etc.
  toJSON() {
    const json: any = { name: this.name, message: this.message };
    for (const key of Object.keys(this)) {
      if (key !== 'name' && key !== 'message') {
        json[key] = (this as any)[key];
      }
    }
    return json;
  }
}
DomErrorBase.initClass();

class DomError extends DomErrorBase {
  static initClass() {
    this.prototype.name = 'DomError';
    this.prototype.type = 'error';
    this.prototype.label = 'Error';
  }

  highlight_elements() {
    if (this.$element) {
      return this.$element.addClass('has-error');
    }
  }
}
DomError.initClass();

class DomWarning extends DomErrorBase {
  static initClass() {
    this.prototype.name = 'DomWarning';
    this.prototype.type = 'warning';
    this.prototype.label = 'Warning';
  }

  highlight_elements() {
    if (this.$element) {
      return this.$element.addClass('has-warning');
    }
  }
}
DomWarning.initClass();

class DomErrorSet {
  static initClass() {
    this.logger = debug('oa:event:errors');
  }

  constructor(options) {
    options ??= {};
    ({
      label: this.label,
      default_message: this.default_message,
      default_$element: this.default_$element,
      default_friendly: this.default_friendly,
    } = options);
    this.errors = [];
    this.warnings = [];
    this.defaults();
    this.logger = this.constructor.logger;
  }

  add_error(error) {
    this.logger('adding error', error);
    return this.errors.push(error);
  }

  add_warning(warning) {
    this.logger('adding warning', warning);
    return this.warnings.push(warning);
  }

  add_new_error(message, options) {
    const o = _.defaults({}, options, this.default_obj);
    const err = new DomError(message, options);
    return this.add_error(err);
  }

  add_new_warning(message, options) {
    const o = _.defaults({}, options, this.default_obj);
    const warn = new DomWarning(message, options);
    return this.add_warning(warn);
  }

  ok() {
    return this.errors.length === 0;
  }

  all_errors() {
    return this.errors;
  }

  all_warnings() {
    return this.warnings;
  }

  to_html() {
    this.logger('errors [%s] warnings [%s]', this.errors.length, this.warnings.length);
    let out = this.warnings.map(warning => warning.to_html());
    out = out.concat(this.errors.map(error => error.to_html()));
    return out.join('');
  }

  to_string() {
    this.logger('errors [%s] warnings [%s]', this.errors.length, this.warnings.length);
    let out = this.warnings.map(warning => warnings.to_string());
    out = out.concat(this.errors.map(error => error.to_string()));
    this.logger(out);
    return out.join('\n');
  }

  throw() {
    const error = new DomError(this.to_string());
    error.domerrors = this;
    throw error;
  }

  check_throw() {
    if (this.errors.length > 0) {
      const error = new DomError(this.to_string());
      error.domerrors = this;
      throw error;
    }
  }

  defaults() {
    const o = {};
    if (this.default_message) {
      o.message = this.default_message;
    }
    if (this.default_friendly) {
      o.friendly = this.default_friendly;
    }
    if (this.default_$element) {
      o.$element = this.default_$element;
    }
    return (this.default_obj = o);
  }
}
DomErrorSet.initClass();

window.DomErrorBase = DomErrorBase;
window.DomError = DomError;
window.DomWarning = DomWarning;
window.DomErrorSet = DomErrorSet;
