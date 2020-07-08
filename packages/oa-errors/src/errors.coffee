
# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# ## Error

# This containers all the standard error sub classes we use.

# All classes are exported on @ (this) so that both Node and Front end can
# use the classes once the file has been included.

# ValidationError is the most used, It probably needs subclassing itself.


# ### SocketError
# Errors that occur on socketio itself
class SocketError extends Error
  name: 'SocketError'
  constructor: (@message, options)->
    Error.captureStackTrace(this, SocketError) if Error.captureStackTrace
    @name = 'SocketError'
@SocketError = SocketError

# ### SocketMsgError
# Error that occur on the messages to/form socketio clients
class SocketMsgError extends Error
  name: 'SocketMsgError'
  constructor: (@message,options = {} )->
    Error.captureStackTrace(this, SocketMsgError) if Error.captureStackTrace
    @name = 'SocketMsgError'
@SocketMsgError = SocketMsgError


# ### QueryError
# For any problems with the result of a db/data query
# Mongoose/Mongodb query errors should be wrapped into this class when thrown.
class QueryError extends Error
  name: 'QueryError'
  constructor: (@message, options = {} )->
    Error.captureStackTrace(this, QueryError) if Error.captureStackTrace
    @name = 'QueryError'
    return unless options
    @code = options.code if options.code?
    @field = options.field if options.field?
    @value = options.value if options.value?
    @query = options.query if options.query?
    @status = options.status if options.status?
    @simple = options.simple if options.simple?
@QueryError = QueryError


class NotFoundError extends Error
  name: 'NotFoundError'
  constructor: (@message, options = {} )->
    Error.captureStackTrace(this, NotFoundError) if Error.captureStackTrace
    @name = 'NotFoundError'
    @status = 404
    return unless options
    # A custom code for the error
    @code = options.code if options.code?
    # The field that was in error
    @field = options.field if options.field?
    # The value that was in error
    @value = options.value if options.value?
    # in case this is a http request
    @status = options.status if options.status?
    @simple = options.simple if options.simple?
@NotFoundError = NotFoundError


# ### ValidationError

# Any client based data validation error should be thrown with this.

class ValidationError extends Error
  name: 'ValidationError'
  constructor: (@message, options = {} )->
    Error.captureStackTrace(this, ValidationError) if Error.captureStackTrace
    @name = 'ValidationError'
    return unless options
    # A custom type for the error
    @type = options.type if options.type?
    # A custom code for the error
    @code = options.code if options.code?
    # The field that was in error
    @field = options.field if options.field?
    # The value that was in error
    @value = options.value if options.value?
    # The format required for this field
    @format = options.format if options.format?
    # css id/selector for the field/value in question
    @id = options.id if options.id?
    # in case this is a http request
    @status = options.status if options.status?
    @simple = options.simple if options.simple?

# Export it
@ValidationError = ValidationError


# ### RequestError

class RequestError extends Error
  name: 'RequestError'
  constructor: ( @message, options = {} )->
    Error.captureStackTrace(this, RequestError) if Error.captureStackTrace
    for key, value of options
      @[key] = value
    @name = 'RequestError'

@RequestError = RequestError


# ### BadRequestError

# Error from passport-local-mongoose
# Reuse for other requesty type things

class BadRequestError extends Error
  name: 'BadRequestError'
  constructor: (@message, options = {} )->
    Error.captureStackTrace(this, BadRequestError) if Error.captureStackTrace
    @name = 'BadRequestError'
    return unless options
    @simple = options.simple if options.simple?

# Export
@BadRequestError = BadRequestError


# ### NotImplementedError

# For base class methods that should be inherited.

class NotImplementedError extends Error
  name: 'NotImplementedError'
  constructor: (@message, options = {} )->
    Error.captureStackTrace(this, NotImplementedError) if Error.captureStackTrace
    @name = 'NotImplementedError'
# Export
@NotImplementedError = NotImplementedError


# ### CertificateError

# Any client based error when sending emails, which is not really important

class CertificateError extends Error
  name: 'CertificateError'
  constructor: (@message, options = {} )->
    Error.captureStackTrace(this, CertificateError) if Error.captureStackTrace
#Export
@CertificateError = CertificateError


# ### EmailError

# Any client based error when sending emails, which is not really important

class EmailError extends Error
  name: 'EmailError'
  constructor: (@message, options = {} )->
    for key, value of options
      @[key] = value
    Error.captureStackTrace(this, EmailError) if Error.captureStackTrace
    @name = 'EmailError'
@EmailError = EmailError


# ### HttpErrors for express

class HttpError extends Error
  name: 'HttpError'
  constructor: (@message,options = {} )->
    Error.captureStackTrace(this, HttpError) if Error.captureStackTrace
    @name = 'HttpError'
    @code = options.code
    @status = @code
# Export
@HttpError = HttpError


# The HTTP error classes should be able to built from a config
#codes = [
  #400: { message: "Bad Request" }
  #401: { message: "Authorization failed" }
  #404: { message: "Not found" }
  #500: { message: "Server Error" }
#]
#for code,info of codes
  #create HttpError#{code} 

class @HttpError404 extends @HttpError
  name: 'HttpError404'
  constructor: ( @detail, options = {} )->
    Error.captureStackTrace(this, HttpError404) if Error.captureStackTrace
    @code = 404
    @status = @code
    @message = "Not Found"
    @message += " #{@detail}" if @detail
    @simple = options.simple if options?.simple

class @HttpError400 extends @HttpError
  name: 'HttpError400'
  constructor: ( @detail, options = {} )->
    Error.captureStackTrace(this, HttpError400) if Error.captureStackTrace
    @code = 400
    @status = @code
    @message = "Bad Request"
    @message += " #{@detail}" if @detail
    @simple = options.simple if options?.simple

class @HttpError401 extends @HttpError
  name: 'HttpError401'
  constructor: ( @detail, options = {} )->
    Error.captureStackTrace(this, HttpError401) if Error.captureStackTrace
    @code = 401
    @status = @code
    @message = "Unauthorised"
    @message += " #{@detail}" if @detail
    @simple = options.simple if options?.simple

class @HttpError500 extends @HttpError
  name: 'HttpError500'
  constructor: ( @detail, options = {} )->
    Error.captureStackTrace(this, HttpError500) if Error.captureStackTrace
    @code = 500
    @status = @code
    @message = "Server Error"
    @message += " #{@detail}" if @detail
    @simple = options.simple if options?.simple



class ErrorGroup extends Error
  name: 'ErrorGroup'

  constructor: ( @message, @options = {} )->
    Error.captureStackTrace(this, ErrorGroup) if Error.captureStackTrace
    @name = 'ErrorGroup'
    @message = "#{@message}"
    @errors = []
    @default_type = Error

  count: ->
    @errors.length

  add: ( error )->
    @errors.push error
    @message += ": #{error.message}"

  add_new: ( error_type, message, options = {} )->
    if error_type instanceof Error
      error_cls = error_type
    else
      error_cls = ErrorType.lookup error_type
      unless error_cls
        error_cls = @default_type
    @add new error_cls( message, options )

  throw_if_errors: ->
    if @errors.length > 0
      throw @

@ErrorGroup = ErrorGroup


class ValidationGroup extends ErrorGroup
  name: 'ValidationGroup'
  default_type = ValidationError
  constructor: ( @message, @options = {} )->
    super
    @name = 'ValidationGroup'
    @default_type = ValidationError

@ValidationGroup = ValidationGroup

# ## ErrorType

# When errors are serialised to JSON they become plain objects but retain
# the error metadata. This coverts them back to the real errors. 

class ErrorType

  # We need a lookup to the local exported classes in ErrorType

  @types =
    'SocketError':      SocketError
    'Socket':           SocketError
    'SocketMsgError':   SocketMsgError
    'SocketMsg':        SocketMsgError
    'HttpError':        HttpError
    'Http':             HttpError
    'ValidationError':  ValidationError
    'Validation':       ValidationError
    'RequestError':     RequestError
    'Request':          RequestError
    'BadRequestError':  BadRequestError
    'BadRequest':       BadRequestError
    'NotFoundError':    NotFoundError
    'NotFound':         NotFoundError
    'QueryError':       QueryError
    'Query':            QueryError

    'ErrorGroup':       ErrorGroup
    'ValidationGroup':  ValidationGroup

  # Error type lookup from String   
  @lookup = ( name )->
    @types[name]


  # Json serialises errors as plain objects.
  # Convert them back so things like bluebird
  # can use them without complaining
  @from_object = ( error_var )->
  
    # Our new error 
    error = null

    # Check if we have serialised error
    if typeof error_var is 'object' and error_var.message isnt undefined

      # Check if we have a known error type
      if customer_error_type = @lookup error_var.name
        error = new customer_error_type error_var.message
      else
        error = new Error error_var.message
      
      # Attach any other properties
      for key, value of error_var
        error[key] = value
    
    # Generate something if the json doesn't look like an error
    else
      error = new Error error_var

    error

@ErrorType = ErrorType
