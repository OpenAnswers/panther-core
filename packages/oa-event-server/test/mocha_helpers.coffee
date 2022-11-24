#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 


mocha   = require 'mocha'
expect  = require( 'chai' ).expect
request = require 'request'
sinon   = require 'sinon'
_       = require 'lodash'

debug = require( 'debug' )( 'oa:mocha:helpers' )


# request wrapper sepcifically for mocha test (or anything with done())

class Web

  # Web allows the URL to be tested from the shell environment rather
  # Than what is in code. 
  # Use this to point the tests an non local environments. 
  @from_env_or_default: ( options = {} )->
    host    = options.host ?   process.env.URL_HOST   ? 'localhost'
    scheme  = options.scheme ? process.env.URL_SCHEME ? 'http'
    port    = options.port ?   process.env.URL_PORT   ? 3001
    path    = options.path ?   process.env.URL_PATH   ? ''
    url     = options.url ?    process.env.URL        ? "#{scheme}://#{host}:#{port}#{path}"
    new Web url

  constructor: (@url) ->
    @request_opts = {}
    @username = 'test'
    @password = 'test'

  # set a request opt
  option: (name, value) ->
    if value?
      @request_opts[name] = value
    else
      @request_opts[name]

  # get 200's
  get: ( path, done, cb ) ->
    Web.get @url,
      path,
      @request_opts,
      done,
      cb

  # get json, 200s
  get_json: ( path, done, cb ) ->
    Web.get_json @url,
      path,
      @request_opts,
      done,
      cb

  # get request checking for specific response code
  get_code: ( path, code, done, cb ) ->
    Web.get_code @url,
      path,
      code,
      @request_opts,
      done,
      cb

  # create new cookie jar
  add_jar: ->
    @request_opts.jar = request.jar()

  # eat all the cookies from the cookie jar
  emtpy_jar: -> add_jar

  # remove the current cookie jar
  remove_jar: ->
    delete @request_opts.jar

  # Build the request post request options
  # from the formdata and defaults
  post_request_options: ( formdata )->
    post_opts = {}
    for k,v of @request_opts
      post_opts[k] = v
    post_opts.method = "POST"
    post_opts.form = formdata
    post_opts

  # post http. 200
  post: ( path, formdata, done, cb )->
    post_opts = @post_request_options(formdata)
    Web.get @url, path, post_opts, done, cb

  # post http, custom code
  post_code: ( path, code, formdata, done, cb )->
    post_opts = @post_request_options(formdata)
    Web.get_code @url, path, code, post_opts, done, cb


  # ## Class instance methods

  # These are the methods that the instance methods call

  # ### get( host, path, error_code, request_opts, done, cb )
  # Get a url, expecting a specific code
  @get_code: ( host, path, error_code, request_opts, done, cb )->
    debug 'get_code', host, path, error_code, request_opts
    
    request_opts['url'] = "#{host}#{path}"

    request request_opts, (error, response, body) ->
      if error
        debug 'Error:', error
        err = new Error "Request Error: #{request_opts.url} > #{error.message}"
        return done(err)

      unless response.statusCode is error_code
        debug 'Error:', error_code, body
        err = new Error "Request bad status: #{request_opts.url} returned #{response.statusCode}. body: #{body[0..384]}"
        return done(err)

      cb response, body


  # ### get( host, path, request_opts, done, cb )
  # get a url expecting a 200
  @get: ( host, path, request_opts, done, cb ) ->
    @get_code host, path, 200, request_opts, done, cb
  

  # ### get( host, path, request_opts, done, cb )
  # get a url expecting a 200 with JSON content
  @get_json: ( host, path, request_opts, done, cb ) ->
    @get_code host, path, 200, request_opts, done, (response, body) ->
      try
        json = JSON.parse( body )
      catch error
        return done new Error "JSON #{error} #{response.body}"
      debug 'web json', json
      cb response, json


event_samples =

  simple:
    identifier: 'qweiru42:3:simple alert summary of sev 3'
    node:       'qweiru42'
    severity:   3
    summary:    'simple alert summary of sev 3'

  middle:
    identifier: 'azeiru34:4:middle summary sev 4'
    node:       'azeiru34'
    severity:   4
    summary:    'middle summary sev 4'
    agent:      'sample'

  complex:
    identifier: 'rbeiru93:5:complex summary sev 5'
    node:       'rbeiru93'
    severity:   5
    summary:    'complex summary sev 5'
    agent:      'syslog'


# I guess this is esentially a mock for a RuleSet
rules_runner = ( ev, rules ) ->
  ev_processed = ev
  for rule in rules
    ev_processed = rule.run ev_processed
  ev_processed



module.exports =
  mocha:    mocha
  expect:   expect
  sinon:    sinon
  request:  request
  debug:    debug
  Web:      Web
  event_samples:  event_samples
  rules_runner:   rules_runner
  _:        _