// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

//  Logging module
const { logger, debug } = require('oa-logging')('oa:event:rules:groups');

// oa modules
const { Group } = require('./group');
const { _ } = require('oa-helpers');
const Errors = require('oa-errors');

const { validate_server_groups_section, joi_error_summary } = require('./validations');

// Groups holds a set of groups to match against
// 1 layer of the rule checking
class Groups {
  static validate(yaml_def, schedule_names) {
    if (schedule_names == null) {
      schedule_names = [];
    }
    const { error, value } = validate_server_groups_section(yaml_def, schedule_names);
    if (error) {
      const messages = joi_error_summary(error);
      for (var message of Array.from(messages)) {
        logger.error('Validation Groups: ', message);
      }
      throw new Errors.ValidationError('Groups');
    }
    return value;
  }

  static generate(yaml_def) {
    let info;
    const groups = new Groups();

    // enabling validation requires a schedule_names[]
    const validated_groups = this.validate(yaml_def, []);

    // Create all the groups
    for (var group in yaml_def) {
      info = yaml_def[group];
      if (group !== '_order') {
        debug('generating rules for group', group);
        groups.add(Group.generate(group, info));
      }
    }

    // Deal with store_order, if it's there
    if (yaml_def._order) {
      if (!_.isArray(yaml_def._order)) {
        throw new Errors.ValidationError('Group store_order must be an array');
      }

      groups.store_order = _.clone(yaml_def._order);
      // Acquire all the Group name keys
      let rule_group_name_keys = _.keys(yaml_def);
      // and remove the special _order
      rule_group_name_keys = _.without(rule_group_name_keys, '_order');
      // keys is now all the group names we have

      // Validate that all entries in `_order: [...]` have a corresponding Group entry

      //
      // Apply fixups to the rules...
      //
      // 1. find and remove any keys from _order that do not have an identically named group
      const extra = _.difference(yaml_def._order, rule_group_name_keys);
      if (extra.length > 0) {
        logger.warn(
          'Group store_order [%s] has extra group keys [%s] ' +
            ' compared to the group keys [%s]' +
            ' Removing missing groups from store_order',
          groups.store_order.join(', '),
          extra.join(','),
          rule_group_name_keys
        );

        groups.store_order = _.without(groups.store_order, ...Array.from(extra));
        logger.info('Store order is now [%s]', groups.store_order.join(', '));
      }

      // 2. any group names that are missing from _order are appended to _order
      const missing = _.difference(rule_group_name_keys, yaml_def._order);
      if (missing.length > 0) {
        logger.warn(
          'Group store_order [%s] is missing keys [%s].' +
            ' compared to the group keys [%s]' +
            ' Appending missing groups to the end of _order',
          groups.store_order.join(', '),
          missing.join(','),
          rule_group_name_keys
        );
        groups.store_order.push(...Array.from(missing || []));
        logger.info('Store order is now [%s]', groups.store_order.join(', '));
      }
    }

    return groups;
  }

  constructor(options) {
    this.store = {};
    this.store_order = [];
    if (options != null ? options.groups : undefined) {
      for (var group of Array.from(options.groups)) {
        add(group);
      }
    }
  }

  add(group) {
    if (group.name === '_order') {
      throw new Errors.ValidationError(`Group can't use the name _order [${group.name}]`);
    }
    if (this.store[group.name]) {
      throw new Errors.ValidationError(`Group already exists [${group.name}]`);
    }
    if (this.store_order.indexOf(group.name) > -1) {
      throw new Errors.ValidationError(`Group half exists!? [${group.name}] [${this.store_order}]`);
    }
    this.store[group.name] = group;
    debug('order add', group.name, this.store_order);
    return this.store_order.push(group.name); //unless _.indexOf(@store_order, group.name)
  }

  get(group) {
    return this.store[group];
  }

  del(group) {
    const idx = this.store_order.indexOf(group);
    const grp = this.get(group);
    if (!grp) {
      throw new Errors.ValidationError(`Group isn't in the store [${group}] [${_.keys(this.store).join(',')}]`);
    }
    if (idx === -1) {
      throw new Errors.ValidationError(`Group isn't in the order array [${group}] [${this.store_order.join(',')}]`);
    }
    delete this.store[group];
    this.store_order.splice(idx, 1);
    debug('after delete', _.keys(this.store, this.store_order));
    return true;
  }

  count() {
    return _.keys(this.store).length;
  }

  names() {
    return this.store_order;
  }

  // Take a group, move it in the hash
  // Move it in the order array
  // Change it's internal name
  update_group_name(previous_name, new_name) {
    if (!this.store[previous_name]) {
      throw new Errors.ValidationError(`Group doesn't exist in store [${previous_name}]`);
    }
    if (this.store[new_name]) {
      throw new Errors.ValidationError(`Group name already exists store [${new_name}]`);
    }
    const idx = this.store_order.indexOf(previous_name);
    if (idx === -1) {
      throw new Errors.ValidationError(`No name in \`store_order\` [${previous_name}] [${this.store_order}]`);
    }
    this.store[new_name] = this.store[previous_name];
    this.store[new_name].name = new_name;
    this.store_order[idx] = new_name;
    delete this.store[previous_name];
    return this.store[new_name];
  }

  // ###### move( index, new_index )
  // Move a group from it's current location to a new one
  move(oldPos, newPos) {
    if (oldPos < 0 || oldPos >= this.store_order.length) {
      debug(`oldPos = ${oldPos} length=${this.store_order.length}`);
      throw new Errors.ValidationError('Incorrect store position');
    }
    if (newPos < 0 || newPos >= this.store_order.length) {
      debug(`newPos = ${newPos} length=${this.store_order.length}`);
      throw new Errors.ValidationError('Incorrect store position');
    }

    const groupToMove = this.store_order[oldPos];
    this.store_order.splice(oldPos, 1);
    return this.store_order.splice(newPos, 0, groupToMove);
  }

  event_rules(parent) {
    this._event_rules = parent;
    return Array.from(this.store_order).map(group => this.store[group].event_rules(parent));
  }

  run(event_obj) {
    return (() => {
      const result = [];
      for (var group of Array.from(this.store_order)) {
        this.store[group].run(event_obj);
        if (event_obj.stopped()) {
          debug('stopping all rules from ', group.uuid);
          break;
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  find(id) {
    let r = [];
    for (var group of Array.from(this.store_order)) {
      r = this.store[group].find(id);
    }
    return _.flatten(r);
  }

  has_group(group) {
    return this.store[group] || false;
  }

  // Convert the groups to yaml
  to_yaml_obj(options) {
    if (options == null) {
      options = {};
    }
    const obj = {};
    obj._order = _.clone(this.store_order);
    for (var group of Array.from(this.store_order)) {
      if (!this.store[group]) {
        throw new Error(`Missing group [${group}]`);
      }
      obj[group] = this.store[group].to_yaml_obj();
    }
    return obj;
  }
}

class PrimaryGroups extends Groups {}

class SecondaryGroups extends Groups {}

module.exports = {
  Groups,
  PrimaryGroups,
  SecondaryGroups,
};
