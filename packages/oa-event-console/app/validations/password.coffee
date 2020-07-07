
Joi = require '@hapi/joi'
{group_name_definition} = require './group_name'

{logger, debug}   = require('oa-logging')('oa:validations:password')

Errors = require '../../lib/errors'
{ RESET_TOKEN_LENGTH } = require '../model/user'

password_reset_token_schema = Joi.string().length RESET_TOKEN_LENGTH
.alphanum()
.required()
.error (errors) ->
    new Errors.ValidationError( 'Invalid reset token')

password_reset_schema = Joi.object().keys({
    token: password_reset_token_schema
    password: Joi.string().required()
    confirm: Joi.string().required().valid(Joi.ref('password')).error (errors)->
        new Errors.ValidationError("Passwords don't match, try again")
}).required().with('password', 'confirm')

password_requested_schema = Joi.object().keys({
    email: Joi.string().min(3).email().required().error (errors)->
        debug "password_requested ", errors
        new Errors.ValidationError("Invalid email address")
}).required()

module.exports =
    password_requested_schema: password_requested_schema
    password_reset_token_schema: password_reset_token_schema
    password_reset_schema: password_reset_schema