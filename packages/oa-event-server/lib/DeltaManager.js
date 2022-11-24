/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var DeltaManager = (module.exports = function DeltaManager(args) {
  this.ids = {};

  this.outstanding_inserts = [];
  this.outstanding_updates = [];
  this.outstanding_deletes = [];

  if (args && args.ids) {
    for (var position in args.ids) this.addID(args.ids[position]);
  } else {
    logger.debug('NO ids specified for DeltaManager');
  }

  this.session_id = args.session_id;
  this.filter = args.filter;
  this.time_from = args.time_from;
});

DeltaManager.prototype.addID = function (id) {
  // add id to the hash
  this.ids[id] = true;
};

DeltaManager.prototype.delID = function (id) {
  if (this.ids[id] == undefined) {
    logger.warn('can not delete id ' + id + ' as its not on the client');
    return;
  }
  // delete id from the hash
  delete this.ids[id];
};

DeltaManager.prototype.resetID = function () {
  this.ids = [];
};

DeltaManager.prototype.hasID = function (id) {
  if (id == undefined) return false;

  return this.ids[id] != undefined;
};
