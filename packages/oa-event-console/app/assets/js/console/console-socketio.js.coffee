
# Setup debug instance for the socketios
debug_socketio = debug 'oa:event:console:socketio'


# ### On Load
$ ->

  # Setup the console socket message listeners

  socket.on 'deletes', ( deletes )->
    on_deletes deletes

  socket.on 'inserts', ( inserts )->
    on_inserts inserts

  socket.on 'deltas', ( data )->
    on_deltas data

  socket.on 'events::ids', ( data )->
    on_ids data


  # Not sure this is needed due to messaging
  socket.on 'error', ( data )->
    Message.error data.message, data.error

  console_process_hash window.location.hash



# ### ConsoleSocketIO
#
# A namespace for all the socketio related functions

class ConsoleSocketIO

  # ###### get_event_detail( event_id )
  # This requests the event detail data
  # The callback is executed by the server when the data is ready
  @get_event_detail: ( id, tab_field = 'default', redisplay = false )->
    debug_socketio 'event_detail id', id
    ClipBoard.set_events_copy_text [ id ]
    socket.emit 'event::details', id: id, ( err, data )->
      if err
        debug_socketio err.message
        return Message.error "Could not retrieve event details"

      # Don't show the modal again - only 'redisplay' using current details
      unless redisplay
        EventDetails.show(tab_field)
        window.location.hash = "/event/#{id}"

      ConsoleSocketIO.on_event_details(data)

  # ###### `on_event_details( data )`
  # Process the event_details response into HTML by calling
  # the render method on EventDetails
  @on_event_details: ( data )->
    EventDetails.render data


# ###### `delete_from_grid( ids )`
# Delete an array of ids from the local w2ui grid
delete_from_grid = ( delete_ids )->
  del = []
  missing = []

  for id in delete_ids
    if rec = w2ui['event_grid'].get(id)
      debug_socketio 'deleting rec', rec.recid
      del.push id
    else
      missing.push id

  w2ui['event_grid'].remove del...

  if missing.length > 0
    console.log "Couldn't delete ids that were already gone", missing

  del


# ###### `on_deletes( ids )`
# Delete an array of ids from the local w2ui grid
on_deletes = ( deletes )->
  time = Date.now()
  debug_socketio 'got deletes', deletes.data.join(' ')
  
  selected = w2ui['event_grid'].getSelection(true)
  del = delete_from_grid deletes.data

  w2ui['event_grid'].refresh()

  console.log 'Deleting [%s] records completed in [%s]ms', del.length, Date.now() - time
  if del.length != deletes.data.length
    console.warn "Couldn't delete some records", _.difference(del, deletes.data)

  w2ui['event_grid'].select selected


# Ids
# On updates the system will send out the list of ID's that should be in your
# view. This is so a console can pick up deletes that have no event
# and updates that take an event out of your view/filter
on_ids = ( data )->
  debug_socketio 'events::ids data [%j] %j', data, w2ui['event_grid'].records

  deletes = []

  for rec in w2ui['event_grid'].records
    continue unless rec and rec.recid
    debug_socketio 'rec.recid[%s] ids[%s]', rec.recid, data.ids[rec.recid]
    unless data.ids[rec.recid] is 1
      deletes.push rec.recid

  w2ui['event_grid'].remove deletes...


# Insert records
on_inserts = ( inserts )->
  debug_socketio 'inserts since', inserts.since

  # The refresh will mess with selections
  ids = w2ui['event_grid'].getSelection()
  w2ui['event_grid'].selectNone()

  # Build the intial record
  inserts.data.forEach ( doc )->
    mongo_to_grid doc
  #   res = w2ui['event_grid'].add doc

  w2ui['event_grid'].clear()
  res = w2ui['event_grid'].add inserts.data
  debug_socketio 'loaded', res

  # Get current sort column, or default to last_occurrence
  column = w2ui['event_grid'].oa_config.sort_column
  direction = w2ui['event_grid'].oa_config.sort_direction

  # Put the selection back
  w2ui['event_grid'].select ids...

  debug_socketio 'sorted', res
  # Setup the update listener now
  # We have the inserts done


# Update records
on_deltas = ( data )->
  to_add = []
  console.log 'Received delta message from server'
  debug_socketio 'deltas', data

  if data.inserts? and data.inserts.length > 0
    res = w2ui['event_grid'].add data.inserts
    debug_socketio 'added', res


  if data.updates? and data.updates.length > 0
    
    data.updates.forEach ( doc )->

      mongo_to_grid doc
      debug_socketio 'delta doc recieved: ', doc

      unless doc.recid?
        console.error 'Record has no recid', doc
        return

      # Update or save to add later
      res = w2ui['event_grid'].set doc.recid, doc, true
      if res
        debug_socketio "Updated result [#{res}]"
      else
        to_add.push doc
     
      #if doc.severity is 4
        #Message.warn "#{doc.node} event #{doc.summary}"

      #if doc.severity is 5
        #Message.error "#{doc.node} event #{doc.summary}"

    # The refresh will mess with selections
    ids = w2ui['event_grid'].getSelection()
    w2ui['event_grid'].selectNone()

    # Add the records we saved that weren't updates
    if to_add.length > 0
      add = w2ui['event_grid'].add to_add
      debug_socketio 'deleta added [%s] records', add
    else
      sort = w2ui['event_grid'].localSort()
      ref  = w2ui['event_grid'].refresh()
      debug_socketio 'refresh', ref, sort
    
    # Put the selection back
    w2ui['event_grid'].select ids...




# Delete the serials
on_serials = ( data )->
  # loop over records and delete any not in serials list
  # We only get these messages in a filter, after updates


# Change this to onRender add a class based on ack value
send_acknowledge = ( ids, cb )->
  debug_socketio 'acking ids', ids
  socket.emit 'events::acknowledge',
    ids: ids
  , cb
  debug_socketio 'recs before ack', w2ui['event_grid'].get ids
  console.log 'Acknowledging event', ids
  for id in ids
    rec = w2ui['event_grid'].get id
    #new_class = _.without rec._custom_class, 'unacknowledged'
    #rec._custom_class = _.union new_class, ['acknowledged']
    w2ui['event_grid'].set id, {acknowledged: true, owner: 'Acknowledging..'}
  #w2ui['event_grid'].select selected...
  debug_socketio 'recs after ack', w2ui['event_grid'].get ids

send_acknowledge_with_note = ( ids, message, external_id, cb )->
  debug_socketio 'acking ids', ids
  socket.emit 'events::acknowledge::note',
    ids: ids
    external_id: external_id
    message: message
  , cb
  debug_socketio 'recs before ack', w2ui['event_grid'].get ids
  console.log 'Acknowledging event', ids
  for id in ids
    rec = w2ui['event_grid'].get id
    #new_class = _.without rec._custom_class, 'unacknowledged'
    #rec._custom_class = _.union new_class, ['acknowledged']
    w2ui['event_grid'].set id, {acknowledged: true, owner: 'Acknowledging..'}
  #w2ui['event_grid'].select selected...
  debug_socketio 'recs after ack', w2ui['event_grid'].get ids

send_external_id = ( ids, external_id, cb )->
  debug_socketio 'external ids', ids
  socket.emit 'events::external_id',
    ids: ids
    external_id: external_id
  , cb
  debug_socketio 'recs before extid', w2ui['event_grid'].get ids
  console.log 'Updating external ID for ids', ids
  for id in ids
    rec = w2ui['event_grid'].get id
    w2ui['event_grid'].set id, {external_id: external_id}
  debug_socketio 'recs after extid', w2ui['event_grid'].get ids

# Change this to onRender add a class based on ack value
send_unacknowledge = ( ids, cb )->
  debug_socketio 'unacking ids', ids
  socket.emit 'events::unacknowledge', {ids: ids}, cb
  debug_socketio 'recs before unack', w2ui['event_grid'].get ids
  console.log 'Unacknowledging event', ids
  for id in ids
    rec = w2ui['event_grid'].get id
    #new_class = _.without rec._custom_class, 'acknowledged'
    #rec._custom_class = _.union new_class, ['unacknowledged']
    w2ui['event_grid'].set id, {acknowledged: false}
    #w2ui['event_grid'].refreshRow id
  debug_socketio 'recs after unack', w2ui['event_grid'].get ids


send_assign = ( ids, user, cb )->
  debug_socketio 'assign ids', ids, user
  socket.emit 'events::assign',
    ids:  ids
    user: user
  , ( err,data )->
    return err if err
    debug_socketio 'locally assigning'
    for id in ids
      w2ui['event_grid'].set id, owner: user, true
    w2ui['event_grid'].refresh()
    cb(err,data) if _.isFunction(cb)

  
  debug_socketio 'locally assigned', ids


# Send the delete message, locally deleting on response
send_delete = ( ids, cb )->
  debug_socketio 'delete ids', ids
  socket.emit 'events::delete', {ids:  ids}, ( err, res )->
    if err
      return Message.error err
    debug_socketio 'locally deleting'
    w2ui['event_grid'].remove ids...
    w2ui['event_grid'].selectNone()
    
    debug_socketio 'locally deleted', ids...
    if cb then cb()


# Send the clear message, locally clearing on response
send_clear = ( ids, cb )->
  debug_socketio 'clearing ids', ids
  socket.emit 'events::clear', { ids: ids }, ( err, res )->
    if err
      return Message.error err

    w2ui['event_grid'].selectNone()

    for id in ids
      rec = w2ui['event_grid'].get id
      w2ui['event_grid'].set id, { severity: 0 }

    debug_socketio 'recs after clear', w2ui['event_grid'].get ids
    if cb then cb()



send_action = ( ids, type )->
  debug_socketio 'action ids', ids
  socket.emit 'action',
    type: type
    ids: ids


send_severity = ( ids, severity_value, cb )->
  debug_socketio 'severity ids', ids, severity_value
  socket.emit 'events::severity',
    severity: parseInt(severity_value)
    ids: ids
  , cb

  for id in ids
    rec = w2ui['event_grid'].get id
    w2ui['event_grid'].set id, { severity: severity_value }

  debug_socketio 'recs after sev', w2ui['event_grid'].get ids


# ###### set_view( view_id, client_callback )
# Set a view on the server and client
set_view = ( id, name )->
  socket.emit 'console::set_view', id: id, ( err )->
    return Message.error err if err
    $('.dropdown-menu').stop(true, true).fadeOut(100)
    w2ui['event_grid'].clear()
    socket.emit 'populate'
    $('.console-view-name').html name
    # Once we've set a filter. repopulate the grid records


# ###### set_group( group_name, client_callback )
# Set a group on the server and client (modifies filter)
set_group = ( name )->
  socket.emit 'console::set_group', group: name, ( err )->
    return Message.error err if err
    $('.dropdown-menu').stop(true, true).fadeOut(100)
    w2ui['event_grid'].clear()
    socket.emit 'populate'
    $('.console-group-name').html name
    # Once we've set a group. repopulate the grid records


# ###### set_severity( severity_label, client_callback )
# Set a group on the server and client (modifies filter)
set_severity = ( label )->
  socket.emit 'console::set_severity', severity: label, ( err )->
    return Message.error err if err
    $('.dropdown-menu').stop(true, true).fadeOut(100)
    w2ui['event_grid'].clear()
    socket.emit 'populate'

    switch label.toLowerCase()
      when "indeterminate" then colour = "purple"
      when "warning" then colour = "blue"
      when "minor" then colour = "yellow"
      when "major" then colour = "orange"
      when "critical" then colour = "red"
      else colour = "white"

    newHtml = """
      <span class="colour-severity-dropdown colour-#{colour}"></span>
      <span style="float: left">#{label}</span>
    """
    
    $('.console-severity-name').html newHtml
    # Once we've set a group. repopulate the grid records


# ###### set_group_and_view( group_name, view_id, view_name )
# Set both the group then the view, populating at the end
set_group_and_view = ( group_name, filter_id, filter_name )->
  
  socket.emit 'console::set_group', group: name, ( err )->
    return Message.error err if err
    $('.console-view-name').html filter_name

    socket.emit 'console::set_view', id: filter_id, ( err )->
      return Message.error err if err
      w2ui['event_grid'].clear()
      socket.emit 'populate'
      $('.console-group-name').html


# ###### set_group_and_severity( group_name, view_id, view_name )
# Set both the group then severity, populating at the end
set_group_and_severity = ( group_name, severity )->
  
  socket.emit 'console::set_group', group: name, ( err )->
    return Message.error err if err
    $('.console-view-name').html filter_name

    socket.emit 'console::set_severity', severity: severity, ( err )->
    return Message.error err if err
      $('.dropdown-menu').stop(true, true).fadeOut(100)
      w2ui['event_grid'].clear()
      socket.emit 'populate'
      $('.console-severity-name').html label
      # Once we've set a group. repopulate the grid records
