# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# Logging
{ debug, logger } = require('oa-logging')('oa:event:route:password')

# npm modules
router            = require('express').Router()
moment            = require('moment')

# OA modules
Errors            = require '../../lib/errors'
config            = require("../../lib/config").get_instance()
{ send_email }    = require '../../lib/email'
{ _
  random_string } = require 'oa-helpers'

# Model
{ User }          = require '../model/user'

# Validations
{password_reset_token_schema, password_reset_schema, password_requested_schema} = require '../validations' 



# ### Password reset request

# Request an email with your reset token

router.get [ '/', '/request' ], ( req, res )->
  res.render 'password',
    title: 'Password'



# ### Reset requested

# Notify the user of request and present
# form for token in case they have trouble
# with the link in the email

class NoUserError extends Error
  name: "NoUser"
  constructor: (@message) ->
    super()
    Error.captureStackTrace(this, NoUserError)

router.post '/requested', ( req, res )->

  debug "/requested finding req.body", req.body

  validate_form = ()->
    new Promise ( resolve, reject )->
      {value, error} = password_requested_schema.validate req.body
      return resolve( value ) unless error

      if error instanceof Errors.ValidationError
        return reject error
      reject new Errors.ValidationError("Invalid request")

  validate_form().then (validatedBody)->
    debug 'validated, finding user', validatedBody.email
    User.findOneAsync email: validatedBody.email
  .then ( user )->
    debug 'query got user', user
    unless user
      # This is not a known email address, so log the attempt
      throw new NoUserError("#{req.body.email}")
    user.generate_token()
    user.saveAsync()
  .then ( user )->
    debug 'User saved', user
    logger.info 'Password resetting started for user id [%s]', user.id
    reset_url = "#{config.app.url}/password/reset/#{user.reset.token}"
    send_email
      to:       user.email
      from:     config.app.email
      subject:  "#{config.app.name} password reset requested"
      template:
        name: 'password-reset-requested'
        values:
          token: user.reset.token
          reset_url: reset_url

  .then ( email_info )->
    debug 'Sent email', email_info
    logger.info 'Requesting password reset sent email msgid [%s], response [%s]', email_info.messageId, email_info.response
    res.render 'password-requested',
      title: 'Password'

  # .catch Errors.ValidationError, ( error )->
  #   debug 'ValidationError', error
  #   logger.error "A user requested an invalid password reset [#{error}] [#{req.body.email}]"
  #   res.render 'password',
  #     title: 'Password'
  #     error: 'Email invalid'

  # .catch NoUserError, ( error )->
  #   debug 'NoUser', error
  #   logger.error "A user requested a password reset for an email that doesn't exist [#{error}] #{req.body.email}]"
  #   res.render 'password-requested',
  #     title: 'Password'
    
  .catch ( error )->
    debug 'Error', error

    if error instanceof Errors.ValidationError
      logger.error "A user requested an invalid password reset [#{error}] [#{req.body.email}]"
      return res.render 'password',
        title: 'Password'
        error: 'Email invalid'
    else if error instanceof NoUserError
      logger.error "A user requested a password reset for an email that doesn't exist [#{error}] #{req.body.email}]"
      return res.render 'password-requested',
        title: 'Password'
    else
      logger.error '/requested', error, error.stack, req.body.email
      return res.render 'password',
        title: 'Password'
        error: "Request failed: #{error}"
    #throw error


router.param 'token', ( req, res, next, token )->
  debug 'password token param found on request', token, req.url, req.originalUrl
  next()



# ### Password reset form

# Provide the password reset form when a valid token is supplied

router.get '/reset/:token', ( req, res )->

  debug '/reset/:token looking for req.params.token', req.params.token

  validation =  password_reset_token_schema.validate req.params.token
  if validation.error
    if validation.error instanceof Errors.ValidationError
      logger.error 'validation failed ', validation.error.message
    return res.render 'password-requested',
      title: 'Password Token'
      messages:
        error: 'Invalid token'

  validatedData = validation.value

  debug 'validatedData: ', validatedData
  User.findOneAsync "reset.token": validatedData
  .then ( user )->
    logger.warn 'Attempting password reset for user id [%s]', user.id
    unless user
      res.render 'password-requested',
        title: 'Password Token'
        messages:
          error: 'Token not found, try again'
      throw new Errors.ValidationError 'Token not found, try again'

    res.render 'password-reset',
      title: 'Password Reset'
      token: user.reset.token

  .catch Errors.ValidationError, ( error )->
    logger.error error, error.stack

  .catch ( error )->
    logger.error error, error.stack
    res.render 'error',
      messages:
        error: 'Unknown error'
    throw error



# ### Password reset action

# This does the actual reset of the password

router.post '/reset', ( req, res )->

  {value, error} = password_reset_token_schema.validate req.body.token

  debug "value, %o, error %o", value, error

  if error
    logger.error "Attempted to reset password with an invalid reset token [%s]", req.body.token
    return res.render 'password-requested',
      title: 'Password Token'
      messages:
        error: "Invalid token [#{req.body.token}], try again"



  {value, error} = password_reset_schema.validate req.body
  if error
    logger.info 'Password reset request schema incomplete'
    # Likely the first pass at resetting password when just providing the token
    if error instanceof Errors.ValidationError
      return res.render 'password-reset',
        title: 'Password Reset'
        token: value.token
        messages:
          error: error.message
    else
      return res.render 'password-reset',
        title: 'Password Reset'
        token: value.token

  User.findOneAsync "reset.token": value.token
  .then ( user )->
    unless user
      logger.warn 'Password reset token did not exist [%s]', value.token
      res.render 'password-requested',
        title: 'Password Token'
        messages:
          error: 'Token not found'
      throw new Errors.ValidationError 'Invalid token, try again'

    user.setPasswordAsync value.password

  .then ( user )->
    # expire the token
    user.reset =
      expires: moment().toDate()
    user.saveAsync()

  .then ( user )->
    logger.info 'Password has been reset for user id [%s]', user.id
    debug 'user after save', user
    send_email
      from:     config.app.email
      to:       user.email
      subject:  "#{config.app.name} password reset"
      text:     'Your password has been reset'
      template:
        name: 'password-reset'

  .then ( info ) ->
    res.render 'password-reset-success',
      title: 'Password reset successful'
      messages:
        success: "Your password has been reset"
        #"There was a problem sending the email notification but don't worry, your password has been reset"

  .catch Errors.BadRequestError, Errors.ValidationError, ( error )->
    logger.error error, error.stack
    res.render 'password-reset',
      title: 'Password Reset'
      messages:
        error: error.message

  .catch ( error )->
    logger.error error, error.stack
    res.render 'error',
      messages:
        error: 'Unknown error'
    throw error



module.exports = router
