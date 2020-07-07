# ## Notification

# Generic interface to show notifications to the user

# Styles are mainly controlled in global.css. Some defaults are included here

class Notification

  @timeout = 10000

  @style = 'panther'

  $.notify.addStyle "info",
    html: """
          <div>
          <div class='notification'>
            <div class='notification-colour'></div>
            <div class='notification-content'>
              <div class='notification-title' data-notify-html='title' />
              <div class='notification-message' data-notify-text='message' />
            </div>
          </div>
          </div>
          """

    classes:
      base:
        "position":           "relative"
        "width":              "350px"
        "overflow":           "hidden"
        "background-color":   "white"
        "border-radius":      "2px"
        "color":              "#616161"

  @notification: (type, title, message, data = {} ) ->
    timeout = if data.timeout then data.timeout else @timeout
    $.notify {title: title, message: message },
      style:         'info'
      autoHide:      true
      autoHideDelay: timeout
      clickToHide:   true
      globalPosition: 'bottom right'
      className:      type

  @info: (title, message, data = {}) ->
    @notification 'info', title, message, data

  @warn: (title, message, data) ->
    @notification 'warn', title, message, data

  @error: (title, message, data) ->
    @notification 'error', title, message, data

  @critical: (title, message, data) ->
    $.notify {title: title, message: message},
      style:         'info'
      autoHide:      false
      clickToHide:   true
      globalPosition: 'bottom right'
      className:      'critical'


  # title:message = data
  @current = {}
  @info_dedupe: (title, message, data = {}) ->
    data._notifications_nid = Helpers.random_string 7
    data._notifications_timeout_ts = Date.now()+@timeout
    key = "#{title}:#{message}"
    if @current[key] and @current[key]._notifications_timeout_ts < Date.now()
      @notification 'info', title, message+"duplicate", data
    else
      @current[key] = data
      data._notifications_count = 1
      @notification 'info', title, message, data
