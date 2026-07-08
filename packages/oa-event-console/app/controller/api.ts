//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

//  Logging module
const { logger, debug } = require('oa-logging')('oa:event:controller:api');

// oa modules
const { Action, Select, Option } = require('oa-event-rules');
const { Field } = require('../../lib/field');

// Get the config so we can report on our ruleset
// oa-config?
const config = require('../../lib/config').get_instance();

class Api {
  static get: any;
  static get_id: any;

  static initClass() {
    // Getter for the plain http calls
    this.get = (name, req, res, next) => {
      debug('api get name', name);

      if (this[name] == null) {
        return res.status(404).json({
          name: 'error',
          code: '404',
          message: `No ${name}`,
        });
      }

      return res.send(this[name]());
    };

    // Getter for the http by id calls
    this.get_id = (name, req, res, next) => {
      debug('api get name id', name);

      // not there, could do this upfront or in param middleware
      if (this[name] == null) {
        return res.status(404).json({
          name: 'error',
          code: '404',
          message: `No ${name}`,
        });
      }

      const obj = this[name](req.params.id);

      // somethings wrong
      if (obj == null || obj.data == null) {
        return res.status(404).json({
          name: 'error',
          message: `Not found: ${name} ${req.params.id}`,
        });
      }

      return res.send(obj);
    };
  }

  static actions() {
    return {
      name: 'actions',
      data: Action.types_list(),
    };
  }

  static actions_obj() {
    return {
      name: 'actions_obj',
      data: Action.types_description,
    };
  }

  static action(id) {
    debug('api get action', id);
    const action_list = Action.types_description[id];
    if (action_list == null) {
      return undefined;
    }
    return {
      name: 'action',
      id,
      data: action_list,
    };
  }

  static selects() {
    return {
      name: 'selects',
      data: Select.types_list(),
    };
  }

  static selects_obj() {
    return {
      name: 'selects_obj',
      data: Select.types_description,
    };
  }

  static select(id) {
    const select_list = Select.types_description[id];
    if (select_list == null) {
      return undefined;
    }
    return {
      name: 'select',
      id,
      data: Select.types_description[id],
    };
  }

  static options() {
    return {
      name: 'options',
      data: Option.types_list(),
    };
  }

  static options_obj() {
    return {
      name: 'options_obj',
      data: Option.types_description,
    };
  }

  static option(id) {
    const option_list = Option.types_description[id];
    if (option_list == null) {
      return undefined;
    }
    return {
      name: 'option',
      id,
      data: Option.types_description[id],
    };
  }

  static fields() {
    return {
      name: 'fields',
      data: Field.list(),
    };
  }

  static fields_obj() {
    return {
      name: 'fields_obj',
      data: Field.definition,
    };
  }

  static field(id) {
    return {
      name: 'field',
      id,
      data: Field.definition[id],
    };
  }

  static groups() {
    return {
      name: 'groups',
      data: config.rules.server.groups.names(),
    };
  }

  static group(id) {
    return { name: 'groups' };
  }

  static global() {
    return {
      name: 'global',
      data: config.rules.server.globals,
    };
  }
}
Api.initClass();

module.exports.Api = Api;

// not implemented
// CHANGEME
//  @rules: ->
//    name: 'rules'
//    data: Rule.list()
//
//  @rule: (id) ->
//    logger.debug "blah"
//
//    name: 'rule'
//    data: Rule.definitions id
