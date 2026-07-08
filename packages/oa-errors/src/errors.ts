// @ts-nocheck

//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// ## Error

// This containers all the standard error sub classes we use.

// All classes are exported on @ (this) so that both Node and Front end can
// use the classes once the file has been included.

// ValidationError is the most used, It probably needs subclassing itself.

// ### CommonJS-only guard
//
// Classes below are exported via `this.X = X` at module top level. That only
// works under CommonJS, where `this === module.exports`. If this file is ever
// emitted as an ES module, `this` is `undefined` and every export line below
// becomes a silent failure (TypeError on the first one, or no-op if under a
// looser runtime). Fail loudly here with a clear message instead — when a
// future migration flips `"module": "ESNext"` or `"type": "module"`, the
// breakage will point at this line rather than manifesting as mysterious
// "Errors.ValidationError is not a constructor" at call sites.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'oa-errors/errors.ts requires a CommonJS module context. ' +
      'Top-level `this.X = X` exports are no-ops under ESM — rewrite them as ' +
      '`export { X }` before changing the module type.'
  );
}

// ### SocketError
// Errors that occur on socketio itself
class SocketError extends Error {
  static initClass() {
    this.prototype.name = 'SocketError';
  }
  constructor(message, options) {
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SocketError);
    }
    this.name = 'SocketError';
  }
}
SocketError.initClass();
this.SocketError = SocketError;

// ### SocketMsgError
// Error that occur on the messages to/form socketio clients
class SocketMsgError extends Error {
  static initClass() {
    this.prototype.name = 'SocketMsgError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SocketMsgError);
    }
    this.name = 'SocketMsgError';
  }
}
SocketMsgError.initClass();
this.SocketMsgError = SocketMsgError;

// ### QueryError
// For any problems with the result of a db/data query
// Mongoose/Mongodb query errors should be wrapped into this class when thrown.
class QueryError extends Error {
  static initClass() {
    this.prototype.name = 'QueryError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryError);
    }
    this.name = 'QueryError';
    if (!options) {
      return;
    }
    if (options.code != null) {
      this.code = options.code;
    }
    if (options.field != null) {
      this.field = options.field;
    }
    if (options.value != null) {
      this.value = options.value;
    }
    if (options.query != null) {
      this.query = options.query;
    }
    if (options.status != null) {
      this.status = options.status;
    }
    if (options.simple != null) {
      this.simple = options.simple;
    }
  }
}
QueryError.initClass();
this.QueryError = QueryError;

class NotFoundError extends Error {
  static initClass() {
    this.prototype.name = 'NotFoundError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
    this.name = 'NotFoundError';
    this.status = 404;
    if (!options) {
      return;
    }
    // A custom code for the error
    if (options.code != null) {
      this.code = options.code;
    }
    // The field that was in error
    if (options.field != null) {
      this.field = options.field;
    }
    // The value that was in error
    if (options.value != null) {
      this.value = options.value;
    }
    // in case this is a http request
    if (options.status != null) {
      this.status = options.status;
    }
    if (options.simple != null) {
      this.simple = options.simple;
    }
  }
}
NotFoundError.initClass();
this.NotFoundError = NotFoundError;

// ### ValidationError

// Any client based data validation error should be thrown with this.

class ValidationError extends Error {
  static initClass() {
    this.prototype.name = 'ValidationError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
    this.name = 'ValidationError';
    if (!options) {
      return;
    }
    // A custom type for the error
    if (options.type != null) {
      this.type = options.type;
    }
    // A custom code for the error
    if (options.code != null) {
      this.code = options.code;
    }
    // The field that was in error
    if (options.field != null) {
      this.field = options.field;
    }
    // The value that was in error
    if (options.value != null) {
      this.value = options.value;
    }
    // The format required for this field
    if (options.format != null) {
      this.format = options.format;
    }
    // css id/selector for the field/value in question
    if (options.id != null) {
      this.id = options.id;
    }
    // in case this is a http request
    if (options.status != null) {
      this.status = options.status;
    }
    if (options.simple != null) {
      this.simple = options.simple;
    }
  }
}
ValidationError.initClass();

// Export it
this.ValidationError = ValidationError;

// ### RequestError

class RequestError extends Error {
  static initClass() {
    this.prototype.name = 'RequestError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RequestError);
    }
    for (var key in options) {
      var value = options[key];
      this[key] = value;
    }
    this.name = 'RequestError';
  }
}
RequestError.initClass();

this.RequestError = RequestError;

// ### BadRequestError

// Error from passport-local-mongoose
// Reuse for other requesty type things

class BadRequestError extends Error {
  static initClass() {
    this.prototype.name = 'BadRequestError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BadRequestError);
    }
    this.name = 'BadRequestError';
    if (!options) {
      return;
    }
    if (options.simple != null) {
      this.simple = options.simple;
    }
  }
}
BadRequestError.initClass();

// Export
this.BadRequestError = BadRequestError;

// ### NotImplementedError

// For base class methods that should be inherited.

class NotImplementedError extends Error {
  static initClass() {
    this.prototype.name = 'NotImplementedError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotImplementedError);
    }
    this.name = 'NotImplementedError';
  }
}
NotImplementedError.initClass();
// Export
this.NotImplementedError = NotImplementedError;

// ### CertificateError

// Any client based error when sending emails, which is not really important

class CertificateError extends Error {
  static initClass() {
    this.prototype.name = 'CertificateError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CertificateError);
    }
  }
}
CertificateError.initClass();
//Export
this.CertificateError = CertificateError;

// ### EmailError

// Any client based error when sending emails, which is not really important

class EmailError extends Error {
  static initClass() {
    this.prototype.name = 'EmailError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    for (var key in options) {
      var value = options[key];
      this[key] = value;
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailError);
    }
    this.name = 'EmailError';
  }
}
EmailError.initClass();
this.EmailError = EmailError;

// ### HttpErrors for express

class HttpError extends Error {
  static initClass() {
    this.prototype.name = 'HttpError';
  }
  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
    this.name = 'HttpError';
    this.code = options.code;
    this.status = this.code;
  }
}
HttpError.initClass();
// Export
this.HttpError = HttpError;

// The HTTP error classes should be able to built from a config
//codes = [
//400: { message: "Bad Request" }
//401: { message: "Authorization failed" }
//404: { message: "Not found" }
//500: { message: "Server Error" }
//]
//for code,info of codes
//create HttpError#{code}

let Cls = (this.HttpError404 = class HttpError404 extends this.HttpError {
  static initClass() {
    this.prototype.name = 'HttpError404';
  }
  constructor(detail, options) {
    if (options == null) {
      options = {};
    }
    let message = 'Not Found';
    if (detail) {
      message += ` ${detail}`;
    }
    super(message, options);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError404);
    }
    this.detail = detail;
    this.code = 404;
    this.status = this.code;
    if (options != null ? options.simple : undefined) {
      this.simple = options.simple;
    }
  }
});
Cls.initClass();

Cls = this.HttpError400 = class HttpError400 extends this.HttpError {
  static initClass() {
    this.prototype.name = 'HttpError400';
  }
  constructor(detail, options) {
    if (options == null) {
      options = {};
    }
    let message = 'Bad Request';
    if (detail) {
      message += ` ${detail}`;
    }
    super(message, options);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError400);
    }
    this.detail = detail;
    this.code = 400;
    this.status = this.code;
    if (options != null ? options.simple : undefined) {
      this.simple = options.simple;
    }
  }
};
Cls.initClass();

Cls = this.HttpError401 = class HttpError401 extends this.HttpError {
  static initClass() {
    this.prototype.name = 'HttpError401';
  }
  constructor(detail, options) {
    if (options == null) {
      options = {};
    }
    let message = 'Unauthorised';
    if (detail) {
      message += ` ${detail}`;
    }
    super(message, options);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError401);
    }
    this.detail = detail;
    this.code = 401;
    this.status = this.code;
    if (options != null ? options.simple : undefined) {
      this.simple = options.simple;
    }
  }
};
Cls.initClass();

Cls = this.HttpError500 = class HttpError500 extends this.HttpError {
  static initClass() {
    this.prototype.name = 'HttpError500';
  }
  constructor(detail, options) {
    if (options == null) {
      options = {};
    }
    let message = 'Server Error';
    if (detail) {
      message += ` ${detail}`;
    }
    super(message, options);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError500);
    }
    this.detail = detail;
    this.code = 500;
    this.status = this.code;
    if (options != null ? options.simple : undefined) {
      this.simple = options.simple;
    }
  }
};
Cls.initClass();

class ErrorGroup extends Error {
  static initClass() {
    this.prototype.name = 'ErrorGroup';
  }

  constructor(message, options) {
    if (options == null) {
      options = {};
    }
    super(message);
    this.options = options;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorGroup);
    }
    this.name = 'ErrorGroup';
    this.message = `${message}`;
    this.errors = [];
    this.default_type = Error;
  }

  count() {
    return this.errors.length;
  }

  add(error) {
    this.errors.push(error);
    return (this.message += `: ${error.message}`);
  }

  add_new(error_type, message, options) {
    let error_cls;
    if (options == null) {
      options = {};
    }
    if (error_type instanceof Error) {
      error_cls = error_type;
    } else {
      error_cls = ErrorType.lookup(error_type);
      if (!error_cls) {
        error_cls = this.default_type;
      }
    }
    return this.add(new error_cls(message, options));
  }

  throw_if_errors() {
    if (this.errors.length > 0) {
      throw this;
    }
  }
}
ErrorGroup.initClass();

this.ErrorGroup = ErrorGroup;

var ValidationGroup = (function () {
  let default_type = undefined;
  ValidationGroup = class ValidationGroup extends ErrorGroup {
    static initClass() {
      this.prototype.name = 'ValidationGroup';
      default_type = ValidationError;
    }
    constructor(message, options) {
      if (options == null) {
        options = {};
      }
      super(message, options);
      this.name = 'ValidationGroup';
      this.default_type = ValidationError;
    }
  };
  ValidationGroup.initClass();
  return ValidationGroup;
})();

this.ValidationGroup = ValidationGroup;

// ## toJSON

// Error.prototype sets `message` as a non-enumerable own property (per the ES
// spec), so the default JSON.stringify(err) yields `{}`/`{"name":"..."}` — the
// message is dropped. Socket.IO uses JSON.stringify for ack payloads, which
// means a thrown ValidationError arrives at the browser without its message
// and the UI renders `[object Object]`.
//
// Attach a toJSON() to each of our error classes so name, message, and any
// enumerable own properties (code, field, value, status, etc.) all survive the
// wire. JSON.stringify honours toJSON() if present.
function errorToJSON(this: any) {
  const json: any = { name: this.name, message: this.message };
  for (const key of Object.keys(this)) {
    if (key !== 'name' && key !== 'message') {
      json[key] = this[key];
    }
  }
  return json;
}

[
  SocketError,
  SocketMsgError,
  QueryError,
  NotFoundError,
  ValidationError,
  RequestError,
  BadRequestError,
  NotImplementedError,
  CertificateError,
  EmailError,
  HttpError,
  this.HttpError404,
  this.HttpError400,
  this.HttpError401,
  this.HttpError500,
  ErrorGroup,
  ValidationGroup,
].forEach(cls => {
  cls.prototype.toJSON = errorToJSON;
});

// ## ErrorType

// When errors are serialised to JSON they become plain objects but retain
// the error metadata. This coverts them back to the real errors.

class ErrorType {
  static initClass() {
    // We need a lookup to the local exported classes in ErrorType

    this.types = {
      SocketError: SocketError,
      Socket: SocketError,
      SocketMsgError: SocketMsgError,
      SocketMsg: SocketMsgError,
      HttpError: HttpError,
      Http: HttpError,
      ValidationError: ValidationError,
      Validation: ValidationError,
      RequestError: RequestError,
      Request: RequestError,
      BadRequestError: BadRequestError,
      BadRequest: BadRequestError,
      NotFoundError: NotFoundError,
      NotFound: NotFoundError,
      QueryError: QueryError,
      Query: QueryError,

      ErrorGroup: ErrorGroup,
      ValidationGroup: ValidationGroup,
    };
  }

  // Error type lookup from String
  static lookup(name) {
    return this.types[name];
  }

  // Json serialises errors as plain objects.
  // Convert them back so things like bluebird
  // can use them without complaining
  static from_object(error_var) {
    // Our new error
    let error = null;

    // Check if we have serialised error
    if (typeof error_var === 'object' && error_var.message !== undefined) {
      // Check if we have a known error type
      let customer_error_type;
      if ((customer_error_type = this.lookup(error_var.name))) {
        error = new customer_error_type(error_var.message);
      } else {
        error = new Error(error_var.message);
      }

      // Attach any other properties
      for (var key in error_var) {
        var value = error_var[key];
        error[key] = value;
      }

      // Generate something if the json doesn't look like an error
    } else {
      error = new Error(error_var);
    }

    return error;
  }
}
ErrorType.initClass();

this.ErrorType = ErrorType;
