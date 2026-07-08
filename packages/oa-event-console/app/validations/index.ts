//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Warning: the Promises returned by Joi.validateAsync() seem to cause issues with one or both of node 8, bluebird
// opt instead to use *_schema.validate()

const {
  users_read_schema,
  user_update_schema,
  user_create_schema,
  user_read_schema,
  user_delete_schema,
  user_reset_password_schema,
} = require('./user');

const { empty_schema } = require('./empty');

const { apikey_schema, apikey_create_schema, apikey_read_schema, apikey_delete_schema } = require('./apikeys');
const { password_requested_schema, password_reset_token_schema, password_reset_schema } = require('./password');
const { rules_agent_name_schema, rules_group_name_schema } = require('./rules');
const { inventory_delete_schema } = require('./inventory');

const { schedule_update_days_schema, schedule_delete_schema } = require('./schedule');

const { git_commit_msg_schema } = require('./import_rules');

module.exports = {
  empty_schema,
  apikeys_read_schema: empty_schema,
  apikey_schema,
  apikey_create_schema,
  apikey_read_schema,
  apikey_delete_schema,

  password_requested_schema,
  password_reset_token_schema,
  password_reset_schema,

  inventory_delete_schema,

  rules_agent_name_schema,
  rules_group_name_schema,

  schedule_delete_schema,
  schedule_update_days_schema,

  users_read_schema,
  user_create_schema,
  user_read_schema,
  user_delete_schema,
  user_update_schema,
  user_reset_password_schema,

  git_commit_msg_schema,
};
