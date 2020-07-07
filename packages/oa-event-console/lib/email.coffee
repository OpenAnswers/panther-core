
# ## Email

# This is where all the custom errors live.

# We also hold a generic error thrower that does things the way the
# app expects.

# Logging module
{ logger, debug } = require('oa-logging')('oa:event:email')

# npm modules
Promise           = require 'bluebird'
nodemailer        = require 'nodemailer'
jade              = require 'jade'
_                 = require 'lodash'

# node modules
fs                = Promise.promisifyAll require('fs')

# oa modules
Errors            = require './errors'
config            = require('./config').get_instance()


# Setup this transport, this might need to modify based on "NODE_ENV" and maybe
# use `config`


# transport = nodemailer.createTransport
#   service: 'Gmail'
#   auth:
#     user: 'gmail.user@gmail.com'
#     pass: 'userpass'

transport_options =
  port: config.smtp.port || 25
  host: config.smtp.host || 'localhost'

transport = Promise.promisifyAll nodemailer.createTransport( transport_options )


# Cache for any compiled templates we pick up along the way
# key = filename
# value = fn
compiled_templates = {}


# ### check_templates( template_info )

# Builds a html template
# Should support text as well but found it difficult to build
# The "if text file exists, build it" flow with promises

# `template.name`:  Name of the template to lookup, without the .jade
# `template.values`: Values to pass into template rendering

build_template = ( template )->

  template.values ?= {}
  template.values.url ?= config.app.url
  template.values.support_url ?= config.app.support_url

  html_file = config.path.join config.path.emails, "#{template.name}.jade"
  #text_file = config.path.join config.path.emails, "#{template.name}.text.jade"

  unless compiled_templates[html_file]
    compiled_templates[html_file] = jade.compileFile html_file

  resolve = compiled_templates[html_file] template.values


# ### send_email( options )
# Returns a promise to send email via nodemailer
# Adds in some extra log handling to an email

# `email_options`: from nodemailer
# `email_options.template:` Render a jade template for html content

send_email_Async = ( email_options )->
  new Promise ( resolve, reject )->
    debug 'send_email email_options', email_options

    unless email_options and _.isObject email_options
      return reject 'Requires an email_options object'

    # Log some stuff
    debug 'sending email', email_options
    logger.debug 'Sending email from [%s] to [%s] subject [%s]',
      email_options.from, email_options.to, email_options.subject

    # Default the `from:` to the app
    email_options.from ?= config.app.email

    # Build a html template
    # Think about adding text too
    if email_options.template?
      email_options.html = build_template email_options.template
      debug 'send_email added html form template', email_options.html

    # Validate the email before relying on the smtp server
    unless email_options.subject?
      return reject new Errors.ValidationError "Couldn't send an email without [subject:]"

    unless email_options.to?
      return reject new Errors.ValidationError "Couldn't send an email without [to:]"

    if not email_options.text? and not email_options.html?
      return reject new Errors.ValidationError "Couldn't send an email without text or html content"

    # Now send the email, with out logging/debug
    transport.sendMailAsync email_options
    .then ( info )->
      logger.info 'Email sent from [%s] to [%s] subject [%s] info [%s]',
        email_options.from, email_options.to, email_options.subject, info.response
      debug 'sent email', email_options, info
      resolve info

    .catch ( error )->
      logger.error 'Problem sending email from [%s] to [%s] subject [%s] error [%s]',
        email_options.from, email_options.to, email_options.subject, error, error.stack
      reject error


# Exports
module.exports =
  nodemailer:     nodemailer
  transport:      transport
  send_email:     send_email_Async
  send_email_Async:     send_email_Async
  sendMailAsync:  transport.sendMailAsync
