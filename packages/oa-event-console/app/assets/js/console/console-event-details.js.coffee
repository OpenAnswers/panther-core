debug_ev = debug 'oa:event:event-detail'

# # EventDetails

# Events and Class name space for all the console event details stuff


# ## Event details modal events

# onload
$ ->

  # Buttons in the event_detail modal also do the actions
  $(EventDetails.id).on 'click', (ev)->
    debug_ev 'modal click ev', ev, $(ev.target)
    event_id = $('#event-details-add-note input[name="id"]').val()
    
    switch $(ev.target).data('action')

      when 'acknowledge'
        send_acknowledge [event_id], ( err, res )->
          ConsoleSocketIO.get_event_detail event_id, 'default', true

      when 'unacknowledge'
        send_unacknowledge [event_id], ( err, res )->
          ConsoleSocketIO.get_event_detail event_id, 'default', true

      when 'delete'
        send_delete [event_id], ( err, res )->
          EventDetails.hide()

      when 'clear'
        send_clear [event_id], ( err, res )->
          #ConsoleSocketIO.get_event_detail event_id, 'default', true
          EventDetails.hide()

      when 'create-rule'
        window.location = "/rules/new##{event_id}"

      when 'assign'
        user = $(ev.target).data('user')
        return Message.error('No user') unless user
        debug_ev 'event details assign user', user
        send_assign [event_id], user, ( err, res )->
          ConsoleSocketIO.get_event_detail event_id, 'default', true

      when 'severity'
        severity = $(ev.target).data('severity')
        return Message.error('No severity') unless severity
        debug_ev 'event details update severity', severity
        send_severity [event_id], severity, ( err, res )->
          ConsoleSocketIO.get_event_detail event_id, 'default', true


  # Show one of the event details modal console-toolbar-search-iconndhf                           
  $('#event-details-modal-tabpanel a').click (ev)->
    ev.preventDefault()
    $(this).tab 'show'


  # The event detail "add note" form handler
  $('#event-details-add-note').submit (ev)->
    ev.preventDefault()
    # Get the event ID currently loaded in the modal
    event_id = $('#event-details-add-note input[name="id"]').val()
    # Get the note
    note = $('#event-details-add-note input[name="note"]').val()
    # Run away
    return if note.match /^\s*$/

    # Send the socket message
    socket.emit 'event_add_note',
      id: event_id
      message: note
    , ( err, res )->
      # The callback for the server to call once the emit is processed
      # Reload the event in the modal
      ConsoleSocketIO.get_event_detail event_id
      # Clear the form note
      $('#event-details-add-note input[name="note"]').val('')


  # Capture the close event, and fix the modal status
  $(EventDetails.id).on 'hidden.bs.modal', ( ev )->
    EventDetails.modal = false

  # Capture the show event, and fix the modal status
  $(EventDetails.id).on 'shown.bs.modal', ( ev )->
    EventDetails.modal = true

  # Stop key press events from bubbling past the modal to the console
  $(EventDetails.id).on 'keydown keyup keypress', ( ev )->
    debug_ev 'keypress in the modal', ev
    ev.stopPropagation()


# ## EventDetail namespace for functions

class EventDetails

  @id: '#event-details-modal'

  @modal: false
  # ### Summary tab

  # @detail_fields are the fields that display on the "event detail tab"
  @detail_fields = [ 'node', 'owner', 'severity', 'group' ]

  # Store the two templates
  @details_fields_template = $('#event-details-details-field-template').html()
  Mustache.parse @details_fields_template
  @details_fields_el = $('#event-details-widget-fields')

  @details_summary_template = $('#event-details-details-summary-template').html()
  Mustache.parse @details_summary_template
  @details_summary_el = $('#event-details-widget-summary')

  @show: (tab_field = 'default')->
    debug_ev 'showing event details for tab field', tab_field
    $(@id).modal('show')

    switch tab_field

      when 'notes'
        $('#event-details-modal-tabpanel a[href="#event-details-modal-notes"]').tab('show')

      when 'details'
        $('#event-details-modal-tabpanel a[href="#event-details-modal-details"]').tab('show')

    @modal = true

  @hide: ()->
    $(@id).modal('hide')
    @modal = false

  # Render the details section
  @details: ( data )->
    
    # Make the text render similarly in html
    fancy_summary = data.summary.escapeHTML()
      .replace /\f/gm, '<br><br>'
      .replace /\r?\n\t/gm, '<br>'
      .replace /\r?\n/gm, '<br>'
      .replace /\s/gm, '&nbsp;'
    
    # Loop over all the required fields to render
    for field in @detail_fields
      @details_fields_el = $("#event-details-widget-field-#{field}")
      field_data =
        title: _.capitalize( field )
        content: data[field]
      debug_ev 'rendering field', field, field_data
      @details_fields_el.html Mustache.render @details_fields_template, field_data
    
    # Summary is seperate
    @details_summary_el.html Mustache.render @details_summary_template,
      summary: fancy_summary


  # ### Notes tab
  @notes_template = $('#event-details-notes-template').html()
  Mustache.parse @notes_template
  @notes_el = $('#event-details-modal-notes-table')

  @notes: ( data )->
    @notes_el.html Mustache.render( @notes_template, data )
    if data.notes.length == 0
      @notes_el.append "<tr><td>No notes</td></tr>"

  # ### History tab
  @history_template = $('#event-details-history-template').html()
  Mustache.parse @history_template
  @history_el = $('#event-details-modal-history-table')

  @history: ( data )->
    @history_el.html Mustache.render( @history_template, data )
    if data.history.length == 0
      @history_el.append "<tr><td>No history</td></tr>"

  # ### matches tab
  @matches_global_template = $('#event-details-matches-global-row-template').html()
  @matches_group_template = $('#event-details-matches-group-row-template').html()
  @matches_rule_template = $('#event-details-matches-rule-row-template').html()

  Mustache.parse @matches_global_template
  Mustache.parse @matches_group_template
  Mustache.parse @matches_rule_template
  @matches_global = $('#event-details-modal-global-matches-table tbody')
  @matches_group = $('#event-details-modal-group-matches-table tbody')

  @matches: ( data )->
    @matches_global.html ''
    @matches_group.html ''

    all_matches_global = _.get data, "matches.global", []
    all_matches_group = _.get data, "matches.group", []

    if all_matches_global.length == 0
      @matches_global.append "<tr><td>No matches</td></tr>"
    for glmatch in all_matches_global
      render_data =
        name: glmatch.name
        uuid: glmatch.uuid.split("-")[0]
        uuid_full: glmatch.uuid
      debug "Render data", render_data
      @matches_global.append Mustache.render @matches_global_template, render_data

    if all_matches_group.length == 0
      @matches_group.append "<tr><td>No matches</td></tr>"
    for grmatch in all_matches_group
      render_data =
        group_name: grmatch.group_name
        group_uuid: grmatch.group_uuid.split("-")[0]
        group_uuid_full: grmatch.group_uuid
      @matches_group.append Mustache.render @matches_group_template, render_data
      for rumatch in grmatch.matches
        rule_data =
          name: rumatch.name
          uuid: rumatch.uuid.split("-")[0]
          uuid_full: rumatch.uuid
        @matches_group.append Mustache.render @matches_rule_template, rule_data

    true


  # ### Details tab
  @fields_template = $('#event-details-fields-row-template').html()
  Mustache.parse @fields_template
  @fields_el = $('#event-details-modal-fields-table')

  @fields: ( data )->
    order = @leftover_fields data
    @fields_el.html ''
    @fields_el.append $('#event-details-fields-heading-template').html()
    for key in order
      @fields_el.append Mustache.render @fields_template,
        name: key
        value: data[key]
    true


  # Some columns we don't want in the event_detail modal
  @top_fields: [ 'node', 'summary' ]
  @ignore_fields: [ 'notes', 'history', 'matches', 'autoincr_id', '__v', 'occurrences' ]


  # Work out the fields we should display in details
  @leftover_fields: ( event_data )->
    _.difference _.keys(event_data).sort(),
      @ignore_fields


  @button_ack_el = $('.btn.event-detail-acknowledge')
  @button_unack_el = $('.btn.event-detail-unacknowledge')

  @buttons: ( data )->
    if data.acknowledged
      @button_ack_el.hide()
      @button_unack_el.show()
      @button_unack_el.focus()
    else
      @button_ack_el.show()
      @button_ack_el.focus()
      @button_unack_el.hide()

  
  # ###### store_id( data )
  # Store the id so notes can submit with it
  @store_id: ( data )->
    $('#event-details-add-note input[name="id"]').val data._id


  # ###### chart( data )
  # Render the chart from the id in `data`
  @chart: ( data )->
    if data.occurrences
      debug_ev 'got occurences', data.occurrences
      $('#ev-occurrences').html("")
      #Occurrence.c3_time '#ev-occurrences', data.occurrences
      Occurrence.event_time_dots '#ev-occurrences', data.occurrences,
        size: 15


  # ### render( data )
  # Render all the components of event details
  @render: ( data )->
    @store_id data
    @details data
    @notes data
    @history data
    @matches data
    @fields data
    @buttons data
    @chart data
