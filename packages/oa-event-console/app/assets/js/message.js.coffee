# ## Message

# Generic interface to show messages to the user via
# Notification from the server

class Message

  @last_message = null

  @set_last_message: ( level, msg, data)->
    @last_message =
      level: level
      msg: msg
      data: data
      

  @log: (level, msg, data)->
    now = new Date
    console.log '%s %s %s', now.toISOString(), level, msg, data

  # Log a message with custom label
  @label: ( label, msg, data )->
    @log label, msg, data
    Notification.info label, msg, data

  # Show a stronger error on exceptions. These have to be clicked to 
  # be removed from the users viewport.
  @exception: ( msg, error )->
    console.error 'Exception', msg, error.stack
    Notification.critical 'Exception', msg

  # error
  @error: ( msg, data )->
    @log 'Error Message: %s', msg, data
    Notification.error 'Error', msg, data

  # error
  @error_label: ( label, msg, data )->
    @log 'Error Message: %s: %s', label, msg, data
    Notification.error label, msg, data

  # Warn
  @warn: ( msg, data )->
    @log 'Warning Message: %s', msg, data
    Notification.warn 'Warning', msg, data

  # Warn style with a custom label
  @warn_label: ( label, msg, data )->
    @log 'Warn Message: %s: %s', label, msg, data
    Notification.warn label, msg, data

  # Info
  @info: ( msg, data )->
    @log 'Info Message: %s', msg, data
    Notification.info 'Information', msg, data

  # Info style with a custom label
  @info_label: ( label, msg, data )->
    @log 'Info Message: %s %s', label, msg, data
    Notification.info label, msg, data

  # debug
  @debug: (msg, data)->
    @log 'Debug: %s', msg, data
    if development? and development is true
      Notification.info 'Debug', msg, data

  # success
  @success: (msg, data)->
    @log 'success', msg, data
    Notification.info 'Success', msg, data

  # ### notify( type, message, data_object )
  # Notify a user with a type of message
  @notify: (type, msg, data)->
    console.log "Message:", type, msg, data
    Notification.info type, msg, data
    #   style:          'panther'
    #   className:      type
    #   autoHide:       true
    #   autoHideDelay:  @timeout
    #   clickToHide:    true
    #   globalPosition: 'bottom right'
