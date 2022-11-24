/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var Joose = require('joose');
var Class = Joose.Class;
var EventEmitter = require('events').EventEmitter;

exports.IpcBus = Class('IpcBus', {
  meta: Joose.Meta.Class,
  isa: EventEmitter,

  has: {
    name: { is: 'ro', init: 'default' },
  },
});

exports.internal_bus = new exports.IpcBus({ name: 'internal' });
