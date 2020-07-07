debug_evb = debug 'oa:event:event-detail-bulk'

# # EventDetails

# Events and Class name space for all the console event details stuff


# ## Event details modal events

# onload
$ ->
  debug_evb "ON LOAD"

  # Stop key press events from bubbling past the modal to the console
#  $(EventBulkModify.id).on 'keydown keyup keypress', ( ev )->
#    debug_ev 'keypress in the modal', ev
#    ev.stopPropogation()

  $('#event-detail-bulk-modify-modal').on 'keydown keyup keypress', ( ev )->
    debug_evb 'keypress on blockme modal', ev
    ev.stopPropagation()

  # Buttons in the event_detail modal also do the actions
#  $(EventBulkModify.id).on 'click', (ev)->
#    debug_evb 'modal click ev', ev, $(ev.target)
#    event_id = $('#event-details-bulk-add-note > input[name="id"]').val()
    
#    switch $(ev.target).data('action')
#
#      when 'acknowledge'
#        send_acknowledge [event_id], ( err, res )->
#          ConsoleSocketIO.get_event_detail event_id


  # The event detail "add note" form handler
  $('#event-details-bulk-add-note').submit (ev)->
    EventBulkModify.update ev


  # Capture the close event, and fix the modal status
  $(EventBulkModify.id).on 'hidden.bs.modal', ( ev )->
    EventBulkModify.modal = false

  # Capture the show event, and fix the modal status
  $(EventBulkModify.id).on 'shown.bs.modal', ( ev )->
    EventBulkModify.modal = true

class EventBulkModify
  @id: '#event-detail-bulk-modify-modal'
  @modal: false
  @event_ids = []

  @show: (event_ids)->
    $(@id).modal('show')
    debug_evb "SHOW BM", event_ids
    $('#event-details-bulk-add-note > input[name="externalid"]').val("")
    $('#event-details-bulk-add-note > input[name="note"]').val("")
    @event_ids = event_ids
    @modal = true
  
  @hide: ()->
    $(@id).modal('hide')
    debug_evb "HIDE BM"
    @modal = false
    @event_ids = []

  @update: (ev)->
    self = @
    debug_evb "update note"
    ev.preventDefault()
    # Get the note
    note = $('#event-details-bulk-add-note > input[name="note"]').val()
    # Get the external ID
    external_id = $('#event-details-bulk-add-note > input[name="externalid"]').val()
  
    # Run away
    return if note.match /^\s*$/

    send_acknowledge_with_note @event_ids, note, external_id, (err,res)->
      debug_evb "done update",res
      $('#event-details-bulk-add-note > input[name="note"]').val('')
      $('#event-details-bulk-add-note > input[name="externalid"]').val('')
      self.hide()

  @blah:()->
    socket.emit 'events::acknowledge::note',
      ids: @event_ids
      external_id: external_id
      message: note
    , (err,res)->
      debug_evb "done update",res
      $('#event-details-bulk-add-note > input[name="note"]').val('')
      $('#event-details-bulk-add-note > input[name="externalid"]').val('')
      self.hide()
    for id in @event_ids
      rec = w2ui['event_grid'].get id
      #new_class = _.without rec._custom_class, 'unacknowledged'
      #rec._custom_class = _.union new_class, ['acknowledged']
      w2ui['event_grid'].set id, {acknowledged: true, owner: 'Acknowledging..'}