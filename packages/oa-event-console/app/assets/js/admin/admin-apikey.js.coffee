# # ApiKey

# Methods for rendering the admin apikey section
# The class is only really for namespacing methods

debug_apikey = debug 'oa:event:console:apikey'

# ## Class

class ApiKey
  @apikeys_template = $('#admin-apikeys-template').html()
  Mustache.parse @apikeys_template
  @apikeys_el = $('#admin-apikeys-table')

  @render_apikeys: ( apikeys )->
    content = Mustache.render( @apikeys_template, apikeys )
    #debug_apikey 'apikey content', content
    @apikeys_el.html content

  @render_context: ( data )-> 
    @apikeys_context_template = $('#admin-apikeys-context-template').html()
    @apikeys_context_el = $('#admin-apikey-create .row .context-block')

    content = Mustache.render(@apikeys_context_template, data)
    @apikeys_context_el.html content
        
  @get_edit_row: ( apikey )->
    $("tr.admin-apikey-row-edit[data-apikey=#{apikey}]")

  @get_edit_form: ( apikey )->
    debug_apikey 'i\'m getting form', apikey
    $("form.admin-apikey-row-edit-form[data-apikey=\"#{apikey}\"]")

  @get_display_row: ( apikey )->
    $("tr.admin-apikey-row[data-apikey=#{apikey}]")

  @edit_row: ( apikey )->
    @get_display_row(apikey).addClass 'hide'
    @get_edit_row(apikey).removeClass 'hide'

  @display_row: ( apikey )->
    @get_edit_row(apikey).addClass 'hide'
    @get_display_row(apikey).removeClass 'hide'

  @this_apikey: ( that )->
    $(that).parentsUntil('tr.admin-apikey-row-edit').parent().data 'apikey'


  # ## Event functions

  # Event so server can push out apikey updates
  @on_updates: ( updates )->
    time = Date.now()
    debug_apikey 'got apikey updates', updates


  # Change this to onRender add a class based on ack value
  @send_update: ( data, cb )->
    debug_apikey 'updating apikey', data
    socket.emit 'apikey::update', data, ( error, response )->
      debug_apikey 'Updated apikey', response
      if cb then cb( error, response )

  # Change this to onRender add a class based on ack value
  @send_delete: ( id_apikey, cb )->
    debug_apikey 'delete apikey', id_apikey.apikey
    socket.emit 'apikey::delete', {apikey: id_apikey.apikey}, ( error, response )->
      debug_apikey 'deleted apikey', response
      # Wait for the update to propagate
      #send_read_all
      if cb then cb( error, response )
    debug_apikey 'deleting apikey'


  @send_create: ( data, cb )->
    debug_apikey 'create apikey', data
    socket.emit 'apikey::create', {apikey: data}, ( error, response )->
      debug_apikey 'created apikey', response
      #clear form
      $('#admin-apikey-create')[0].reset()
      if cb then cb( error, response )
    debug_apikey 'creating apikey'
    

  @send_read_one: ( apikey, cb )->
    debug_apikey 'read apikey', name
    socket.emit 'apikey::read', { apikey: apikey }, ( error, response )->
      debug_apikey 'read apikey', apikey
      # write to table
      if cb then cb( error, response )
    debug_apikey 'reading apikey'
    

  @send_read_all: ( cb )->
    debug_apikey 'read all apikeys'
    socket.emit 'apikeys::read', {}, ( error, response )->
      debug_apikey 'read apikeys', response.apikeys
      ApiKey.render_apikeys response
      ApiKey.render_context response.data
      if cb then cb( error, response )

      if response.max
        $('#admin-apikey-create-submit').prop 'disabled', true
        Message.info("API Key Limit Reached")
      else        
        $('#admin-apikey-create-submit').prop 'disabled', false

$ ->
  # Setup the socket message listeners

  socket.on 'apikey::updated', ( updates )->
    ApiKey.send_read_all()

  # Load the initial data
  ApiKey.send_read_all()

  # ## ApiKey edit
  # On row click, show the edit options for this key

  # Show the edit form on row click
  $('#admin-apikeys-table').on 'click', 'tr.admin-apikey-row', ( ev )->
    apikey = $(this).data 'apikey'
    ApiKey.edit_row apikey


  # Save the edit
  $('#admin-apikeys-table').on 'click', 'tr.admin-apikey-row-edit .admin-apikey-row-save', ( ev )->
    ev.preventDefault()

    apikey = ApiKey.this_row_apikey ev.target

    form = ApiKey.get_edit_form(apikey)
    debug_apikey 'formarr', form.serializeArray()
    data = {}
    form.serializeArray().map ( x )->
      debug 'form', x.name, x.value
      data[x.name] = x.value

    ApiKey.send_update data, ( error, response )->
      display_row apikey

    false


  # Hide the edit form on cancel
  $('#admin-apikeys-table').on 'click', 'tr.admin-apikey-row-edit .admin-apikey-row-cancel', ( ev )->
    ev.preventDefault()
    apikey = ApiKey.this_apikey this
    ApiKey.display_row apikey

  # Delete the apikey
  $('#admin-apikeys-table').on 'click', 'tr.admin-apikey-row-edit .admin-apikey-row-delete', ( ev )->
    ev.preventDefault()
    $btn = $(this)
    $btn.button('loading')

    apikey = ApiKey.this_apikey this
    ApiKey.send_delete {apikey: apikey}, ( error, response )->
      $btn.button('reset')
      if error then return Message.error ErrorType.from_object(error)
      Message.info_label "API Key Deleted", "The API key was deleted from the console. Credentials may be cached for a short period of time"

  # Hide the edit form on escape key
  $('body').on 'keyup', '', ( ev )->
    if ev.which == 27
      id = ApiKey.this_row_id ev.target
      ApiKey.display_row id
    false

  # Update the modified apikey
  $('.admin-apikey-row-edit-form').on 'submit', ( ev )->
    ev.preventDefault()
    false


  # ## Add new apikey

  # Create new apikey
  $('#admin-apikey-create').on 'submit', ( ev )->
    ev.preventDefault()

    $btn = $('#admin-apikey-create-submit')
    $btn.button('loading')
    # Get the form and turn the fields into an object
    data = {}
    debug_apikey 'formarr', ev, $(ev), $(ev.target).serializeArray()
    $(ev.target).serializeArray().map ( x )->
      debug 'form', x.name, x.value
      data[x.name] = x.value

    ApiKey.send_create data, ( error, response )->
      $btn.button('reset')
      if error then return Message.error ErrorType.from_object(error)
      #ApiKey.display_row id

    false






