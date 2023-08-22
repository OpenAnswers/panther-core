# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

Joi = require '@hapi/joi'
Errors = require '../../lib/errors'

group_name_definition = Joi.string().min(1).alphanum().error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'string.base'
                err.message = "Group must be a string"
                break
            when 'string.min', 'string.empty'
                err.message = 'Group must not be empty'
                break
            when 'string.alphanum'
                err.message = "Group can only contain alphanumeric"
                break
    errors
#group_name_definition = Joi.string().valid('admin', 'user')
#    new Errors.ValidationError 'Group name invalid', field: 'group', value: ''


module.exports.group_name_definition = group_name_definition