# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{ logger, debug } = require('oa-logging')('oa:validations:rules')

Joi = require '@hapi/joi'
Errors = require '../../lib/errors'

rule_name_schema = Joi.string().pattern(/^[0-9a-zA-Z \-+$!#@]+$/)

rules_group_name_schema = rule_name_schema.error (errors)->
    debug "Rule/Group name", errors
    new Errors.ValidationError 'Rule/Group name contains invalid characters'

rules_agent_name_schema = Joi.string().alphanum().min(3).error (errors)->
    debug "Rule/Agent name", errors
    new Errors.ValidationError 'Rule/Agent name contains invalid characters'



module.exports =
    rules_group_name_schema: rules_group_name_schema
    rules_agent_name_schema: rules_agent_name_schema