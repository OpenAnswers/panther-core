
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging modules
const {logger, debug} = require('oa-logging')('oa:event:console:zmq');

// oa modules
const {Config}        = require('./config');


// # ### Zmq events

class Zmq {
  static zmq: any;
  static sock: any;

  static initClass() {
    this.zmq = require('zmq');
    this.sock = this.zmq.socket('push');
    this.sock.bindSync(Config.zmq.uri);
  }
  
  static poll_mongo() {
    return this.sock.send('db');
  }
}
Zmq.initClass();



module.exports =
  {Zmq};