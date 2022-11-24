/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var Class = require('joose').Class;

/*
 * AgentRole
 * each agent has properties that originate from the associated ini file
 * and they have an 'eventCB' that gets called with parsed tokens from the monitor
 */

var AgentRole = (exports.Role = Class({
  my: {
    has: {
      properties: { is: 'ro', init: [] },
    },
  },

  has: {
    props: { is: 'ro', required: true },
    eventCB: { is: 'ro', required: true },
  },
}));
