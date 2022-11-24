# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

Joi = require '@hapi/joi'
Errors = require '../../lib/errors'

{ APIKEY_LENGTH } = require '../model/apikey'

apikey_schema = Joi.string().length APIKEY_LENGTH
.alphanum()
.required()
.error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'string.base', 'any.required'
                err.message = "apikey is required"
                break
            when 'string.alphanum', 'string.length'
                err.message = "apikey is invalid"
                break
    errors
    #new Errors.ValidationError 'apikey invalid', field: 'apikey', value: ''

apikey_create_schema = Joi.object().keys({
    apikey: Joi.object({})
}).required().messages({
    'any.required': "apikey is required"
})


apikey_read_schema = Joi.object().keys({
    apikey: apikey_schema.required()
}).required()

apikey_delete_schema = Joi.object().keys({
    apikey: apikey_schema.required()
}).required().error (errors)->
    errors.forEach (err)->
        switch err.code
            when 'any.required'
                err.message = "apikey is required"
    errors


module.exports = 
    apikey_schema: apikey_schema
    apikey_create_schema: apikey_create_schema
    apikey_read_schema: apikey_read_schema
    apikey_delete_schema: apikey_delete_schema