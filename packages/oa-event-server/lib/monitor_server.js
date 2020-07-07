/*
 * Copyright (C) 2015, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require("oa-logging")("oa:event:server:monitor_server");
var logger = logging.logger;
var debug = logging.debug;

// Node modules
var inspect = require("util").inspect;
var EventEmitter = require("events").EventEmitter;
var http = require("http");

var Class = require("joose").Class;
var SocketIO = require("socket.io");
var lodashKeys = require("lodash/keys");
let Joose = require("joose");
let Promise = require("bluebird");
let lodashGet = require("lodash/get");
let lodashHas = require("lodash/has");
let lodashJoin = require("lodash/join");
let lodashFlattenDeep = require("lodash/flattenDeep");
let lodashMap = require("lodash/map");
let lodashSize = require("lodash/size");
let lodashPickBy = require("lodash/pickBy");

let lodashIsFunction = require("lodash/isFunction");

// version
exports.version = require("../package.json").version;

var AlertOccurrences = require("./alert_occurrences").Model;
var AlertMatches = require("./alert_matches").Model;
var RuleMatches = require("./rule_matches").Model;
var Inventory = require("./inventory").Model;

var Errors = require("oa-errors");

var OAmonHome = require("./OAmonHome").OAmonHome;
var oamonhome = new OAmonHome();

var rules = require("oa-event-rules");
var EventRules = rules.EventRules;

var ServerConfig = require("./server_config");
var server_config = new ServerConfig.ServerConfig();

// ## class MonitorServer

exports.MonitorServer = Class("MonitorServer", {
  meta: Joose.Meta.Class,
  isa: EventEmitter,

  has: {
    Alerts: Joose.I.Object,
    endpoint: { is: "rw", init: server_config.DeltaPort() },
    mandatoryColumns: { is: "rw" },
    allowedColumns: { is: "rw" },
    listeningSocket: { is: "rw" },
    serverRules: { is: "rw" },
    serverRulesFile: { is: "rw", init: server_config.RulesFile() },
    serverRulesTracking: { is: "rw", init: server_config.RulesTracking() }
  },

  methods: {
    start: function(cb) {
      var self = this;

      try {
        this.setServerRules(
          new EventRules({
            server: true,
            path: this.getServerRulesFile(),
            reload_cb: function(event, path) {
              logger.info("Rules have been reloaded", path);
            }
          })
        );
        logger.info("Server Rules loaded from yaml");
      } catch (err) {
        let message = "Failed to load rules:\n" + err;
        logger.error(message);
        if (cb) cb(err);
        process.exit(1); // eslint-disable-line no-process-exit
      }

      var sock_options = {
        logger: {
          debug: function(msg) {
            logger.debug(msg);
          },
          info: function(msg) {
            logger.info(msg);
          },
          warn: function(msg) {
            logger.warn(msg);
          },
          error: function(msg) {
            logger.error(msg);
          }
        }
      };

      var port = self.getEndpoint();

      logger.debug("Socket.IO going to listen on " + port);
      if (typeof port != "number") throw new Error("sockio_port not a number");

      // Setup a web server for socketio to listen on
      var http_srv = http.Server(function(req, res) {
        res.writeHead(404);
        res.end();
      });

      http_srv.listen(port);

      http_srv.on("listen", function(err) {
        if (err) throw err;
        logger.info("SocketIO web server listening on port [" + port + "]");
      });

      // Attach socketio to the web server
      var sock = SocketIO.listen(http_srv, sock_options);

      // save the master listening socket
      this.setListeningSocket(sock);

      // When a new event is recieved handle it within this class
      self.on("newevent", function(ev, cb) {
        try {
          logger.silly("newevent in", ev, "");
          self.newevent(ev, cb);
        } catch (err) {
          logger.error("Error in newevent [%s]", err.message, err.stack);
          if (cb) cb(err);
        }
      });

      // Get ready to receive events from monitors
      sock.sockets.on("connection", function(accepted_socket) {
        self.startReceivingAlerts(accepted_socket);
        self.startHandshake(accepted_socket);
      });

      sock.sockets.on("disconnect", function(accepted_socket) {
        logger.warn("monitor client disconnected");
      });

      sock.sockets.on("ping", function(accepted_socket) {
        debug("monitor client ping:", accepted_socket);
      });

      if (cb) cb(null);
    },

    newevent: function(ev, cb) {
      debug("got newevent", ev);

      if (ev.mode === undefined) return logger.error("new event recieved without a valid mode value");

      if (ev.mode === "insert") this.insertevent(ev, cb);
      else if (ev.mode === "inserts") this.insertevents(ev, cb);
      else logger.warn("unhandled event recieved: " + ev.mode);
    },

    // update counter of rules uuid usage
    promisedRuleMatches: function(processed_event) {
      // get the uuids of each applied rule
      let matchedRules = this.flattenMatches(processed_event);

      // upsert function
      const f = (uuid) => {
        let query = { rule_uuid: uuid };
        let update = { $set: { rule_uuid: uuid }, $inc: { tally: 1 } };
        return RuleMatches.update(query, update, { upsert: true });
      };

      // build array of promises
      let matchedPromises = lodashMap(matchedRules, f);

      return Promise.all(matchedPromises);
    },

    promisedAlertMatches: function(processed_event) {
      let fields = processed_event.copy;
      let flattened = this.flattenMatches(processed_event);
      let query = { identifier: fields.identifier };
      let options = { upsert: true, new: true };
      let tnow = new Date();

      debug("Tracking: " + fields.identifier + " matches " + flattened);

      return AlertMatches.update(
        query,
        {
          identifier: fields.identifier,
          rule_uuids: flattened,
          updated_at: tnow
        },
        options
      );
    },

    promisedUpdateInventory: function(node) {
      debug("updating inventory for ", node);
      let t = new Date();
      return Inventory.update({ node: node }, { $set: { last_seen: t } }, { upsert: true });
    },

    // ###### insertevent( event, callback )*
    // Insert one event into the database
    insertevent: function(ev, cb) {
      var self = this;
      debug("insertevent");
      if (!lodashIsFunction(cb)) throw new Error("cb not fn");

      if (ev.fields === undefined) {
        var error = new Errors.ValidationError("Insert object is missing the fields property");
        if (cb) cb(error);
        return logger.error(error);
      }

      // Rules process event
      // ev.input needs to be added to the monitor->server interface
      // if you want to access `input.` on the server

      // update and rules tracking data
      let tracking = self.getServerRulesTracking();
      debug(
        "Event entering rules processing tracking=",
        tracking,
        lodashKeys(ev.fields).join(","),
        ev.fields.identifier
      );

      var processed_event = self.getServerRules().run(ev.fields, { tracking_matches: tracking });
      debug("Event after rules processing", tracking, processed_event);

      /*
            // Check the event is ok
            if( processed_event.get('identifier') === undefined ) {
              let error = new Errors.ValidationError('Event is missing an identifier')
              error.event = ev.fields;
              error.processed_event = processed_event.copy;
              if( cb ) cb(error);
              return logger.error( error, ev.fields, '');
            }

      */

      // all recieved events update inventory and occurrences
      let allPromises = {
        inventory: self.promisedUpdateInventory(processed_event.get("node")),
        occurences: self.promisedUpdateOccurences(processed_event)
      };

      // track rules usage when enabled
      if (tracking) {
        allPromises.tracking = self.promisedRuleMatches(processed_event);
        allPromises.matches = self.promisedAlertMatches(processed_event);
      }

      // discard event if rules marked it such
      if (!processed_event.discarded()) {
        allPromises.alert = self.promisedUpsertAlert(processed_event);
      }

      Promise.props(allPromises)
        .then((promiseResults) => {
          // strip hidden properties
          let simplifiedNewEvent = lodashPickBy(processed_event.copy, (value, key) => {
            return !key.match(/^_/);
          });

          if (promiseResults.alert) {
            let identifier = processed_event.get("identifier");

            if (lodashGet(promiseResults, "alert.nModified") == 0) {
              return cb(null, {
                message: "Saved new event: " + identifier,
                state: "inserted",
                event: simplifiedNewEvent
              });
            } else {
              return cb(null, { message: "Updated event: " + identifier, state: "updated" });
            }
          } else {
            logger.info(
              "Event dropped. id[%s]",
              processed_event.get("identifier"),
              processed_event.get("_pre_identifier"),
              lodashJoin(self.flattenMatches(processed_event))
            );

            var response = { message: "Event discarded", state: "dropped", event: simplifiedNewEvent };
            return cb(response);
          }
        })
        .catch((e) => {
          logger.error("UpsertAlert ", e);
          return cb(e);
        });
    },

    promisedUpsertAlert: function(processed_event) {
      let fields = processed_event.copy;
      let time_now = new Date();

      // flesh out a full alert
      let lert = new Alerts(fields).toJSON();

      let query = { identifier: fields.identifier };
      let update = this.update_with(fields);

      let operation = {
        $set: update.$set,
        $inc: update.$inc,
        $setOnInsert: lert
      };
      let options = { upsert: true };

      // summary included in $set, duplicating would error so remove it
      delete operation.$setOnInsert.summary;
      delete operation.$setOnInsert.last_occurrence;
      operation.$setOnInsert.first_occurrence = time_now;

      if (lodashSize(processed_event.matches.global) > 0 || lodashSize(processed_event.matches.group) > 0) {
        operation.$setOnInsert.matches = processed_event.matches;
      }

      return this.Alerts.update(query, operation, options)
        .exec()
        .catch((e) => {
          // catch duplicate key and attempt update
          if (e && e.code === 11000) {
            logger.info("E11000 caught and updated ", query, update);
            return this.Alerts.findAndModify(query, [], update);
          } else {
            return e;
          }
        });
    },

    // Inserts a batch of events to the database
    insertevents: function(evs, cb) {
      var self = this;
      if (evs.alerts === undefined) {
        if (cb) cb("alerts not present");
        return logger.error("alerts not present");
      }
      evs.alerts.forEach(function(ev) {
        self.insertevent(ev);
      });
      // Do some async cb stuff so we can return a cb with
      // all success or those failed
    },

    increment_tally_by: function(fields) {
      /*
       * work out a number to increment the tally by
       */
      var increment_by = 1;
      if (fields.tally) {
        var parsed_tally = parseInt(fields.tally);
        if (parsed_tally != "NaN" && parsed_tally > 0) increment_by = parsed_tally;
      }
      return increment_by;
    },

    update_with: function(fields) {
      // Allow the newly arrived event to set the following fields
      var self = this;
      var time_now = new Date();
      return {
        $set: {
          state_change: time_now,
          last_occurrence: fields.last_occurrence || time_now,
          alert_key: fields.alert_key || "",
          summary: fields.summary || ""
        },
        // newly arrived event also increments the tally
        $inc: { tally: self.increment_tally_by(fields) }
      };
    },

    // extract the uuid strings into an array
    flattenMatches: function(processed_event) {
      if (!lodashHas(processed_event, "matches")) {
        return [];
      }

      let global_matches = lodashGet(processed_event, "matches.global", []);
      let global_uuids = lodashMap(global_matches, "uuid");

      let group_matches = lodashGet(processed_event, "matches.group", []);
      let group_uuids = lodashMap(group_matches, (value, key) => {
        let group_uuid = [value.group_uuid];
        let match_uuids = lodashMap(value.matches, "uuid");
        return [group_uuid, match_uuids];
      });

      return lodashFlattenDeep([global_uuids, group_uuids]);
    },

    promisedUpdateOccurences: function(processed_event) {
      let fields = processed_event.copy;
      let options = { upsert: true, new: true };

      let update_with = this.update_with(fields);

      // upsert the occurrences
      return AlertOccurrences.update(
        { identifier: fields.identifier },
        {
          $push: {
            current: {
              $each: [update_with["$set"].last_occurrence],
              $slice: -1440
            }
          },
          $set: { updated_at: update_with["$set"].last_occurrence }
        },
        options
      );
    },

    promisedUpdateAlert: function(processed_event, socket_cb) {
      if (!lodashIsFunction(socket_cb)) {
        throw new Error("invalid arg");
      }
      let fields = processed_event.copy;
      let options = { upsert: true, new: true };

      let query = { identifier: fields.identifier };
      let update_with = this.update_with(fields);

      let promiseFindAndModify = this.Alerts.collection.findAndModify(query, [], update_with, options);
      let promiseUpdateOccurences = this.promisedUpdateOccurences(processed_event);

      // default promised operations
      let promisesToRun = [promiseFindAndModify, promiseUpdateOccurences];

      // optionally track rules
      if (this.getServerRulesTracking()) {
        let flattened = this.flattenMatches(processed_event);

        debug("Tracking: " + fields.identifier + " matches " + flattened);

        let promiseUpdateMatches = AlertMatches.update(
          query,
          { identifier: fields.identifier, rule_uuids: flattened },
          options
        );
        promisesToRun.push(promiseUpdateMatches.exec());
      }
      //Promise.all( [promiseFindAndModify, promiseUpdateOccurences, promiseUpdateMatches ])

      // run all the promises
      Promise.all(promisesToRun)
        .then((results) => {
          return socket_cb(null, {
            message: "Updated alert: " + fields.identifier,
            state: "updated"
          });
        })
        .catch((err) => {
          logger.error(err);
          socket_cb(err);
        });
    },

    insert_new_event: function(processed_event, socket_cb) {
      var self = this;
      var fields = processed_event.copy;
      var time_now = new Date();
      var new_fields = fields;
      new_fields.state_change = time_now;
      new_fields.tally = this.increment_tally_by(fields);

      if (!fields.first_occurrence) new_fields.first_occurrence = time_now;
      if (!fields.last_occurrence) new_fields.last_occurrence = time_now;

      // attach "nicer" matches the the event
      if (lodashSize(processed_event.matches) > 0) {
        new_fields["matches"] = processed_event.matches;
      }

      var new_lert = new self.Alerts(new_fields);
      new_lert.save(function(err) {
        logger.debug("Attempting to save new alert: " + new_fields.identifier);
        /*
         * was the alert already found in the database?
         * this can happen when there is a high insert rate
         * This can also happen when there is a unique index
         * on a normally null field
         */
        if (err && err.code === 11000) {
          // duplicate key
          logger.warn("Dupe err.code 11000" + err);
          self.promisedUpdateAlert(processed_event, socket_cb);
        } else if (err) {
          if (socket_cb) socket_cb(err);
          logger.error("Error saving new alert", err);
        } else {
          debug("Saved new alert", new_lert);
          logger.info("Saved new event", new_lert.identifier);
          if (socket_cb)
            socket_cb(null, {
              message: "Saved new event: " + new_lert.identifier,
              event: new_lert,
              state: "inserted"
            });
          // The model already does this
          // var update_query = { identifier: new_fields.identifier };
          // var updateoccur_with = { $push: { current: new_fields.last_occurrence } };
          // AlertOccurrences.update( update_query, updateoccur_with, function( up_err ){
          //   if( up_err ) logger.error( up_err );
          // });
        }
      });
    },

    startReceivingAlerts: function(accepted_socket) {
      var self = this;

      var validated_identifiers = [];

      accepted_socket.on("insert_events", function(events, recv_cb) {
        events.forEach(function(ev) {
          self.validate_event(ev, function(err) {
            if (!err) {
              self.emit("newevent", { mode: "insert", fields: ev }, recv_cb);
              validated_identifiers.push(ev.identifier);
            }
          });
        });
        //if( recv_cb ) recv_cb( validated_identifiers );
        validated_identifiers = [];
      });

      accepted_socket.on("insert_event", function(ev, recv_cb) {
        if (!lodashIsFunction(recv_cb)) {
          recv_cb = function(data) {
            debug("NO CB for insert_event", data);
          };
        }
        logger.debug("Identifier: " + ev.identifier || "unknown");
        self.validate_event(ev, function(err) {
          if (!err) {
            self.emit("newevent", { mode: "insert", fields: ev }, recv_cb);
            validated_identifiers.push(ev.identifier);
          }
        });
        //if( recv_cb ) recv_cb( validated_identifiers );
        validated_identifiers = [];
      });
    },
    startHandshake: function(accepted_socket) {
      logger.debug("starting handshake...");

      var profile = {
        columns: {
          all: this.getAllowedColumns(),
          mandatory: this.getMandatoryColumns()
        },
        severities: [] // FIXME
      };
      debug("sending greetings: " + inspect(profile));

      accepted_socket.emit("greetings", { profile: profile }, function(data) {
        debug("greetings response data: " + inspect(data));
      });
    },
    validate_event: function(ev, cb) {
      var missing_columns = [];
      var ret = null;
      this.getMandatoryColumns().forEach(function(column) {
        if (ev[column] == undefined) missing_columns.push(column);
      });

      if (missing_columns.length > 0) {
        var msg = "";
        if (ev.identifier) msg += "identifier [" + ev.identifier + "] ";
        msg += "missing mandatory columns [" + missing_columns.join(", ") + "]";
        logger.error(msg);
        ret = new Errors.ValidationError(msg);
      }

      cb(ret);
    }
  }
});
