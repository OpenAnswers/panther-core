// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # OA Logging

// Provide a winston based logger and a debug instance with a commont tag
// A RequstLogger is also attached for express apps
//
//     { logger, debug } = require('oa-logging')('oa:module:class')
//
// or javascript
//
//     var ref = require('oa-logging')('oa:module:class')
//     var logger = ref.logger
//     var debug  = ref.debug

// #### Modules

const debug = require('debug')('oa:logging');
const winston = require('winston');
const { ensure_array, random_string, _ } = require('oa-helpers');

// ### Default Logger Options

// Create a single default winston logger instance that is the parent of
// all the class tagged EventLoggers

// This means you can't do thing like send some classes to particular
// files (unless there's something in winston to direct on tags)

const default_console_options = {
  // Default the level to info
  level: 'info',
  // Give it colours
  colorize: true,
  // Include timestamps
  timestamp: true,
  // Don't use the winston exception handler as things go a bit wierd
  handleExceptions: false,
};

// Create the logger with the transport set to the console, using the above options
const default_transports = [new winston.transports.Console(default_console_options)];

const default_logger = new winston.Logger({
  transports: default_transports,
});

// Tell someone that we have setup the logger
debug('logger setup');
default_logger.debug('logger setup');

// The default formmater is not in use.. but could be used to set a default format different to
// what winston ships with
const default_formatter = function (options) {
  options.timestamp();
  options.level.toUpperCase();
  options.message || '';
  return JSON.stringify(options.meta != null);
};

// ## EventLogger

// Create our own winston instance that lets us log
// a metadata "tag" on top of a single winston logger instance.
// Notional child loggers, all using the one parent transport or
// set of transports. Helps for tracking where the loggin is coming
// from.

// Idea based on https://github.com/citrix-research/node-winston-context

//     evl_a = new EventLogger winston_logger, 'my-special-name'
//     evl_a.info 'data'
//
//     => info: data logger=my-special-name

// All EventLoggers will have metadata `{ logger: @name }` attached
// You can attach extra if needed:

//     evl_b = new EventLogger winston_logger, 'my-blarg-name', { id = 'brap' }
//     evl_b.warn 'data'
//
//     => warn: data logger=my-sblarg-name id=brap

// You can create child loggers that will have attach extra data to the
// `logger` meta data. So you could attach a logger with the socketid to a
// socketio client, then all requests would be logged with that session id.

//     evl_c = new EventLogger evl_a, 'extra-name'
//     evl_c.error 'oh no'
//
//     => error oh no logger=[ my-special-name, extra-name ]

class EventLogger {
  // ###### `EventLogger.generate()`
  // Build a new event logger from a name
  static generate(name, logger) {
    if (logger == null) {
      logger = default_logger;
    }
    return new EventLogger(default_logger, name);
  }

  // ###### `new EventLogger( Logger, name, metadata )`
  constructor(parent, name, metadata) {
    // `parent` is the winston logger instance
    // `name` is the name for this logger, appended to all log entries
    // `metadata` is any additional metadata you want logger with this instance

    this.parent = parent;
    this.name = name;
    if (metadata == null) {
      metadata = {};
    }
    this.metadata = metadata;
    debug('EventLogger constructor', this.name, this.metadata);

    // Set the metadata for the logger, merging the parents metadata if needed
    if (this.parent.metadata != null) {
      this.merge_parent_metadata();
    } else {
      this.metadata.logger = this.name;
    }

    // `head` is the first parent logger, the grandaddy
    // There's only one real winston logger instance at the top.
    // Everything else is just a metadata variant
    this.head = this.parent.head != null ? this.parent.head : this.parent;

    // Attach the different `level` helper functions to our instance
    this.build_methods();

    debug('EventLogger @metadata is ', this.name, this.metadata);
  }

  // ###### `.merge_parent_metadata`
  // Not sure an array is the best way to structure the data for
  // child loggers for think like querying the data later (using a transport that
  // store the fields. I can't think of a better way to nest the children loggers ??
  merge_parent_metadata() {
    _.defaults(this.metadata, this.parent.metadata);
    this.metadata.logger = ensure_array(this.metadata.logger);
    return this.metadata.logger.push(this.name);
  }

  // ###### `EventLogger.build_method( EventLogger, level )`
  // Creates a dynamic `level` method for the new logger
  // during instance construction
  static build_method(self, level) {
    return function (...args) {
      const method = level;
      const log_args = [level, ...Array.from(args)];
      return self.log.apply(self, log_args);
    };
  }

  // ###### `.build_methods( levels )`
  // Builds all the winston log level functions on our EventLogger
  build_methods(levels) {
    debug('building methods', _.keys(this.head.levels));
    return Array.from(_.keys(this.head.levels)).map(level => (this[level] = EventLogger.build_method(this, level)));
  }

  // Add an error id producing error logger `error_id`
  // it attaches or adds `error_id` metadata
  error_id(...args) {
    const error_id = random_string(8);
    const last_arg = _.last(args);
    if (_.isObject(last_arg)) {
      if (!last_arg.error_id) {
        last_arg.error_id = error_id;
      }
    } else {
      args.push({ error_id });
    }

    this.error(...Array.from(args || []));

    // give the called the id, note this will kill
    // winstons possible chaining as we are not returning `this`
    return error_id;
  }

  // ###### `.log( level, message, args... )`

  // Main proxy function to Winston `log`
  // Does all the arg processing winstons `.log` does
  // We merge our instance metadata in here
  log(level, msg, ...args) {
    //debug 'log called with', level, msg, args...

    // Do what the winston `.log` does with args...
    let metadata;
    while (typeof _.last(args) === 'null') {
      args.pop();
    }

    const callback = typeof _.last(args) === 'function' ? args.pop() : null;

    // Now we can get at the metadata, to append our loggers metadata
    // I don't know why winston used this setup. If you ever log an object
    // last, it doesn't do what you expect!
    metadata = (() => {
      if (typeof _.last(args) === 'object') {
        metadata = _.clone(args.pop());
        _.assign(metadata, this.metadata);
        return metadata;
      } else {
        return this.metadata;
      }
    })();

    // And then pass it all on to the real winston log function
    debug('log calling winston log with', level, ':', msg, ':', ...Array.from(args), ':', metadata);
    return this.head.log(level, msg, ...Array.from(args), metadata, callback);
  }

  // ###### `set_level( log_level, transport_name )`
  // Set the log level for all, or a named transport
  set_level(level, transport = null) {
    return (() => {
      const result = [];
      for (var key in this.head.transports) {
        var val = this.head.transports[key];
        if (!transport || transport === key) {
          val.level = level;
          result.push(debug('set transport to level', key, level));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}

// ## EventLoggerMeta
// Logger instance with extra metadata
// So you don't need to add a name to log some extra metadata
// reqularly

// For things like the client session or socket ID that is always
// logged for that client
class EventLoggerMeta {
  constructor(parent, metadata) {
    this.parent = parent;
    if (metadata == null) {
      metadata = {};
    }
    this.metadata = metadata;
  }
}
// not sure yet. probably reproduce most of EventLogger :/

// ## RequestLogger

// A simple express/socketio logger, generating combined log format(ish)
// Unforunately it logs at the start of the request otherwise the middleware
// doesn't fire. It needs some way to attach at the start and callback once
// the request is finished.

class RequestLogger {
  // ###### `RequestLogger.combined( logger )`

  // Generate an instance with an EventLogger  `logger` attached
  static combined(logger) {
    debug('generate logger is', logger);
    logger.info('creating a request logger');
    return function (req, res, next) {
      debug('log_combined', logger);
      return RequestLogger.log_combined(logger, req, res, next);
    };
  }

  // ###### `RequestLogger.log_combined ( logger, req, res, next )`

  // This is the basic middleware to log. It can't be used directly by express
  // as it needs a logger passed to it as well.
  static log_combined(logger, req, res, next) {
    req.date = new Date();
    const req_ip = req.ip || req._remoteAddress || (req.connection && req.connection.remoteAddress) || '-';
    const req_auth = req.user ? req.user : '-';
    const http_version = `${req.httpVersionMajor}.${req.httpVersionMinor}`;
    const url = req.originalUrl || req.url;
    const status = res.statusCode ? `${res.statusCode}` : '-';
    const content_length = res['content-length'] || '-';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '-';

    // Try to be a combined log
    logger.info(
      'request-http %s %s [%s] "%s %s HTTP/%s" %s %s "%s" "%s"',
      req_ip,
      req_auth,
      req.date.toISOString(),
      req.method,
      url,
      http_version,
      status,
      content_length,
      referrer,
      req.headers['user-agent']
    );

    return next();
  }

  // ###### `RequestLogger.log_socket_combined( EventLogger, socket, route )`

  // Fits into the combined format as best as possible. Will need some tweaking
  // To include some extra details.
  static log_socket_combined(logger, socket, route) {
    const ip = socket.conn.remoteAddress || '-';
    const loguser = socket.client.request.user.username || '-';
    const referer = socket.handshake.headers['referer'] || '-';
    const user_agent = socket.handshake.headers['user-agent'];
    return logger.info(
      'request-socketio %s %s/%s [%s] "%s%s WS" - - "%s" "%s"',
      ip,
      socket.id,
      loguser,
      new Date().toISOString(),
      socket.nsp.name,
      route,
      referer,
      user_agent
    );
  }

  constructor(logger, options) {
    this.logger = logger;
    this.options = options;
  }

  log_socket_combined(socket, route) {
    return this.constructor.log_socket_combined(this.logger, socket, route);
  }

  log_combined(req, res, next) {
    return this.constructor.log_combined(this.logger, req, res, next);
  }
}

// ### Export via a function

// Provide a function so a `name` can be passed in at `require` time.
// This will be the `debug` and `logger` name that comes out with each log line
//
//     { logger, debug } = require('oa-logging')('oa:module:class')
//
// or javascript
//
//     var ref = require('oa-logging')('oa:module:class')
//     var logger = ref.logger
//     var debug  = ref.debug
//

module.exports = function (name, options) {
  // If we were given a logger name, setup debug and logger
  let debug_named, logger_named;
  if (options == null) {
    options = {};
  }
  if (name != null) {
    const head_logger = options.logger || default_logger;
    logger_named = new EventLogger(head_logger, name);
    debug_named = require('debug')(name);

    // Test helpers, so we don't log all over the tests
    if (process.env.NODE_ENV === 'test' || process.env.NODE_TEST) {
      logger_named.set_level('warn');
      debug('test env, defaulting to warn level logging');
    } else {
      debug('not test env, leaving log level alone');
    }
  } else {
    const logger_tag = null;
    const debug_tag = null;
  }

  return {
    debug: debug_named,
    logger: logger_named,
    EventLogger,
    default_logger,
    RequestLogger,
  };
};
