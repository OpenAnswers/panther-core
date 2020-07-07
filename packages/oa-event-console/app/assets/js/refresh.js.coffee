# # Refresh

# Refresh your page on server changes, usually for a dev environment

# Requires socket or /status support on the server for
# it's refresh data

class Refresh

  @logger: debug 'oa:refresh'

  # Track the previous start and update time
  @start_time =  null
  @update_time = null

  # How often to run
  @timeout = 1000

  # -----------------------------------------------------------------
  # ###### `Function `Refresh.run()`
  # Main entry point
  @run: ()->
    if typeof socket is 'undefined'
      Refresh.logger 'running poll'
      Refresh.run_ajax_poll()
    else
      Refresh.logger 'running socket'
      Refresh.run_socket()


  # -----------------------------------------------------------------
  # ###### `Function `Refresh.run_ajax_poll()`
  # If we have a socket io connection `socket` use that
  @run_socket: ()->

    # Reload when the app has restarted
    socket.on 'time_start', ( msg )->
      if !Refresh.start_time
        Refresh.start_time = msg.start

      if !Refresh.update_time
        Refresh.update_time = msg.update
      
      if ( Refresh.start_time != msg.start )
        location.reload()

    # Reload when a view updates
    socket.on 'time_update', ( msg )->
      Refresh.update_time = msg.time
      location.reload()

  # -----------------------------------------------------------------
  # ###### `Function `Refresh.run_ajax_poll()`
  # Use the `/api/status` api call
  @run_ajax_poll: ()->

    Refresh.logger 'send request'
    $.ajax
      url: "/status/time"
      timeout: 2000
      complete: ->
        Refresh.logger 'set next timeout'
        setTimeout ->
          Refresh.run_ajax_poll()
        , 1000
      success: (data)->
        Refresh.logger 'request returned',
          Refresh.start_time, Refresh.update_time, data
        if !Refresh.start_time
          Refresh.start_time = data.time.start
        if !Refresh.update_time
          Refresh.update_time = data.time.update
        if ( Refresh.start_time isnt data.time.start )
          location.reload()
        if ( Refresh.update_time isnt data.time.update )
          location.reload()
      error: (error)->
        Refresh.logger 'failed', error
      dataType: "json"

# auto run when included
Refresh.run()
