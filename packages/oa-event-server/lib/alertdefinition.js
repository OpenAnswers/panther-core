/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AlertDefinitionSchema = new Schema({
  column: { type: String },
  column_alias: { type: String },
  priority: { type: String },
  display_type: {
    type: String,
    get: function (dt) {
      return dt || this.type;
    },
  },
  type: { type: String },
  label: { type: String },
  width: { type: String },
})

  .pre('save', function (next) {
    if (!this.display_type) this.display_type = this.type;

    next();
  })

  .static('getDefaultLayout', function (fn) {
    this.find({}, { column: 1, width: 1 }, function (err, rows) {
      var a = [];
      for (var i = 0; i < rows.length; i++) {
        a.push({ field: rows[i].column, width: rows[i].width });
      }
      fn(a);
    });
  })

  .static('getMandatoryColumns', function (cb) {
    this.find({ priority: 'M' }, { column: 1 }, function (err, rows) {
      if (err) return cb(err);
      var mandatory_columns = rows.map(function (row) {
        return row.column;
      });

      cb(null, mandatory_columns);
    });
  })

  .static('getAllowedColumns', function (cb) {
    this.find({}, { column: 1 }, function (err, rows) {
      if (err) return cb(err);
      var allowed_columns = rows.map(function (row) {
        return row.column;
      });

      cb(null, allowed_columns);
    });
  });

AlertDefinitionSchema.statics.toExtModelFields = function (cb) {
  this.find({}, { column: 1, type: 1, display_type: 1 }, function (err, rows) {
    if (err) return cb(err);
    var ret_rows = rows.map(function (row) {
      var o = { name: row.column };
      if (row.type == 'String') o.type = 'string';
      if (row.type == 'Number') {
        if (row.display_type == 'Date') o.type = 'date';
        else o.type = 'int';
      }

      return o;
    });
    cb(null, ret_rows);
  });
};

exports.Model = mongoose.model('AlertDefinition', AlertDefinitionSchema);
exports.Schema = AlertDefinitionSchema;
