# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


Joi = require '@hapi/joi'
{group_name_definition} = require './group_name'

{logger, debug}   = require('oa-logging')('oa:validations:schedule')

Errors = require '../../lib/errors'

schedule_uuid_schema = Joi.string().guid({version: ['uuidv1']}).required().error (errors)->
    new Errors.ValidationError( 'Invalid schedule uuid')

weekdays_collection_schema = Joi.array().items( Joi.string().valid('Monday', 'Tuesday', 'Wednesday','Thursday','Friday','Saturday','Sunday')).error (errors)->
    new Errors.ValidationError( 'Invalid schedule weekeday')


schedule_update_days_schema = Joi.object().keys({
    uuid: schedule_uuid_schema
    days: weekdays_collection_schema
}).required()

schedule_delete_schema = Joi.object().keys({
    uuid: schedule_uuid_schema
}).required()

module.exports =
    schedule_update_days_schema: schedule_update_days_schema
    schedule_delete_schema: schedule_delete_schema