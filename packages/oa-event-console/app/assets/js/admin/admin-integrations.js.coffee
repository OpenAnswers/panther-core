
debug_admin = debug 'oa:event:console:admin'


# ## AdminIntegrations

# Methods for rendering the different types of AdminIntegrations

# Eventually this should source from the server side config

class AdminIntegrations

  @template_create: "#admin-integrations-{name}-create-template"
  @element_create: $('#admin-integrations-create-type').html()

  @types:
    http:     {}
    zendesk:  {}
    sns:      {}
    ses:      {}

  @generate: ->
    for type of @types
      @template_create_id = format_string @template_create, name: @name
      @template_create = $(@template_create_id).html()
      if @template_create is null
        Message.error "Integration create null #{type} #{@template_create_id}"
      Mustache.parse @template_create

  # Clear for create render area back to blank and set the select
  @clear_create: ->
    $('#admin-integrations-create select[name="type"]').val ''
    @element_create.html ''

  @send_read_all: ( cb )->
    debug_admin 'read all integrations'
    socket.emit 'integrations::read', {}, ( error, data )->
      debug_admin 'read integrations', data
      AdminIntegration.render data


# ## AdminIntegration

# An instance of AdminIntegration controls a user created integration

# The templates are rendered in pug and placed in a <script> tag to
# hide them from normal flow

class AdminIntegration

  @template = $('#admin-integrations-template').html()
  Mustache.parse @template
  @element = $('#admin-integrations-table')

  @template_show: "#admin-integrations-{name}-template"
  @template_edit: "#admin-integrations-{name}-edit-template"


  constructor: ( @name, @id, options ) ->
    @template_show_id = format_string @constructor.template_show, name: @name
    @template_show = $(@template_show_id).html()
    Message.error 'integration show null '+@name if @template_show is null
    Mustache.parse @template_show

    @template_edit_id = format_string @constructor.template_edit, name: @name
    @template_edit = $(@template_edit_id).html()
    Message.error 'integration edit null '+@name if @template_edit is null
    Mustache.parse @template_edit

  # Rendering functions
  render: ( integrations )->
    @set_selected_group integrations
    @element.html Mustache.render( @template, integrations: integrations )
  
  render_create: ( type )->
    @element_create.html Mustache.render( @template_create )

  render_edit: ( id, data )->
    @element_edit = "#something row #{id}"
    $(@element_edit).html Mustache.render( @template_edit, data )

  render_show: ( id, data )->
    @element_show = "#something row #{id}"
    $(@element_show).html Mustache.render( @template_show, data )


  send_read: ( cb )->
    debug_admin 'read integration', @name
    socket.emit 'integration::read', {id: @id}, ( error, integration )->
      debug_admin 'read integration', integration
      # write to table

    debug_admin 'reading integration', @name


  # This would be nicer for reuse, if the vars were setup
  @render_type: ( type, action )->
    unless @types[name][action]
      console.error 'No setup for type [%s] action [%s]', type, action
    element = @types[name].element
    template = @types[name].template
    element.html Mustache.render( template )



  @get_edit_row: ( id )->
    $("tr.admin-integration-row-edit[data-id=#{id}]")

  @get_edit_form: ( id )->
    debug_admin 'i\'m getting form', id
    $("form.admin-integration-row-edit-form[data-id=\"#{id}\"]")

  @get_display_row: ( id )->
    $("tr.admin-integration-row[data-id=#{id}]")

  @edit_row: ( id )->
    @get_display_row(id).addClass 'hide'
    @get_edit_row(id).removeClass 'hide'

  @display_row: ( id )->
    @get_edit_row(id).addClass 'hide'
    @get_display_row(id).removeClass 'hide'
    
  @this_row_id: ( that )->
    $(that).parentsUntil('tr.admin-integration-row-edit').parent().data 'id'


  # ## Event functions

  # Event so server can push out integration updates
  @on_updates: ( updates )->
    time = Date.now()
    debug_admin 'got integration updates', updates


  # Change this to onRender add a class based on ack value
  @send_update: ( data, cb )->
    debug_admin 'updating integration', data
    socket.emit 'integration::update', data, ( error, response )->
      debug_admin 'Updated integration', response


  # Change this to onRender add a class based on ack value
  @send_delete: ( id_integration, cb )->
    debug_admin 'delete integration', id_integration.integration
    socket.emit 'integration::delete',
      integration: id_integration.integration
      _id: id_integration.id
    , ( error, response )->
      debug_admin 'deleted integration', response
      # Wait for the update to propagate
      #send_read_all
    debug_admin 'deleting integration'


  @send_create: ( data, cb )->
    debug_admin 'create integration', data
    socket.emit 'integration::create', {integration: data}, ( error, response )->
      debug_admin 'created integration'
      #clear form
      $('#admin-integrations-create')[0].reset()
    debug_admin 'creating integration'
    

  @send_read_one: ( name, cb )->
    debug_admin 'read integration', name
    socket.emit 'integration::read', {ids:  ids}, ( error, integration )->
      debug_admin 'read integration', integration
      # write to table
    debug_admin 'reading integration'
    





$ ->
  # Setup the socket message listeners

  socket.on 'integrations::updated', ( updates )->
    AdminIntegrations.send_read_all()

  # Load the initial data
  AdminIntegrations.send_read_all()

  # ## Integrations edit
  # On row click, edit the row

  # Show the edit form on row click
  $('#admin-integrations-table').on 'click', 'tr.admin-integration-row',( ev )->
    id = $(this).data 'id'
    AdminIntegration.edit_row id


  # Hide the edit form on cancel
  $('#admin-integrations-table').on 'click', 'tr.admin-integration-row-edit .admin-integration-row-save', ( ev )->
    ev.preventDefault()

    id = AdminIntegration.this_row_id ev.target

    form = AdminIntegration.get_edit_form(id)
    debug_admin 'formarr', form.serializeArray()
    data = {}
    form.serializeArray().map ( x )->
      debug 'form', x.name, x.value
      data[x.name] = x.value

    AdminIntegration.send_update data, ( response )->
      display_row id

    false


  # Hide the edit form on cancel
  $('#admin-integrations-table').on 'click', 'tr.admin-integration-row-edit .admin-integration-row-cancel', ( ev )->
    ev.preventDefault()
    id = AdminIntegration.this_row_id this
    AdminIntegration.display_row id


  # Delete the integration
  $('#admin-integrations-table').on 'click', 'tr.admin-integration-row-edit .admin-integration-row-delete', ( ev )->
    ev.preventDefault()
    id = AdminIntegration.this_row_id this
    AdminIntegration.send_delete
      _id: id

  # Hide the edit form on cancel
  $('#admin-integrations-table').on 'click', 'tr.admin-integration-row-edit .admin-integration-row-password', ( ev )->
    ev.preventDefault()
    false


  # Update the modified user
  $('.admin-integration-row-edit-form').on 'submit', ( ev )->
    ev.preventDefault()
    false

  # Update the modified user
  # Only works on focus
  $('body').on 'keyup', '', ( ev )->
    if ev.which == 27
      id = AdminIntegration.this_row_id ev.target
      AdminIntegration.display_row id
    false



  # ## Create new integrtation

  # Show the create zendesk form
  $('#admin-integrations-create select[name="type"]').on 'change', ( ev )->
    debug_admin 'should create integrations', ev
    type = $(ev.target).val()
    AdminIntegrations.render_create type


  # Submit new integration
  $('#admin-integrations-create').on 'submit', ( ev )->
    ev.preventDefault()
    
    # '.has-error'
    # Get the form and turn the fields into an object
    data = {}
    debug_admin 'formarr', ev, $(ev), $(ev.target).serializeArray()
    $(ev.target).serializeArray().map ( x )->
      debug 'form', x.name, x.value
      data[x.name] = x.value

    AdminIntegration.send_create data, ( response )->
      AdminIntegration.display_row id

    false




data =
  subdomain:      'openanstest'
  email_address:  'support@example.com'
  password:       'somepasstest'
  token:          'h1oWMOTulXefpn0SdnnKe7kreqRAIpU8g6dnqL5A'


ticket =
  subject: "Panther event console: {_id}"
  comment:
    body: "{summary} last happened: {last_occurrence}"


http_url_fmt = 'https://{subdomain}.zendesk.com/api/v2/tickets.json'
http_verb = 'POST'
http_content_type = "application/json"

auth_pass_fmt = "{email_address}:{password}"
auth_token_fmt = "{email_address}/token:{token}"
