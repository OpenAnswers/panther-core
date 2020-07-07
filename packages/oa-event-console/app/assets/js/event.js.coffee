
# http://lions-mark.com/jquery/scrollTo/

$('.scroll_spy_nav').fn.scrollTo = ( target, options, callback ) ->

  if typeof options == 'function' and arguments.length == 2
    callback = options
    options = target

  settings = $.extend
    scrollTarget  : target
    offsetTop     : 50
    duration      : 500
    easing        : 'swing'
  , options

  return this.each ->
    scrollPane = $(this)
    
    scrollTarget = if typeof settings.scrollTarget == "number"
      settings.scrollTarget
    else
      $(settings.scrollTarget)
    
    scrollY = if typeof scrollTarget == "number"
      scrollTarget
    else
      scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop)
    
    scrollPane.animate scrollTop : scrollY, parseInt(settings.duration), settings.easing, ->
      if typeof callback == 'function'
        callback.call this
