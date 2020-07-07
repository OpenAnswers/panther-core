
debug_views = debug 'oa:event:console:admin'


# ### Views
# Methods for rendering the view section
# The class is only really for namespacing methods
# This needs to be made generic as the same thing is being
# used in multiple places.. admin-users admin-integration
class Views

  # Pull in the <script> templates that are rendered by Jade
  @template = $('#views-template').html()
  Mustache.parse @template
  
  # Allow for multiple types of template
  @mustache =
    user:
      template: @template
      element:  $('#views-table-user')
    default:
      template: @template
      element:  $('#views-table-default')

  # Render a type of template
  @render_type: ( type, data )->
    debug_views 'render_type', type, data
    unless @mustache[type]?
      console.log 'ERROR: No setup for type [%s]', type
      return
    element = @mustache[type].element
    template = @mustache[type].template
    element.html Mustache.render template, views: data
    #debug_views 'rendered', element.html()

  # Clear for create render area back to blank and set the select
  @clear_create: ->
    $('#admin-views-create select[name="type"]').val ''
    @element_create.html ''

  # Select the edit row for an id
  @get_edit_row: ( id )->
    $("tr.views-row-edit[data-id=#{id}]")

  # Select the edit form for an id
  @get_edit_form: ( id )->
    debug_views 'i\'m getting form', id
    $("form.views-row-edit-form[data-id=\"#{id}\"]")

  # Select the display row for an id
  @get_display_row: ( id )->
    $("tr.views-row[data-id=#{id}]")


  # Show the edit view, hide the display view
  @edit_row: ( id )->
    @get_display_row(id).addClass 'hide'
    @get_edit_row(id).removeClass 'hide'

  # Show the display view, hide the edit view
  @display_row: ( id )->
    @get_edit_row(id).addClass 'hide'
    @get_display_row(id).removeClass 'hide'
  
  # Get this row-edit id from any child element
  @this_row_id: ( that )->
    $(that).parentsUntil('tr.views-row-edit').parent().data 'id'


  # ## Event functions

  # Event so server can push out integration updates
  @on_updates: ( updates )->
    time = Date.now()
    debug_views 'got view updates', updates, time


  # Change this to onRender add a class based on ack value
  @send_update: ( data, cb )->
    debug_views 'updating views', data
    socket.emit 'view::update',
      view: data
    ,( response )->
      debug_views 'Updated views', response


  # Change this to onRender add a class based on ack value
  @send_delete: ( id_view, cb )->
    debug_views 'delete view', id_view
    socket.emit 'view::delete',
      _id: id_view
    , ( response )->
      debug_views 'deleted view', response
      # Wait for the update to propagate
      #send_read_all
    debug_views 'deleting view'

  @send_create: ( data, cb )->
    debug_views 'create view', data
    socket.emit 'view::create',
      view: data
    , ( response )->
      debug_views 'created view'
      #clear form
      $('#views-add-form')[0].reset()
    debug_views 'creating view'
    

  @send_read_one: ( id, cb )->
    debug_views 'read view', name
    socket.emit 'view::read',
      _id:  id
    , ( view )->
      debug_views 'read view', view
      # write to table
    debug_views 'reading view'
    

  @send_read_all: ( cb )->
    debug_views 'read all views'
    socket.emit 'views::read', {}, ( data )->
      debug_views 'read views', data
      Views.render_type 'user', data


  @send_set_default: ( id, cb )->
    debug_views 'setting default'
    socket.emit 'view::set_default', id, ( data )->
      debug_views 'set default to', id


# Window onload
$ ->

  # Setup the socket message listeners
  # Reload data when it changes
  socket.on 'views::updated', ( updates )->
    debug_views 'views::updated so rendering'
    Views.send_read_all()

  # Load the initial data
  Views.send_read_all()


  # ## Edit Views

  # Show the edit form on row click
  $('#views-table-user').on 'click', 'tr.views-row',( ev )->
    id = $(this).data 'id'
    Views.edit_row id


  # Set as default
  $('#views-table-user').on 'click', 'tr.views-row-edit .button-default', ( ev )->
    ev.preventDefault()

    id = Views.this_row_id this

    Views.send_set_default id, ( response )->
      Views.display_row id

    false


  # Save the edit
  $('#views-table-user').on 'click', 'tr.views-row-edit .button-save', ( ev )->
    ev.preventDefault()
    id = Views.this_row_id this
    form = Views.get_edit_form id
    data = Form.form_to_object form
    Views.send_update data, ( response )->
      Views.display_row id
    false


  # Hide the edit form on cancel
  $('#views-table-user').on 'click', 'tr.views-row-edit .button-cancel', ( ev )->
    ev.preventDefault()
    id = Views.this_row_id this
    Views.display_row id


  # Delete the view
  $('#views-table-user').on 'click', 'tr.views-row-edit .button-delete', ( ev )->
    ev.preventDefault()
    id = Views.this_row_id this
    Views.send_delete
      _id: id


  # Save the edit
  $('.views-row-edit-form').on 'submit', ( ev )->
    ev.preventDefault()

    form = $(ev.target)
    data = Form.form_to_object form

    Views.send_update data, ( response )->
      Views.display_row id

    false


  # Hide the edit form on escape
  # Only works on focus!
  $('body').on 'keyup', '', ( ev )->
    if ev.which == 27
      id = Views.this_row_id ev.target
      Views.display_row id
    false



  # ## Create new view

  # Submit new view
  # $('#views-add-form').on 'click', '.button-save', ( ev )->
  #   ev.preventDefault()
  #   false

  # Save the edit
  $('#views-add-form').on 'submit', ( ev )->
    ev.preventDefault()

    form = $(ev.target)
    data = Form.form_to_object form

    Views.send_create data, ( response )->
      Views.display_row id
    false


  # Typeahead

  typeahead_defaults =
    minLength: 0
    showHintOnFocus: true
    autoSelect: true
    items: 'all'

  $('.fields_typeahead').typeahead _.defaults
    source: fields_list
  , typeahead_defaults
