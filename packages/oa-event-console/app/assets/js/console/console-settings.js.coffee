debug_settings = debug 'oa:event:settings'

# onload
$ ->
  console.log 'SETTINGS ONLOAD'

  $(ConsoleSettings.id).on 'hidden.bs.modal', (ev)->
    ConsoleSettings.modal = false

  $(ConsoleSettings.id).on 'shown.bs.modal', (ev)->
    ConsoleSettings.modal = true

  # Stop key presses from bubbling past the modal to the console
  $(ConsoleSettings.id).on 'keydown keyup keypress', (ev)->
    ev.stopPropagation()

  $(ConsoleSettings.id).on 'click', (ev)->
    debug_settings 'modal click ev', ev, $(ev.target)
    switch $(ev.target).data('action')
      when 'tracking'
        debug_settings 'tracking clicked'
        socket.emit 'settings::server::write', {tracking: 1}
      when 'tracking-on'
        debug_settings 'tracking-on clicked'
        ConsoleSettings.setTrackingOn()
      when 'tracking-off'
        debug_settings 'tracking-off clicked'
        ConsoleSettings.setTrackingOff()

  $('#console-settings-tracking').click ->
    console.log 'CLICKED'
    ConsoleSettings.setTrackingToggle()
    #socket.emit 'settings::server::write', {tracking: "toggle"}

  console.log 'FETCH'
  socket.emit 'settings::server::read'

  socket.on 'settings::server', (settings) ->
    ConsoleSettings.processSettings settings



class ConsoleSettings
  @id: '#console-settings-modal'
  @modal: false
  @tracking: 0

  @console_settings_template = $('#console-settings-template').html()
  Mustache.parse @console_settings_template


  @open: ()->
    @show()

  @show: ()->
    debug_settings 'showing'
    $(@id).modal( 'show' )
    @modal = true
    socket.emit 'settings::server::read', {}, (error, data)->
      debug_settings 'got data', data
      ConsoleSettings.tracking = data.tracking
      ConsoleSettings.displayTracking()
      data

  @hide: ()->
    $(@id).modal( 'hide' )
    @modal = false

  @processSettings: ( settings )->
    debug_settings settings

  @setTracking: (value)->
    settings =
      tracking: value
    
    socket.emit 'settings::server::write', settings, (error,data)->
      debug_settings 'setting set', data
      data
  
  @displayTracking: ()->
    if @tracking == "1"
      @displayTrackingOn()
    else
      @displayTrackingOff()

  @displayTrackingOn: ()->
    $('#console-settings-button-tracking-on').addClass('btn-success')
    $('#console-settings-button-tracking-off').removeClass('btn-warning')

  @displayTrackingOff: ()->
    $('#console-settings-button-tracking-on').removeClass('btn-success')
    $('#console-settings-button-tracking-off').addClass('btn-warning')

  @setTrackingOn: ()->
    debug_settings 'TRACKING ON'
    @displayTrackingOn()
    @setTracking(1)

  @setTrackingOff: ()->
    debug_settings 'TRACKING OFF'
    @displayTrackingOff()
    @setTracking(0)


  @setTrackingToggle: ()->
    debug_settings 'tracking ' + @tracking 
    settings =
      tracking: 0
    if @tracking == 0
      settings.tracking = 1

    @tracking = settings.tracking
    socket.emit 'settings::server::write', settings, (error, data)->
      debug_settings 'toggled', data
      data

