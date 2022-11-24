# # DeleteAll

# Methods for rendering the admin delete section
# The class is only really for namespacing methods

debug_delete_all = debug 'oa:event:console:delete:all'

# ## Class

class DeleteAll

  @delete_all_id = "#delete-all-button"
  @delete_all_confirmation_id = "#delete-all-button-confirmed"

  @show_confirmation: ()->
    debug_delete_all "showing confirmation"
    $(@delete_all_confirmation_id).show()

  @hide_confirmation: ()->
    debug_delete_all "hiding confirmation"
    $(@delete_all_confirmation_id).hide()

  @delete_confirmed: ()->
    debug_delete_all "sending delete all"
    @send_delete (err, response)->
      debug_delete_all "Deletion responded with", response
      if err
        Message.error "Deletion failed"
      else
        if response.rows > 0
          Message.info_label "All events were Deleted (count=#{response.rows})"
        else
          Message.info_label "No events were Deleted" 
    @hide_confirmation()

  # Send Delete to server
  @send_delete: ( cb ) ->
    debug_delete_all 'delete all'
    socket.emit 'events::delete::all', {}, ( error, response )->
      debug_delete_all 'deleted apikey', response
      #send_read_all
      if cb then cb( error, response )
    debug_delete_all 'deleting all events'



$ ->
  # Setup the socket message listeners

  socket.on 'admin::delete::all', ( response )->
    debug "Deleted", response

  DeleteAll.hide_confirmation()

  $('#delete-all-button').on 'click', (ev) ->
    ev.preventDefault()
    DeleteAll.show_confirmation()

  $('#delete-all-button-confirmed').on 'click', (ev) ->
    ev.preventDefault()
    DeleteAll.delete_confirmed()
