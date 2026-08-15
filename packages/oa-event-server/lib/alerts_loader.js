/*
 * Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:server:alerts_loader');
var logger = logging.logger;
var debug = logging.debug;

var path = require('path');

var Joose = require('joose');
var Class = Joose.Class;
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var OAmonHome = require('./OAmonHome').OAmonHome;
var oamonhome = new OAmonHome();
var AlertOccurences = require('./alert_occurrences').Model;

var ColumnDefinition = Class('ColumnDefinition', {
  has: {
    name: { is: 'rw' },
    alias: { is: 'rw' },
    type: { is: 'rw' },
    display_type: { is: 'rw' },
    label: { is: 'rw' },
    width: { is: 'rw' },
    priority: { is: 'rw' },
    uniq: { is: 'rw', init: false },
    idx: { is: 'rw', init: false },
    default: { is: 'rw' },
  },
  methods: {
    getWidthPX: function () {
      return this.getWidth() + 'px';
    },
    isMandatory: function () {
      return this.getPriority() == 'M';
    },
    toExtModel: function () {
      var o = { name: this.getName() };
      if (this.getType() == 'String') o.type = 'string';
      if (this.getType() == 'Number') o.type = 'int';
      return o;
    },
  },
});

var AlertsLoader = (exports.AlertsLoader = Class('AlertsLoader', {
  has: {
    definitionsFile: { is: 'rw', init: path.join(oamonhome.getServerEtcDir(), '/alertdef') },
    columns: Joose.I.Object,
    allColumnNames: Joose.I.Array,
    mandatoryColumnNames: Joose.I.Array,
  },

  methods: {
    setup: function (cb) {
      var self = this;

      logger.debug('setting up Alerts');

      var definitions = require(this.getDefinitionsFile());
      if (definitions.columns == undefined)
        return cb('alert definitions file [' + this.getDefinitionsFile() + '] is missing an exports.columns = {}');

      /*
       * helper function to detect duplicate definitions
       */
      var add_defn = function (defn) {
        if (self.columns[defn.getName()] != undefined) {
          logger.warn('Duplicate column definition for { name: ' + defn.getName() + ' }');
          return false;
        } else {
          self.columns[defn.getName()] = defn;
          return true;
        }
      };

      /*
       * collect up the mandatory and user configureable column defintitions
       */
      definitions.columns.forEach(function (defn) {
        var coldef = new ColumnDefinition(defn);
        if (add_defn(coldef)) {
          /*
           * store each column name
           */
          self.allColumnNames.push(coldef.getName());

          /*
           * remember the mandatory ones too
           */
          if (coldef.isMandatory()) self.mandatoryColumnNames.push(coldef.getName());
        }
      });

      debug('Mandatory columns', this.mandatoryColumnNames.join(', '));
      debug('All columns', this.allColumnNames.join(', '));
      if (cb) cb(null);
    },

    addColumnDefinitions: function (definitions) {
      var self = this;

      if (!Array.isArray(definitions) || definitions.length === 0) return;

      definitions.forEach(function (defn) {
        var coldef = new ColumnDefinition(defn);
        if (self.columns[coldef.getName()] != undefined) {
          logger.warn('Duplicate column definition for { name: ' + coldef.getName() + ' }');
          return;
        }

        self.columns[coldef.getName()] = coldef;
        self.allColumnNames.push(coldef.getName());
        if (coldef.isMandatory()) self.mandatoryColumnNames.push(coldef.getName());
      });

      debug('Mandatory columns', this.mandatoryColumnNames.join(', '));
      debug('All columns', this.allColumnNames.join(', '));
    },

    migrateColumnDefinitions: function (definitions, cb) {
      var async = require('async');

      if (!Array.isArray(definitions) || definitions.length === 0) return cb(null);

      var alertsCollection = mongoose.connection.collection('alerts');
      var tasks = [];

      definitions.forEach(function (colDef) {
        var fieldName = colDef.name;

        if (colDef.idx || colDef.uniq) {
          tasks.push(function (done) {
            var indexSpec = {};
            indexSpec[fieldName] = 1;
            var indexOpts = colDef.uniq ? { unique: true, sparse: true } : { sparse: true };
            alertsCollection.createIndex(indexSpec, indexOpts, function (err) {
              if (err) logger.warn('Index creation for [' + fieldName + ']: ' + err.message);
              else logger.info('Index ensured for column: ' + fieldName);
              done(null);
            });
          });
        }

        if (colDef.default !== undefined) {
          tasks.push(function (done) {
            var query = {};
            query[fieldName] = { $exists: false };
            var update = { $set: {} };
            update.$set[fieldName] = colDef.default;
            alertsCollection.updateMany(query, update, function (err, result) {
              if (err) logger.warn('Migration backfill for [' + fieldName + ']: ' + err.message);
              else if (result.modifiedCount > 0)
                logger.info('Migrated ' + result.modifiedCount + ' documents for new column: ' + fieldName);
              done(null);
            });
          });
        }
      });

      if (tasks.length === 0) return cb(null);
      async.series(tasks, cb);
    },

    getMandatoryColumns: function () {
      return this.mandatoryColumnNames;
    },
    getAllColumns: function () {
      return this.allColumnNames;
    },
    getColumn: function (column_name) {
      return this.columns[column_name];
    },
    hasColumn: function (column_name) {
      return this.columns[column_name] != undefined;
    },

    constructMongooseSchema: function () {
      // return a Schema defintion suitable for mongoose
      var self = this;
      var schema = {};

      this.allColumnNames.forEach(function (column_name) {
        switch (self.columns[column_name].type) {
          case 'Number':
            schema[column_name] = { type: Number };
            break;
          case 'Date':
            schema[column_name] = { type: Date };
            break;
          case 'Boolean':
            schema[column_name] = { type: Boolean };
            break;
          case 'String':
            schema[column_name] = { type: String, default: '' };
            break;
          default:
            logger.warn('Field definition for [%s] had no type. Defaulting to String', column_name);
            schema[column_name] = { type: String, default: '' };
            break;
        }
        if (self.columns[column_name].default !== undefined) {
          logger.debug('found a default: ' + column_name);
          schema[column_name]['default'] = self.columns[column_name].default;
        }

        if (self.columns[column_name].uniq == true) {
          logger.debug('found a unique index: ' + column_name);
          schema[column_name]['index'] = { unique: true };
        }

        if (self.columns[column_name].idx == true) {
          logger.debug('found an index: ' + column_name);
          schema[column_name]['index'] = true;
        }
      });
      return schema;
    },

    registerAlertsSchema: function (db, cb /* cb( err, schema) */) {
      var moose_schema = this.constructMongooseSchema();
      /*
       * mixin the sub schemas for history and notes
       */

      var history_schema = new Schema({
        timestamp: { type: Date },
        user: { type: String },
        msg: { type: String },
      });
      moose_schema['history'] = [history_schema];

      var notes_schema = new Schema({
        timestamp: { type: Date },
        user: { type: String },
        msg: { type: String },
      });
      moose_schema['notes'] = [notes_schema];

      var global_matches_schema = new Schema(
        {
          name: { type: String },
          uuid: { type: String },
        },
        { _id: false }
      );

      var group_matches_schema = new Schema(
        {
          group_name: { type: String },
          group_uuid: { type: String },
          matches: [{ name: String, uuid: String }],
        },
        { _id: false }
      );

      moose_schema['matches'] = { global: [global_matches_schema], group: [group_matches_schema] };

      var alertSchema = new Schema(moose_schema, { use$SetOnSave: true });
      /*
       * virtual attributes
       */

      alertSchema.virtual('flags').get(function () {
        var flags = '';
        if (this.history && this.history.length > 0) {
          flags += 'H';
        }
        if (this.notes && this.notes.length > 0) {
          flags += 'N';
        }
        if (this.acknowledged && this.acknowledged === true) {
          flags += 'A';
        }
        if (this.owner && this.owner != '') {
          flags += 'U';
        }

        return flags;
      });

      /*
       * instance methods
       */
      alertSchema.method('toClient', function () {
        /*
         * we munge the data that gets sent to the client such that
         * (first|last)_occurrence gets set corrcetly,
         * flags get added and we delete the upserted timestamps
         */
        var lert = this.toObject();
        lert.flags = this.flags;

        delete lert.history;
        delete lert.notes;
        return lert;
      });

      alertSchema.method('toDetails', function () {
        var lert = this.toObject();

        var notes = lert.notes || [];
        var history = lert.history || [];
        var timestamps = lert.upsert_timestamps || [];

        delete lert.upsert_timestamps;
        delete lert.history;
        delete lert.notes;

        var details = [];
        Object.keys(lert).forEach(function (key) {
          details.push({ column: key, value: lert[key] });
        });

        return { details: details, notes: notes, history: history, timestamps: timestamps };
      });

      alertSchema.method('toShellEnv', function () {
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

      /*
       * Hooks
       */

      alertSchema.pre('save', function (next) {
        // upon saving the event store the timestamp in a seperate collection
        var conditions = { identifier: this.identifier };
        var update_with = {
          $push: {
            current: {
              $each: [this.last_occurrence],
              $slice: -1440,
            },
          },
        };
        AlertOccurences.update(conditions, update_with, { upsert: true }, function (err, args) {
          next(err);
        });
      });

      // nice idea.. needs to go into a new collection
      // alertSchema.pre( 'remove', function( next )
      // {
      //   var conditions = { identifier: this.identifier };
      //   AlertOccurences.archive( conditions, next );
      // });

      cb(null, mongoose.model('alerts', alertSchema));
    },
  }, // methods
}));
