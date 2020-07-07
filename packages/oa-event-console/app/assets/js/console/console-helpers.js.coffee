
# Setup a debug instance for the helpers

debug_helpers = debug('oa:event:console:helpers')

# ### ts_to_locale( timestamp )
# Convert a timestamp into something readable

ts_to_locale = (ts) ->
  new Date( ts ).toLocaleString()


# ###### date_column_to_locale( record, field )
# The odd w2ui render setup doesn't easily provide the field
# to the render functions so we have to work around
# with this translation

date_column_to_locale = ( record, field )->
  ts_to_locale record[field]





# ###### w2_add_date_render( w2_columns )
# Modify a field definition to include a w2 date render function
# when it hits a display type of date in the array

w2_add_date_render = ( columns )->

  for col_def in columns
    debug_helpers 'Looking for a date type column', col_def.field
    continue unless col_def.display_type and col_def.display_type is 'Date'
    debug_helpers 'Found date type for a column', col_def.field
 
    fieldname = col_def.field

    # Closure on `fieldname` and then define the render function
    do ( fieldname )->
      col_def.render = (record, row_index, col_index)->
        debug_helpers 'Date render running', row_index, col_index, fieldname, record
        converted_date = new Date( record[fieldname] )
        if converted_date.toString() is 'Invalid Date'
          console.log 'w2_add_date_render() Date field is not convertable', fieldname, record[fieldname]
          record[fieldname]
        else
          converted_date.toLocaleString()


# ###### w2size()
# This sets the size of the w2grid to whatever is left of the screen
# after the nav bar. The nav bar doesn't take up render space so this
# needs a little bit of work
# Should be able to do this with css!!

w2size = ->
  
  debug_helpers height, $('#nav').outerHeight(true), $( window ).height()

  # Get the height of the nav bar and put the options bar below
  if $("#nav").is(":visible")
    nav_height = $( '#nav.navbar' ).outerHeight(true)
  else
    nav_height = 0
  $('#options_bar').css 'margin-top', nav_height

  # Now take the gap away from the console height
  opt_height = $( '#options_bar' ).outerHeight(true)
  height = $(window).height() - opt_height

  # Set the available height on the grid
  $('#event_grid').css 'height', height
  w2ui['event_grid'].resize()


# **Note** this relies on the `w2grid_all_columns` global :|
# Store an array of w2ui data fields
w2ui_date_fields = _.pluck(
  _.filter( w2grid_all_columns, display_type: 'Date' ),
  'field'
)
debug_helpers 'w2_is_date_fields', w2ui_date_fields

w2_is_date_field = ( field )->
  w2ui_date_fields.indexOf( field ) > -1


# ###### mongo_to_grid( document )
# Make a db doc into a w2ui record
# Should move this to the server

mongo_to_grid = ( doc ) ->

  # recid is the w2ui record key
  doc.recid = doc._id
  delete doc._id

  # We need a sev style for the row
  #doc.style = sev_style doc.severity
  
  # We can load these when we need them
  delete doc.history if doc.history
  delete doc.notes if doc.notes
  doc._custom_class = w2_row_class_render
  
  if doc.summary and _.isString doc.summary
    doc.summary = doc.summary.escapeHTML()
  else
    # If we have a generic error handler we can do things like
    # notify, log and event socket it back in one place
    Message.warn "Document didn't have a string summary\nnode[#{doc.node}] sev[#{doc.severity}]", doc

  # Acks weren't populated by default previously
  # This may be redundant now
  unless doc.acknowledged is true
    doc.acknowledged = false

  doc


# ###### w2_row_class_render()
# Modify an array of class names depending on record content

w2_row_class_render = ( record, row_cls = [] ) ->

  # Class for ack/unack
  if record.acknowledged
    row_cls.push 'acknowledged'
  else
    row_cls.push 'unacknowledged'

  # Class for severity
  row_cls.push "severity-#{record.severity}"

  row_cls.join ' '


# Filter by data attribute, works for data set with jquery `.data`
# If you are using this then maybe you shouldn't be using
# the DOM as a data store?
$.fn.filterByData = ( key, value )->
  this.filter -> $(this).data(key) == value


# console_process_hash( url_hash_component )
# Process any url hash (#whatever) changes for the console
# Currently supports `/view` and `/group`

console_process_hash = ( hash, firstLoad ) ->

  view_res  = hash.match /\/view\/(.+?)(\/|$)/i
  group_res = hash.match /\/group\/(.+?)(\/|$)/i
  event_res = hash.match /\/event\/([a-f0-9]+)(\/(details|notes|history|fields))?/i
  severity_res = hash.match /\/severity\/(\w+)/i

  debug_helpers 'processing console hash change', hash

  unless hash
    debug_helpers 'Found no location #, populating with whatever we have'
    socket.emit 'populate'
    return false


  # Check the groups
  if group_res
    group_name = decodeURI group_res[1]
    debug_helpers 'got group #', group_name

  # Check the view
  if view_res
    # If we have an id, find it in the JS view structure
    id = decodeURI view_res[1]
    view = _.find filters, (e)->
      debug_helpers '#', hash, view_res
      e._id == id
    debug_helpers 'got view #', id, view.name
    
  if event_res
    id = decodeURI event_res[1]
    tab = decodeURI event_res[2]
    debug_helpers 'got event #', id, tab
    try
      ConsoleSocketIO.get_event_detail id
    catch error
      console.log "Couldn't open event detail: #{error}"

  if severity_res
    severity_name = decodeURI severity_res[1]
    debug_helpers 'got sev #', id, tab

  # Now apply the groups and views or events we found
  if group_name? and view?.name
    set_group_and_view group_name, id, view.name

  if group_name? and severity?.name
    set_group_and_severity group_name, severity

  else if view?.name
    # We matched an ID to a name, so use that
    set_view id, view.name

  else if group_name?
    set_group group_name

  else if event_res?
    if firstLoad # On page first load, remember to populate console events
      socket.emit 'populate'

  else if severity_res?
    set_severity severity_name

  else
    # Otherwise just get the defaults
    socket.emit 'populate'
    
    


class Helpers

  @w2ui_highlight_records: ( ids )->
    debug_helpers 'highlighting', ids
    w2ui['event_grid'].resize()

  @w2ui_highlight_remove: ( ids )->
    debug_helpers 'remove highlighting', ids
    w2ui['event_grid'].resize()

  # ### menu_x_pos( click_event )
  # Build a x position for a conext menu from a click event
  # Keeps it inside the page
  # Doesn't handle sub menus!

  @menu_x_pos: ( ev, $menu ) ->
    mouse_x     = ev.pageX
    page_width  = $(window).width()
    menu_width  = $menu.width()
    
    # opening menu would pass the side of the page
    if mouse_x + menu_width + 10 > page_width and
    menu_width < mouse_x
      page_width - menu_width - 10
    else
      mouse_x


  # ### menu_y_pos( click_event )
  # Build a y position for a conext menu from a click event
  # Keeps it inside the page
  # Doesn't handle sub menus!

  @menu_y_pos: (ev, $menu) ->
    mouse_y     = ev.pageY
    page_height = $(window).height()
    menu_height = $menu.height()

    # opening menu would pass the bottom of the page
    if mouse_y + menu_height + 20 > page_height and
    menu_height < mouse_y
      page_height - menu_height - 20
    else
      mouse_y
