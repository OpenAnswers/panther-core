debug_evb = debug 'oa:event:event-detail-extid'

# # EventDetails

# Events and Class name space for all the console event details stuff


# ## Event external ID modal events

# onload
$ ->
  debug_evb "ON LOAD"

  $('#event-detail-extid-modify-modal').on 'keydown keyup keypress', ( ev )->
    debug_evb 'keypress on blockme modal', ev
    ev.stopPropagation()

  # The event detail "add extid" form handler
  $('#event-details-extid-add').submit (ev)->
    EventBulkExtID.update ev


  # Capture the close event, and fix the modal status
  $(EventBulkExtID.id).on 'hidden.bs.modal', ( ev )->
    EventBulkExtID.modal = false

  # Capture the show event, and fix the modal status
  $(EventBulkExtID.id).on 'shown.bs.modal', ( ev )->
    EventBulkExtID.modal = true

class EventBulkExtID
  @id: '#event-detail-extid-modify-modal'
  @modal: false
  @event_ids = []

  @show: (event_ids)->
    $(@id).modal('show')
    debug_evb "SHOW BM EXTID", event_ids
    $('#event-details-extid-add > input[name="externalid"]').val("")
    @event_ids = event_ids
    @modal = true
  
  @hide: ()->
    $(@id).modal('hide')
    debug_evb "HIDE BM EXTID"
    @modal = false
    @event_ids = []

  @update: (ev)->
    self = @
    debug_evb "update extid"
    ev.preventDefault()
    # Get the external ID
    external_id = $('#event-details-extid-add > input[name="externalid"]').val()
  
    # Run away if external ID is empty
    return if external_id.match /^\s*$/

    send_external_id @event_ids, external_id, (err,res)->
      debug_evb "done update",res
      $('#event-details-extid-add > input[name="externalid"]').val('')
      self.hide()
