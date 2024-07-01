# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


Joi = require '@hapi/joi'
{group_name_definition} = require './group_name'

{logger, debug}   = require('oa-logging')('oa:validations:inventory')

Errors = require '../../lib/errors'

inventory_id_schema = Joi.string().alphanum().error (errors)->
    new Errors.ValidationError( 'Invalid inventory::delete id')


inventory_delete_schema = Joi.object().keys({
    data: Joi.array().items(inventory_id_schema).error (errors)->
        debug "inventory delete ", errors
        new Errors.ValidationError( 'Invalid inventory::delete')
}).required()


module.exports =
    inventory_delete_schema: inventory_delete_schema