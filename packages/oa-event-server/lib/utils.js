/*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */
var Role = require("joose").Role;
var path = require("path");

var Activated = (exports.Activated = Role({
  has: {
    activated: { is: "rw", init: true }
  },
  methods: {
    activate: function() {
      this.setActivated(true);
    },
    deactivate: function() {
      this.setActivated(false);
    }
  }
}));

var Filepath = (exports.Filepath = Role({
  has: {
    filepath: { is: "rw" }
  },
  methods: {
    filename: function() {
      return path.basename(this.getFilepath());
    },
    dirname: function() {
      return path.dirname(this.getFilepath());
    }
  }
}));
