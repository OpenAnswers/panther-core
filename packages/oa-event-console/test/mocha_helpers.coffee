# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Mocha Helpers

# Includes all the helpers uses across many tests

debug = require( 'debug' )( 'oa:test:helpers' )

fs          = require 'fs'

#try
  #config = require('../lib/config').load_file './test/fixture/config.test.yml', 'default'
#catch error
  #logger.error "Failed to load config file [#{config_file}]:\n#{error}"
  #throw error

global.Promise = require 'bluebird'
global.mocha   = require 'mocha'
global.chai    = require( 'chai' )
global.expect  = chai.expect
global.sinon   = require 'sinon'
global._       = require 'lodash'

request      = require 'request'
supertest    = require 'supertest'
cookieParser = require 'cookie-parser'
toughCookie  = require 'tough-cookie'
querystring  = require 'querystring'
path         = require 'path'

unless process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

Promise.config
  longStackTraces: true
  warnings: true

# ## Web

# request wrapper specifically for mocha test (or anything with done()) to remove some boilerplate
# Not sure if this is such a good idea as supertest is much nicer to test with
class Web

  # Set a var for app config so people can do custom things
  @app_config: './test/fixture/config.test.yml'
  @app: null

  # Web allows the URL to be tested from the shell environment rather
  # Than what is in code.
  # Use this to point the tests an non local environments.
  @from_env_or_default: ( options = {} )->
    host    = options.host ?   process.env.URL_HOST   ? 'localhost'
    scheme  = options.scheme ? process.env.URL_SCHEME ? 'http'
    port    = options.port ?   process.env.URL_PORT   ? 3901
    path    = options.path ?   process.env.URL_PATH   ? ''
    url     = options.url ?    process.env.URL        ? "#{scheme}://#{host}:#{port}#{path}"
    browser = options.browser ? process.env.BROWSER   ? 'firefox'

    new Web url,
      host: host
      scheme: scheme
      port: port
      path: path
      browser: browser

  constructor: ( @url, options = {} ) ->
    @host   = options.host
    @scheme = options.scheme
    @port   = options.port
    @path   = options.path
    @username = 'test'
    @password = 'test'
    @browser  = options.browser
    @request_opts = {}

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
        message = if _.isString(body) then body else JSON.stringify(body)
        message = message[0..384]
        err = new Error "Request bad status: #{request_opts.url} returned #{response.statusCode}. body: #{message}"
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

  # ### cookie_to_session_id( secret, sessionkey, <jar>, <host>, <path> )
  # Grab a session cookie from the cookie jar and nibble it down to a session_id
  # requires the secret the server uses to encode cookies
  # This is for socketio, so we can dump a session_id straight in and auth.
  @cookie_to_session_id: ( secret, sessionkey, jar, host = 'localhost', path = '/' )->
    unless jar
      if @request_opts and @request_opts.jar
        jar = @request_opts.jar
      else
        throw new Error 'No cookie jar passed in to method or already on the Web instance'
    debug 'jar',jar
    thecookie = jar._jar.store.idx[host][path][sessionkey]
    debug 'thecookie find', thecookie
    debug 'thecookie value', thecookie.value
    debug 'thecookie value decode', querystring.unescape thecookie.value
    session_id = cookieParser.signedCookie( querystring.unescape(thecookie.value), secret )
    debug 'session_id', session_id
    session_id

  cookie_to_session_id: ( secret, sessionkey, jar = @request_opts, host = @)->


  browser_css_weight_bold: ->
    if @browser is 'firefox' then 700 else 'bold'

  browser_css_weight_normal: ->
    if @browser is 'firefox' then 400 else 'normal'

  # This should support more options than just a the $BROWSER env var
  # Phantom needs ports
  browser_capabililties: ->
    o = 
      desiredCapabilities:
        singleton: true
        browserName: @browser

    if @browser is 'phantom'
      o.host = 'localhost'
      o.port = 9514

    o

  fetch_browser_client: ( cb )->
    self = @
    debug 'browser_client before check', self.browser_client
    if @browser_client
      cb null, @browser_client
      return @browser_client

    debug 'fetch_browser_client didn\'t find one, creating new'

    @browser_client = require('webdriverio').remote self.browser_capabililties()
    @browser_client.init ->
      cb null, self.browser_client
      debug 'browser_client after init', self.browser_client


  # #### boot_complete_app( callback )
  # Boot the complete express app or return it.
  # Multiple tests can call it.
  # Rhe event_console app wasn't really designed to support
  # this so it's a bit of a hack
  @boot_complete_app: ( cb )->
    self = @
    debug 'Express.app', self.app
    if @app
      cb null, @app if cb
    else
      copy_rules_Async().then ( results )->
        process.argv.push "--config", "#{self.app_config}"
        Express = require('../app/index')
        Express.start (err,res)->
          self.app = Express.app
          debug 'Setting app from Express.app', self.app
          cb(err,self.app)

    @app


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


# Promise to copy a file (with streams)
copy_file_Async = ( path, new_path ) ->
  new Promise ( resolve, reject )->
    r = fs.createReadStream(path)
    w = fs.createWriteStream(new_path)
    r.pipe w

    w.on 'finish', ->
      resolve(true)

    w.on 'error', (error)->
      reject(error)

# Copy the static fixture rules files into place for tests
copy_rules_Async = ()->
  copies =
    server:  copy_file_Async('test/fixture/rules/server.rules.yml.fixture',  'test/fixture/rules/server.rules.yml')
    syslogd: copy_file_Async('test/fixture/rules/syslogd.rules.yml.fixture',  'test/fixture/rules/syslogd.rules.yml')
    graylog: copy_file_Async('test/fixture/rules/graylog.rules.yml.fixture',  'test/fixture/rules/graylog.rules.yml')
    http:    copy_file_Async('test/fixture/rules/http.rules.yml.fixture',     'test/fixture/rules/http.rules.yml')
  Promise.props copies


    
module.exports =
  _:        _
  mocha:    mocha
  expect:   expect
  sinon:    sinon
  request:  request
  debug:    debug
  Web:      Web
  event_samples:  event_samples
  rules_runner:   rules_runner
  supertest:      supertest
  cookieParser:   cookieParser
  toughCookie:    toughCookie
  copy_rules_Async: copy_rules_Async
