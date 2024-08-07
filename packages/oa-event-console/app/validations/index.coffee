# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# Warning: the Promises returned by Joi.validateAsync() seem to cause issues with one or both of node 8, bluebird
# opt instead to use *_schema.validate() 

{users_read_schema, user_update_schema, user_create_schema, user_read_schema, user_delete_schema, user_reset_password_schema} = require './user'

{empty_schema} = require './empty'

{apikey_schema, apikey_create_schema, apikey_read_schema, apikey_delete_schema} = require './apikeys'
{password_requested_schema, password_reset_token_schema, password_reset_schema} = require './password'
{rules_agent_name_schema, rules_group_name_schema} = require './rules'
{inventory_delete_schema} = require './inventory'

{schedule_update_days_schema, schedule_delete_schema} = require './schedule'

{git_commit_msg_schema} = require './import_rules'

module.exports =
    empty_schema: empty_schema
    apikeys_read_schema: empty_schema
    apikey_schema: apikey_schema
    apikey_create_schema: apikey_create_schema
    apikey_read_schema: apikey_read_schema
    apikey_delete_schema: apikey_delete_schema

    password_requested_schema: password_requested_schema
    password_reset_token_schema: password_reset_token_schema
    password_reset_schema: password_reset_schema

    inventory_delete_schema: inventory_delete_schema

    rules_agent_name_schema: rules_agent_name_schema
    rules_group_name_schema: rules_group_name_schema

    schedule_delete_schema: schedule_delete_schema
    schedule_update_days_schema: schedule_update_days_schema

    users_read_schema: users_read_schema
    user_create_schema: user_create_schema
    user_read_schema: user_read_schema
    user_delete_schema: user_delete_schema
    user_update_schema: user_update_schema
    user_reset_password_schema: user_reset_password_schema

    git_commit_msg_schema: git_commit_msg_schema