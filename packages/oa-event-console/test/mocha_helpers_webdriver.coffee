# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# WebDriver Mocha Helper

# Webdriver.io and mocha helpers.
# Provide a singleton client for many tests to use
# Provide a screenshot function
# Provide browser compatibility functions
# Webdriver helpers

# boot phantomjs webdriver or chromedriver
# exec process, if not already

# ## PhantomJS
# http://phantomjs.org/download.html
# https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-2.1.1-macosx.zip
#
#     phantomjs --webdriver=9515 --debug=true --webdriver-loglevel=DEBUG

# ## Selenium
# http://goo.gl/qTy1IB
#
#    java -jar ~/Downloads/selenium-server-standalone-2.52.0.jar

# ##ChromeDriver
# Some conn reset errors on specific tests, use selnium
#
#     chromedriver --verbose --url-base=/wd/hub --port=9515

# ## Firefox Wires/Marionette
# Not working
# https://github.com/jgraham/wires/releases/download/v0.6.2/wires-0.6.2-OSX.gz
#
#     wires --webdriver-port=9515 

debug = require( 'debug' )( 'oa:test:helpers:webdriver' )
_     = require 'lodash'


class WebDriver

  @browser_client: null
  @browser = process.env.BROWSER || 'firefox'

  @screen_shot_path: (file)->
    require('path').join __dirname, 'screenshots', file

  # WaitUntil can use this
  @waitForText: ( cli, selector, test )->
    do ( cli, selector, test )->
      debug "wait for text [%s]", selector
      cli.getText(selector).then ( text )->
        debug 'waited for [%s] [%s]', text, selector
        if _.isFunction(test)
          ret = test(text)
          debug 'waited for [%s] test returned [%s]', text, ret
          ret
        else
          debug 'test result [%s]', (text is test), text, text
          text is test

  @waitForValue: ( cli, selector, test )->
    do ( cli, selector, test )->
      debug "wait for value [%s]", selector
      cli.getValue(selector).then ( value )->
        debug 'waited 50 for [%s]', value, selector
        if _.isFunction(test)
          test(value)
        else
          debug 'waited 50 for [%s]', value, selector
          value is test

  @browser_css_weight_bold: ->
    if @browser is 'firefox' then 700 else 'bold'

  @browser_css_weight_normal: ->
    if @browser is 'firefox' then 400 else 'normal'

  # This should support more options than just a the $BROWSER env var
  # Phantom needs ports
  @browser_capabililties: ->
    o =
      desiredCapabilities:
        browserName: @browser
#       singleton: true

    switch @browser
      when 'phantom'
        o.host = 'localhost'
        o.port = 9514
      when 'ie'
        o.host = '192.168.60.10'
        o.port = 5555
        o.desiredCapabilities.ignoreProtectedModeSettings = true

    if process.env.BROWSER_PORT
      o.port = process.env.BROWSER_PORT
    if process.env.BROWSER_HOST
      o.host = process.env.BROWSER_HOST
    
    debug 'generated capabilities', o
    o

  @fetch_client: ( cb )->
    self = @
    debug 'browser_client before check', @browser_client
    if @browser_client
      cb null, @browser_client
      return @browser_client

    debug 'fetch_browser_client didn\'t find one, creating new'

    client = require('webdriverio').remote WebDriver.browser_capabililties()
    client.init ->
      self.browser_client = client
      cb null, client
      debug 'browser_client after init', self.browser_client

  @fetch_authenticated_client: ( web, cb )->
    self=@
    if @browser_client_authenticated
      cb null, @browser_client_authenticated
      return @browser_client_authenticated

    @fetch_client ->
      self.browser_client
      .deleteCookie()
      .url web.url+'/login'
      .waitForExist '#form-public-login', 2000
      .setValue 'input[name=username]', web.username
      .setValue 'input[name=password]', web.password
      .submitForm '#form-public-login'
      .getTitle ( err, title )->
        #done(err) if err
        if !err and title isnt 'Dashboard'
          err = new Error "Title isn't Dashboard [#{title}]"
        self.browser_client_authenticated = self.browser_client
        cb err, self.browser_client_authenticated

  @auth: ( db )->

module.exports =
  WebDriver: WebDriver
