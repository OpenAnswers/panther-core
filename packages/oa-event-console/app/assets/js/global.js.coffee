# # Global JS

debug_global = debug('oa:event:console:globals')

# ### Global setup

$ ->

  socket.on 'logout', ( payload ) ->
    debug_global "You have been logged out"
    window.location.href = '/logout'

  socket.on 'ping', ( payload ) ->
    socket.emit 'pong', {}

  socket.on 'message', ( payload )->

    debug_global 'got a message %j', payload

    # Handle errors a bit more abruptly
    if payload.error?
      Message.exception "#{payload.error}: #{payload.message}"

    # Otherwise, just do what we are told
    else if payload.type?
      #error warn info success
      msg =  "#{payload.message}"
      auto_hide = if payload.timeout? then true else false
      timeout   = if payload.timeout? then (payload.timeout * 1000) else 30000
      className = if payload.type? then payload.type else 'info'
      Message.notify payload.type, msg, payload.data

  # Scrolley anchors
  # doc_root = $('html, body')

  # $('.container a').click ->
  #   doc_root.animate
  #     scrollTop: $( $.attr(this, 'href') ).offset().top
  #   , 300
  #   false


  # nav mouseover dropdowns
  # Hide the dropdown on click
  $('ul.nav li.dropdown').hover ->
    $(this).find('.dropdown-menu').stop(true, true).delay(40).fadeIn(100)
  , ->
    $(this).find('.dropdown-menu').stop(true, true).delay(80).fadeOut(200)


  # dropdown-persistant
  # A bootstrp dropdown that doesn't close when clicked in

  $('.dropdown.dropdown-persistant ul.dropdown-menu').on "click", ( ev )->
    ev.stopPropagation()

  # $('.dropdown.dropdown-persistant').on
    
  #   "shown.bs.dropdown": ()->
  #     @closable = false

  #   "click": ( ev )->
  #     if $(ev.target).hasClass 'btn'
  #       @closable = true
  #     else
  #       @closable = false

  #   "hide.bs.dropdown": ()->
  #     return @closable

  $('#console-support').on "click", (ev)->
    ev.preventDefault()
    $('#console-support-modal').modal()
    false


# ## Socketio Handling
console.log 'Connecting socket.io to %s', window.location.origin
socket = io "#{window.location.origin}",
#  transports: ['websocket', 'polling', 'flashsocket'] #[ 'websocket', 'polling-xhr', 'polling', 'polling-jsonp', 'polling' ]
  reconnectionDelay: 200
  reconnectionDelayMax: 30000


# Not sure this is needed due to messaging
socket.on 'connect', ()->
  $('.nav-connectionstatus-label')
    .removeClass 'label-danger'
    .addClass 'label-success'
    .delay 2000
    .removeClass 'in'
    
  # $('.console-toolbar-connectionstatus-icon')
  #   .removeClass 'glyphicon-ban-circle'
  #   .addClass 'glyphicon-ok-circle'
  $('.nav-connectionstatus-text').html ' '
  $('.nav-connectionstatus-text').slideUp('slow')
  
  Message.log "Connected to the Panther feed"


# Not sure this is needed due to messaging
socket.on 'disconnect', ( data )->
  $('.nav-connectionstatus-label')
    .addClass 'label-danger in'
    .removeClass 'label-success hide'
  $('.nav-connectionstatus-text').slideDown('slow')
  $('.nav-connectionstatus-text').html 'Disconnected'
  Message.error "You have lost your connection to the Panther feed"


# Not sure this is needed due to messaging
socket.on 'reconnect_attempt', ( data )->
  $('.nav-connectionstatus-label')
    .addClass 'label-danger in'
    .removeClass 'label-success hide'
  # $('.nav-connectionstatus-icon')
  #   .removeClass 'glyphicon-ok-circle'
  #   .addClass 'glyphicon-ban-circle'
  $('.nav-connectionstatus-text').html "Reconnecting (#{data})"
  Message.log "Reconnect attempt [#{data}]"


# Not sure this is needed due to messaging
socket.on 'reconnect_failed', ( data )->
  $('.nav-connectionstatus-label')
    .addClass 'label-danger in'
    .removeClass 'label-success hide'
  $('.nav-connectionstatus-text').html 'Connection failed'
  Message.log "Reconnection failed [#{data}]"


# Not sure this is needed due to messaging
socket.on 'reconnect_error', ( data )->
  $('.nav-connectionstatus-label')
    .addClass 'label-danger in'
    .removeClass 'label-success hide'
  Message.log "Reconnection error [#{data}]"


# Stop disonnect message on navigation
window.onbeforeunload = ->
  socket.off 'disconnect'
  undefined



