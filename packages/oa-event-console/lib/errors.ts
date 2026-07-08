
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// ## Error

// This is where all the custom errors live.

// We also hold a generic error thrower that does things the way the
// app expects.

// Logging module
let Helpers;
const { logger, debug}  = require('oa-logging')('oa:event:error');

// oa modules
const Errors = require('oa-errors');


Errors.Helpers = (Helpers = class Helpers {

  static throw_socket( type, socket, msg, data ){
    data ??= '';
    throw new type(Helpers.socket_error(type, socket, msg, data));
  }

  static socket_error( type, socket, msg, data ){
    data ??= '';
    socket.emit('message', {
      error: type.name,
      message: msg
    }
    );
    Helpers.generic_error(type, `Socket ${socket.id}: ${msg}`, data);
    return `${type.name} ${socket.id} ${msg} ${data}`;
  }

  static throw_generic( type, msg, data ){
    data ??= '';
    throw new type(Helpers.generic_error(type, msg, data));
  }

  static generic_error( type, msg, data ){
    data ??= '';
    logger.error('%s: %s %j', type.name, msg, data);
    return `${type.name} ${msg} ${data}`;
  }
});


module.exports = Errors;


// Exit on a something not handled in a promise
process.on('unhandledRejection', function( err ){
  logger.error(err);
  throw err;
});