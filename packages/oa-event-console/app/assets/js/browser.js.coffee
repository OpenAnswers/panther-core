# # Browser

# Tests browsers for various things 
# Trusts javascript before userAgent, can let you know when they are different

class Browser


  @versions =
    tested:
      chrome: 40
      firefox: 40
#      ie: 11

    allowed:
      chrome: 20
      firefox: 20
#      ie: 11

  constructor: ( options )->
    
    @allowed_versions = {}

    @allowed_versions.chrome = options.chrome_greater_than or 0
    @allowed_versions.firefox = options.firefox_greater_than or 0

  # http://stackoverflow.com/a/9851769

  # Opera 8.0+
  @is_opera: (!!window.opr and !!opr.addons) or !!window.opera or navigator.userAgent.indexOf(' OPR/') >= 0
  
  # Firefox 1.0+
  @is_firefox: typeof InstallTrigger isnt 'undefined'
  
  # At least Safari 3+: "[object HTMLElementConstructor]"
  @is_safari: Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0

  # Internet Explorer 11
  @is_ie_11: !(window.ActiveXObject) and "ActiveXObject" in window

  # IE < 11  
  @is_old_ie: !@is_ie_11
  
  # Internet Explorer 6-11
  @is_ie: Function.apply(window,['','return /*@cc_on!@*/ false || !!window.document.documentMode;'])()
  
  # Edge 20+
  @is_edge: !@is_ie and !!window.StyleMedia
  @isnt_edge: !@is_edge
  
  # Chrome 1+
  @is_chrome: !!window.chrome and !!window.chrome.webstore
  @isnt_chrome: !@is_chrome
  
  # Blink engine detection
  @is_blink: (@is_chrome or @is_opera) && !!window.CSS


  @type: ->
    switch
      when @is_opera then 'opera'
      when @is_firefox then 'firefox'
      when @is_safari then 'safari'
      when @is_ie then 'ie'
      when @is_edge then 'edge'
      when @is_chrome then 'chrome'
      when @is_blink then 'blink'
      else 'unknown'


  # http://stackoverflow.com/a/2401861
  @browser_details: ->
    o =
      bad:      false
      tested:   false
      trusted:  false
      mobiley:  false
      version:  undefined 
      messages: []
      browser_info: @browser_info()

    if @is_chrome
      
      unless chrome_match = navigator.userAgent.match(/Chrome\/(\d+)/)
        Message.log 'Useragent doesn\'t match browser', @browser_info()
        o.messages.push 'Chrome version could not be identified'
        o.trusted = false

      else 
        o.version = chrome_match[1]
        o.trusted = true
        if o.version > @versions.tested.chrome
          o.tested = true
        else
          o.messages.push = 'It looks like you are running an old version of Chrome'
          o.tested = false

    if @is_firefox
      
      unless firefox_match = navigator.userAgent.match(/Firefox\/(\d+)/)
        Message.log 'Useragent doesn\'t match browser', @browser_info()
        o.messages.push 'Firefox version could not be identified'
        o.trusted = false

      else
        o.trusted = true
        o.version = firefox_match[1]
        if o.version > @versions.tested.firefox
          o.tested = true
        else
          o.messages.push 'It looks like you are running an old version of Firefox'
          o.version = firefox_match[1]
          o.tested = false

    if @is_ie and not @is_ie_11
      o.bad = true
      o.messages.push 'Please use Chrome, Firefox or upgrade to IE 11'

    if mobiley = navigator.userAgent.match(/(Mobile|Android|iPad|iPhone)/)
      o.mobiley = true
      o.mobiley_match = mobiley
      o.messages.push 'It looks like you are on a mobile or touch device'

    o


  @browser_info: ->
    o =
      is_opera: @is_opera
      is_firefox: @is_firefox
      is_safari: @is_safari
      is_ie: @is_ie
      is_edge: @is_edge
      is_chrome: @is_chrome
      is_blink: @is_blink
      type: @type()
      navigator: navigator


  # This is a generic html5 css property.
  # User something useful to the site
  @outdated: ->
    !@supports('borderImage')

  # Check if a browser supports a style
  #
  # JAVASCRIPT "Outdated Browser"
  # Version:    1.1.0 - 2014
  # author:     Burocratik
  # website:    http://www.burocratik.com
  # MIT
  @supports: ->
    div = document.createElement 'div'
    vendors = 'Khtml Ms O Moz Webkit'.split ' '

    ( prop )->
      if (prop in div.style) then return true

      prop = prop.replace /^[a-z]/, (val)->val.toUpperCase()

      for vendor in vendors
        if ("#{vendor}#{prop}" in div.style) then return true

      false
