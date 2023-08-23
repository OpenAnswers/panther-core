
#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:action')

# npm modules
Promise  = require 'bluebird'
mongoose = require 'mongoose'
moment   = require 'moment'
request  = Promise.promisifyAll require('request')

# oa modules
Errors   = require './errors'

IntegrationLog = require '../app/model/integration_log'

{ _
  throw_error
  format_string } = require 'oa-helpers'


# ## Class: Integration
# A single Integration to extend
class Integration

  @description: ->
    throw new Errors.NotImplementedError 'description not implemented'

  # ###### run( event )
  # Every integration needs to run on an event
  run: ( event )->
    throw new Errors.NotImplementedError 'run is not defined'

  # ###### replace_fields( str, event )
  # search in str `{field}` and replace it with the data in `event`
  replace_fields: ( str, event )->
    format_str str, event



# ## Class: HttpIntegration
# The generic HTTP Integration
class HttpIntegration extends Integration
  
  # Selected methods we support
  @methods: [ 'GET', 'POST', 'PUT', 'DELETE' ]

  # The web descriptor
  @description: -> {
    name: 'HTTP Request'
    input: [{
      name:         'method'
      label:        'Method'
      type:         'select'
      values:       @methods
    },{
      name:         'url'
      label:        'URL'
      type:         'text'
      validation:   '' #some URL.js function
    },{
      name:         'header'
      label:        'Header'
      type:         'text'
    },{
      name:         'body'
      label:        'Body'
      type:         'textarea'
    }]
  }

  constructor: ( @url, options )->
    super()
    @method   = options.method ? 'GET'
    #@headers  = options.headers ? []
    @header   = options.header ? undefined
    @body     = options.body ? ''
    @url      = options.url

  
  # Send the http request
  run: ( event, cb )->
    url  = @replace_fields event, @url
    body = @replace_fields event, @body

    request.getAsync( url )
    .then ( response )->
      if response.statusCode != 200
        cb "error: #{response.statusCode} #{error}"

      log.info 'integration', response
      #log = new IntegrationLog

      if cb then cb null, response

    .catch ( error )->
      log.error 'error in integration request', error, ''
      cb error



# ## Class: SesIntegration
# The SES Amazon email Integrations
class SesIntegration extends HttpIntegration

  # The web descriptor
  @description: -> {
    name: 'Amazon SES Email'
    input: [{
      name:         'name'
      label:        'Name'
      type:         'text'
      placeholder:  'This name will appear in the context menu'
      validation:   /^[\w\s]+$/
    },{
      name:         'auth_aws_key'
      label:        'Access Key'
      type:         'text'
      placeholder:  'Token or Password'
    },{
      type:         'divider'
      label:        'Ticket Settings'
    },{
      name:         'email_destination'
      label:        'Destination address'
      type:         'text'
      placeholder:  'email-to@domain.com'
    },{
      name:         'subject'
      label:        'Subject'
      type:         'text'
      placeholder:  'Subject {fields}'
    },{
      name:         'body'
      label:        'Body'
      type:         'textarea'
      placeholder:  'Body with event {fields}'
    }]
  }

  constructor: ( @url, options )->
    super()
    @auth_aws_key      = options.auth_aws_key
    @email_destination = options.email_destination
    @subject           = options.subject
    @body              = options.body

  run: ( event, cb )->
    subject = replace_fields @subject, event
    body    = replace_fields @body, event

    # build and send api request



# ## Class: ZendeskTicketIntegration
# The Zendesk Ticket Integrations
class ZendeskTicketIntegration extends HttpIntegration

  @ticket_types = [ 'Incident', 'Problem', 'Question', 'Task' ]

  @ticket_priorities = [ 'Urgent', 'High', 'Normal', 'Low' ]

  # The web descriptor
  @description: -> {
    name: 'ZenDesk Ticket'
    input: [{
      name:         'subdomain'
      label:        'Subdomain'
      type:         'text'
      aftertext:    '.zendesk.com'
      placeholder:  'your_domain'
      validation:   /[^\s_]/
    },{
      name:         'email'
      label:        'Email'
      type:         'email'
      placeholder:  'email@domain.com'
    },{
      name:         'auth'
      label:        'Authentication'
      type:         'select_string'
      types:        [ 'Token', 'Password' ]
      placeholder:  'Token or Password'
    },{
      type:         'divider'
      label:        'Ticket Settings'
    },{
      name:         'ticket_type'
      label:        'Type'
      type:         'select'
      values:       @ticket_types
    },{
      name:         'ticket_priorities'
      label:        'Priority'
      type:         'select'
      values:       @ticket_priorities
    },{
      name:         'ticket_subject'
      label:        'Subject'
      type:         'text'
      placeholder:  'Subject with event {fields}'
    },{
      name:         'ticket_comment'
      label:        'Comment'
      type:         'textarea'
      placeholder:  'Comment with event {fields}'
    }]
  }

  constructor: ( @name, options )->
    super()
    @subdomain       = options.subdomain
    @email           = options.email ? []
    @auth_password   = options.password ? ''
    @auth_token      = options.token ? ''
    @ticket_type     = options.type ? ''
    @ticket_priority = options.priority ? ''
    @ticket_subject  = options.subject ? ''
    @ticket_comment  = options.comment ? ''

  run: ( event, cb )->
    comment = replace_fields comment, event
    subject = replace_fields subject, event

    # build and send api request



# ## Class: HttpRedirectIntegration
# The generic HTTP redirect Integration
# Sends the user to a page with some sort of event context
class HttpRedirectIntegration extends Integration

  @description: -> {
    name: 'HTTP Redirect'
    input: [{
      name:         'url'
      label:        'URL'
      type:         'text'
      placeholder:  'Redirect URL {fields}'
    }]
  }

  constructor: ( @url )-> super()

  run: ( event, cb )->
    # not sure how to inject this one into the client
    # maybe a js window.location?
    url = @replace_fields @url, event
    cb null, location: "#{url}"



# ## CreateNewRuleIntegration
# The internal Create New Rule
class CreateNewRuleIntegration extends HttpRedirectIntegration

  @description: -> {
    name: 'HTTP Redirect'
    input: []
  }

  constructor: ( @url )-> super()

  run: ( event, cb )->
    # redirect user to http address
    cb null, location: "/rules/create?id=#{event.id}"



# ## Class: Integrations
# A cluster of Integrations
class Integrations

  # Types of integration, with class
  @types:
    http:           HttpIntegration
    zendesk_ticket: ZendeskTicketIntegration
    ses:            SesIntegration
#    sns:            SnsIntegration
    http_redirect:  HttpRedirectIntegration
    create_rule:    CreateNewRuleIntegration


  # ###### types_list
  # Return an array of Integration types
  @types_list: ->
    _.keys @types


  # Default inputs for all integration types
  @types_default_inputs = [{
    name:         'name'
    label:        'Name'
    type:         'text'
    placeholder:  'This name will appear in the context menu'
    validation:   /^[\w\s]+$/
  }]


  # Holds a description of all configured types of Integration
  # Require a @description() function from each class
  @types_description = {}
  for type,klass of @types
    @types_description[type] = klass.description()
    @types_description[type].input.unshift @types_default_inputs...


  # ###### build_mongoose_models()
  # Create a mongoose model from an Integrations decscription
  build_mongoose_models: ()->
    for type of @types
      build_model type


  # ###### build_mongoose_model()
  # Create a mongoose model from an Integrations decscription
  build_mongoose_model: ()->

    for name, definition of @types_description
      debug 'processing field of description', name
      
      schema = new mongoose.Schema

      switch name
        when 'divider' then continue

        when 'string', 'select_string', 'email', 'select', 'text', 'textarea'
          schema['integration'][name]['type'] = String

        else
          throw_error "Unknown integration field type", def.type

      schema['integration'][name]['required'] = if def.required? is false
        false
      else
        true

      schema

      

module.exports =
  Integrations: Integrations
  Integration: Integration
  HttpIntegration: HttpIntegration
  ZendeskTicketIntegration: ZendeskTicketIntegration
  HttpRedirectIntegration:  HttpRedirectIntegration
  CreateNewRuleIntegration: CreateNewRuleIntegration
