# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


Joi = require '@hapi/joi'
{group_name_definition} = require './group_name'

{logger, debug}   = require('oa-logging')('oa:validations:user')

Errors = require '../../lib/errors'

username_definition = Joi.string()
.alphanum()
.min(4)
.error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'string.base'
                err.message = "Username must be a string"
                break
            when 'string.min'
                err.message = "Username must be at least 4 characters"
                break
            when 'string.alphanum'
                err.message = "Username can only contain alphanumeric"
                break
            when 'string.empty'
                err.message = "Username must not be empty"
                break
    errors

email_definition = Joi.string().min(4).email().error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'string.base'
                err.message = "No email field in user data"
                break
            when 'string.min', 'string.empty'
                err.message = "Email must not be empty"
                break
            when 'string.email'
                err.message = 'Email address is invalid'
                break
    errors


users_read_definition = Joi.object({}).required().error (errors)->
    debug "users_read: ", errors
    new Errors.ValidationError 'read is invalid'

user_update_definition = Joi.object().keys({
    _id: Joi.string().alphanum().required()
    email: email_definition.required()
    group: group_name_definition.required()
    username: username_definition.required()
}).required().error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'object.unknown', 'any.required'
                err.message = "No user in data"
                break
    errors

user_create_definition = Joi.object().keys({
    user: Joi.object().keys({
        username: username_definition.required()
        group: group_name_definition.required()
        email: email_definition.required()

    }).required().error (errors)->
        errors.forEach (err)->
            switch err.code
                when 'any.required'
                    err.message = 'No user data'
                    break
        errors
}).required().error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'object.unknown', 'any.required'
                err.message = "No user in data"
                break
    errors


user_read_definition = Joi.object().keys({
    user: username_definition
}).required().error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'object.unknown', 'any.required'
                err.message = "No user in data"
                break
    errors


user_delete_definition = Joi.object().keys({
    user: username_definition.required()
}).required().error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'object.unknown', 'any.required'
                err.message = "No user in data"
                break
    errors


user_reset_password_definition = Joi.object().keys({
    user: username_definition.required()
}).required().error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'object.unknown', 'any.required'
                err.message = "No user in data"
                break
    errors



module.exports =
    users_read_schema: users_read_definition
    user_create_schema: user_create_definition
    user_read_schema: user_read_definition
    user_update_schema: user_update_definition
    user_delete_schema: user_delete_definition
    user_reset_password_schema: user_reset_password_definition