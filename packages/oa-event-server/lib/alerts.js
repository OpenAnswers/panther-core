/*
  * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
  * All rights reserved.  
  * This file is subject to the terms and conditions defined in the Software License Agreement.
  */

const logging = require("oa-logging")("oa:event:server:alerts");
var logger = logging.logger;

var mongoose = require("mongoose");
var Schema = mongoose.Schema;

AlertDefinitions = require("./alertdefinition").Model;

var loader = (exports.loader = function(options, cb) {
  AlertDefinitions.find({}, function(err, rows) {
    if (err) return cb(err);
    if (rows.length < 1) return cb(err);

    var historySchema = new Schema({
      timestamp: { type: Date },
      user: { type: String },
      msg: { type: String }
    });

    var notesSchema = new Schema({
      timestamp: { type: Date },
      user: { type: String },
      msg: { type: String }
    });

    var ruleMatchesSchema = new Schema({
      //      action: { type: String },
      uuid: { type: String }
    });

    var definitions = new Object();
    var cast_hash = {
      _severity: { type: Number },
      history: [historySchema],
      notes: [notesSchema],
      matches: [ruleMatchesSchema],
      upsert_timestamps: [Number],
      sequence_numbers: [Number]
    };

    rows.forEach(function(row) {
      if (definitions[row.column] != undefined)
        logger.error("Multiple rows found in alertdefinitions for column [" + row.column + "]");

      definitions[row.column] = { type: row.type, priority: row.priority, label: row.label, width: row.width };

      switch (row.type) {
        case "Number":
          cast_hash[row.column] = { type: Number };
          break;
        case "Date":
          cast_hash[row.column] = { type: Date };
          break;
        case "String":
        default:
          cast_hash[row.column] = { type: String, default: "" };
          break;
      }

      if (row.column.match(/[a-z]+_occurrence/))
        if (row.type != "Number") logger.warn(row.column + " is not of type Number");
    });

    var alertSchema = new Schema(cast_hash, { use$SetOnSave: true });

    alertSchema.pre("save", function(next) {
      this.state_change = new Date();
      // set last_occurrenceif not already defined
      if (!this.last_occurrence) {
        if (this.upsert_timestamps && this.upsert_timestamps.length > 0) {
          this.last_occurrence = this.upsert_timestamps[this.upsert_timestamps.length - 1];
        }
      }
      next();
    });

    alertSchema.virtual("flags").get(function() {
      var flags = "";
      if (this.history && this.history.length > 0) {
        flags += "H";
      }
      if (this.notes && this.notes.length > 0) {
        flags += "N";
      }
      if (this.acknowledged && this.acknowledged === true) {
        flags += "A";
      }
      if (this.owner && this.owner != "") {
        flags += "U";
      }

      return flags;
    });

    /*
     * created_at is derived from the MongoDB default key _id,
     * see http://www.mongodb.org/display/DOCS/Object+IDs
     * the first 8 chars of _id are the timestamp ar creation,
     * to the second.
     *
     * it *should* match with first_occurrence if you remove 
     * the milliseconds which are also encoded into first_occurrence
     */
    alertSchema.virtual("created_at").get(function() {
      var _id = "" + this._id;
      var date = new Date(parseInt(_id.slice(0, 8), 16));
      return date;
    });

    alertSchema.method("toClient", function() {
      /*
       * we munge the data that gets sent to the client such that
       * (first|last)_occurrence gets set corrcetly,
       * flags get added and we delete the upserted timestamps
       */
      var lert = this.toObject();
      lert.first_occurrence = this.upsert_timestamps[0];
      lert.last_occurrence = this.upsert_timestamps[lert.upsert_timestamps.length - 1];
      lert.flags = this.flags;
      lert.serial = this.serial;
      if (!lert.severity) lert.severity = lert._severity;

      //lert.id = parseInt( lert._id, 16 ).toFixed();
      delete lert.sequence_numbers;
      delete lert.upsert_timestamps;
      delete lert.history;
      delete lert.notes;

      return lert;
    });

    alertSchema.method("toDetails", function() {
      var lert = this.toObject();

      var notes = lert.notes || [];
      var history = lert.history || [];
      var timestamps = lert.upsert_timestamps || [];

      delete lert.upsert_timestamps;
      delete lert.history;
      delete lert.notes;

      var details = [];
      Object.keys(lert).forEach(function(key) {
        details.push({ column: key, value: lert[key] });
      });

      return { details: details, notes: notes, history: history, timestamps: timestamps };
    });

    alertSchema.method("toShellEnv", function() {
      var lert = this.toObject();
      /*
       * when running via ExternalCommands we have the ability to select the columns we
       * are interested in, consequently some columns may not exist in the result set
       * so we need to ensure they exist before munging anything
       */
      if (this.upsert_timestamps) {
        lert.first_occurrence = this.upsert_timestamps[0];
        lert.last_occurrence = this.upsert_timestamps[lert.upsert_timestamps.length - 1];

        delete lert.upsert_timestamps;
      }
      lert.flags = this.flags;
      lert.serial = this.serial;
      if (!lert.severity) lert.severity = lert._severity;
      if (lert.history) delete lert.history;

      return lert;
    });

    cb(null, mongoose.model("alerts", alertSchema));
  });
});
