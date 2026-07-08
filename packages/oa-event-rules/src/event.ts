// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:event');

// oa modules
const { _, throw_error, format_string } = require('oa-helpers');

const farmHash = require('farmhash');

// ## Event

// the Event object is what is passed around the
// rules for processing. It holds the original event
// and the modified copy.

// The object provides
//  - Helper functions for accessing copy/original properties
//  - Stop processing flag
//  - Discard flag
//  - log of actions

const Cls = (this.Event = class Event {
  static initClass() {
    this.create_from = this.generate;

    // `.stop_processing` alias
    this.prototype.stop = this.prototype.stop_processing;

    this.prototype.unstop = this.prototype.unstop_processing;

    // `.stop_processing_rule_set` alias
    this.prototype.stop_rule_set = this.prototype.stop_processing_rule_set;

    this.prototype.unstop_rule_set = this.prototype.unstop_processing_rule_set;
  }

  // Copy and modify the object for rule processing
  // deprecated!
  static copy_and_fluff(event_obj) {
    debug('copying and fluffing event', event_obj);

    // Quick deep clone
    const event_cp = JSON.parse(JSON.stringify(event_obj));

    // Add some internal action tracking
    //event_cp.__actions = [] unless event_cp.__actions?

    // Force __discard so we don't have to check for it
    //event_cp.__discard = false unless event_cp.__discard?

    // Force __exit so we don't have to check for it
    //event_cp.__exit = false unless event_cp.__exit?

    debug('new copied event - event_cp', event_cp);
    return event_cp;
  }

  // Shortcut to create a new Event from an object
  static generate(original_event) {
    if (original_event == null) {
      throw_error('create requires an event');
    }
    const ev = new Event();
    ev.set_event(original_event);
    ev.set_input_object(original_event);
    return ev;
  }

  // Not using the full object yet as I'm not sure
  // the overhead in access is worth anything over
  // straight js object access
  constructor(original) {
    this.copy = this.defaults();
    this.original = {};
    this.input = {};
    this.matches = { global: [], group: [] };
    this._current_matches = []; // used to temporarily track matches
    this.tracking_matches = false;
    this.actions = [];
    this.discard_id = false;
    this.stop_id = false;
    this.stop_rule_set_id = false;
    this.default_identifier = '{node}:{severity}:{summary}';
    this._match = null;
    if (original) {
      this.set_event(original);
    }
  }

  defaults() {
    const now = new Date();
    return {
      history: [],
      notes: [],
      acknowledged: false,
      state_change: now,
      last_occurrence: now,
      first_occurrence: now,
    };
  }

  // Set the original and copy events for this object
  set_event(event_obj) {
    this.original = event_obj;
    return (this.copy = Event.copy_and_fluff(this.original));
  }

  // Get a field from the input event this was built from
  get_input(field) {
    const got = _.get(this.input, field);
    return got;
  }

  // Set a field in the input event
  set_input(field, value) {
    return (this.input[field] = value);
  }

  // Set the input object to this
  set_input_object(object) {
    return (this.input = JSON.parse(JSON.stringify(object)));
  }

  // Get a field from the input event this was built from
  input_to_copy(input) {
    if (input == null) {
      ({ input } = this);
    }
    debug('putting input onto copy');
    return (() => {
      const result = [];
      for (var name in this.input) {
        var value = this.input[name];
        debug(' putting name [%o], value [%o]', name, value);
        result.push((this.copy[name] = JSON.parse(JSON.stringify(value))));
      }
      return result;
    })();
  }

  // Get a field from the original event
  get_original(field) {
    return _.get(this.original, field);
  }

  // Get tracking state
  get_tracking() {
    return this.tracking_matches;
  }

  set_tracking(tracking) {
    return (this.tracking_matches = tracking != null ? tracking : { true: false });
  }

  // Get a field from the modified copy
  get(field) {
    const got = _.get(this.copy, field);
    return got;
  }

  // Set a field in the modified copy
  set(field, value) {
    return (this.copy[field] = value);
  }

  // Get a field from any prefixed location
  get_any(field) {
    debug('get_any field:[%o]', field);

    const value = (() => {
      let field_name;
      if (field.indexOf('input.') === 0) {
        field_name = field.replace('input.', '');
        return this.get_input(field_name);
      } else if (field.indexOf('syslog.') === 0) {
        field_name = field.replace('syslog.', '');
        return this.get_input(field_name);
      } else if (field.indexOf('original.') === 0) {
        field_name = field.replace('original.', '');
        return this.get_original(field_name);
      } else {
        return this.get(field);
      }
    })();
    debug('get_any value:[%o]', value);
    return value;
  }

  // Field exists in the modified copy
  exists(field) {
    return _.has(this.copy, field);
  }

  // Set the flag/id to discard this event
  discard(id) {
    if (id == null) {
      id = true;
    }
    if (!id) {
      throw_error('discard id must be truthey');
    }
    return (this.discard_id = id);
  }

  // Have we been discarded?
  discarded() {
    return !!this.discard_id;
  }

  // Set the flag/id to stop processing
  stop_processing(id) {
    if (id == null) {
      id = true;
    }
    if (!id) {
      throw_error('stop id must be truthey');
    }
    return (this.stop_id = id);
  }

  // (un)Set the flag/id to re-start processing
  unstop_processing(id) {
    if (id == null) {
      id = true;
    }
    return (this.stop_id = !id);
  }

  // Should we stop processing?
  stopped() {
    return !!this.stop_id;
  }

  // Set the flag/id to stop processing this rule set
  stop_processing_rule_set(id) {
    if (id == null) {
      id = true;
    }
    if (!id) {
      throw_error('stop id must be truthey');
    }
    return (this.stop_rule_set_id = id);
  }

  // (un)Set the flag/id to re-start processing of a rule set
  unstop_processing_rule_set(id) {
    if (id == null) {
      id = true;
    }
    if (!id) {
      throw_error('unstop id must be truthey');
    }
    return (this.stop_rule_set_id = !id);
  }

  // Should we stop processing?
  stopped_rule_set() {
    return !!this.stop_rule_set_id;
  }

  // Get a match results
  // Selects can return a regex match results
  // following actions can use $1 or $2
  match(match) {
    if (match != null) {
      this._match = match;
      debug('setting match data', this._match);
    }
    return this._match;
  }

  // return just the matchgroups, if they exist
  match_groups(match) {
    if ((this._match != null ? this._match.length : undefined) > 1) {
      return this._match.slice(1);
    } else {
      return [];
    }
  }

  toString() {
    return `${this.copy.summary}`;
  }

  // Interpolate the event variables into the identifier {string}
  new_identifer() {
    let event_id = this.get('identifier');
    debug('rules new_identifier1: ', event_id);
    if (!event_id) {
      event_id = this.get_input('identifier');
    }
    debug('rules new_identifier2: ', event_id);
    if (!event_id) {
      event_id = this.default_identifier;
    }
    const new_identifier = format_string(event_id, this.copy);
    debug('rules new_identifier3: ', new_identifier);
    return String(farmHash.fingerprint64(new_identifier));
  }

  // Interpolate the variables into the identifier {string}
  populate_identifier() {
    const identifier = this.new_identifer();
    debug('setting identifier [%s] to [%s]', identifier, this.copy.identifier, this.input.identifier);
    return this.set('identifier', identifier);
  }

  // Interpolate the variables into the identifier {string}
  populate_pre_identifier() {
    const identifier = this.new_identifer();
    debug('setting pre identifier [%s] to [%s]', identifier, this.copy.identifier, this.input.identifier);
    return this.set('_pre_identifier', identifier);
  }

  // Add a history entry to the event, mainly for rule processing
  history(message, user, date) {
    if (user == null) {
      user = 'rules';
    }
    if (date == null) {
      date = 'now';
    }
    if (date === 'now') {
      date = new Date();
    }
    return this.copy.history.push({
      timestamp: date,
      user,
      message,
    });
  }
  // Add a rule selection id to the event
  // TODO: needs to be dynamically switched on/off

  add_matched(mod) {
    if (this.get_tracking()) {
      this._current_matches.push(mod);
    } else {
      debug('not tracking', mod);
    }
    return true;
  }

  close_matched_global() {
    if (this.get_tracking() && this._current_matches.length >= 1) {
      this.matches.global = _.clone(this._current_matches);
      this._current_matches = [];
    }
    return true;
  }

  close_matched_group(group_name, group_uuid) {
    if (this.get_tracking()) {
      this.matches.group.push({ group_name, group_uuid, matches: _.clone(this._current_matches) });
      this._current_matches = [];
    }
    return true;
  }

  // This syslog stuff probably needs to move elsewhere

  has_structured_data() {
    return !!this.input.structuredData;
  }

  // Flatten the structuredData object
  process_syslog_structured() {
    return (() => {
      const result = [];
      for (var id in this.input.structuredData) {
        var data = this.input.structuredData[id];
        this.input.message_id = id;
        result.push((this.input.structuredData = data));
      }
      return result;
    })();
  }
});
Cls.initClass();
