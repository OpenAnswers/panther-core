/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var InventorySchema = new Schema({
  node: { type: String, index: true },
  last_seen: { type: Date },
});

exports.Model = mongoose.model('Inventory', InventorySchema);
exports.Schema = InventorySchema;
