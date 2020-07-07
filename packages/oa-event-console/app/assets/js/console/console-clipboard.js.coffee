debug_clipboard = debug 'oa:event:console:clipboard'



class ClipBoard

  @clipboard_brief_fields = [
    'node', 'tag', 'summary', 'last_occurrence', 'first_occurrence', 'severity', 'group', 'agent', 'tally'
  ]

  @clipboard_skip_fields = [
    'history', 'notes', 'autoincr_id', '__v', '_custom_class', 'style'
  ]

  # Store an array of the w2ui fields
  @w2ui_fields: _.pluck( w2grid_all_columns, 'field' )


  # Return the text for the brief details of an event
  @copy_event_text_brief: ( event )->

    text = for field in @clipboard_brief_fields
      event_field_data = event[field] || ""

      if w2_is_date_field( field )
        event_field_data = ts_to_locale event_field_data

      text = "#{field}: #{event_field_data}"

    text.join "\n"


  # Return the text for a complete event
  @copy_event_text_all: ( event )->
    event_fields = _.keys( event )
    configured_fields = _.intersection( @w2ui_fields, event_fields )
    event_extra_fields = _.difference( @w2ui_fields, event_fields )
    fields = configured_fields.concat event_extra_fields
    fields = _.without( fields, @clipboard_skip_fields )
    
    text = for field in fields
      event_field_data = event[field]
      
      if w2_is_date_field( field )
        event_field_data = ts_to_locale event_field_data

      text = "#{field}: #{event_field_data}"

    text.join "\n"



  # This needs to be triggered some time before the copy so that the
  # html elements have the correct content when the flash "click" happens

  @set_event_copy_text: ( id )->
    # populate summary data somewhere
    event = w2ui['event_grid'].get id

    debug_clipboard 'ev to copy', event, @w2ui_fields

    clipboard_full_text = ClipBoard.copy_event_text_all event
    clipboard_brief_text = ClipBoard.copy_event_text_brief event

    [ clipboard_full_text, clipboard_brief_text ]


  @set_events_copy_text: ( ids )->
    clipboard_brief_text = ''
    clipboard_full_text = ''
    for id in ids
      [clipboard_full_text_id, clipboard_brief_text_id] = @set_event_copy_text id
      clipboard_full_text += clipboard_full_text_id + "\n\n"
      clipboard_brief_text += clipboard_brief_text_id + "\n\n"

    # populate full event detail somewhere
    #clipboard.setText clipboard_full_text
    $('#clipboard_full_text').val clipboard_full_text
    debug_clipboard 'set full text to', $('#clipboard_full_text').val()

    $('#clipboard_brief_text').val clipboard_brief_text
    debug_clipboard 'set summary text to', $('#clipboard_brief_text').val()


# window on load
$ ->

  # ### Copy event to clipboard

  # This uses clipboard to copy event data into the clipboard
  # use "text: ()=> " to grab from hidden element

  clipboard_details_full = new Clipboard 'a.copy-details-full', text: ()->
    $('#clipboard_full_text').val()

  clipboard_details_brief = new Clipboard 'a.copy-details-brief', text: ()->
    $('#clipboard_brief_text').val()

  clipboard_brief = new Clipboard 'a.copy-context-brief', text: ()->
    $('#clipboard_brief_text').val()
