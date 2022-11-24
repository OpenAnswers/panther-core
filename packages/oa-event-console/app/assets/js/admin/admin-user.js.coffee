
debug_admin = debug 'oa:event:console:admin'


# ### AdminUser
# Methods for rendering the admin user section
# The class is only really for namespacing methods

class AdminUser
  @users_template = $('#admin-users-template').html()
  Mustache.parse @users_template
  @users_el = $('#admin-users-table')

  @render_users: ( users )->
    @set_selected_group users
    @users_el.html Mustache.render( @users_template, users: users )


  # Create the "selected" flag for a dropdown menu to be able
  # to select the correct group
  @set_selected_group: ( users )->
    for user in users
      switch user.group
        when 'user', ''
          user.user_selected = 'selected'
        when 'admin'
          user.admin_selected = 'selected'
        else
          console.log 'User had no matching group', user.group
        
  @get_edit_row: ( id )->
    $("tr.admin-user-row-edit[data-id=#{id}]")

  @get_edit_form: ( id )->
    debug_admin 'i\'m getting form', id
    $("form.admin-user-row-edit-form[data-id=\"#{id}\"]")

  @get_display_row: ( id )->
    $("tr.admin-user-row[data-id=#{id}]")

  @edit_row: ( id )->
    @get_display_row(id).addClass 'hide'
    @get_edit_row(id).removeClass 'hide'

  @display_row: ( id )->
    @get_edit_row(id).addClass 'hide'
    @get_display_row(id).removeClass 'hide'
    
  @this_row_id: ( that )->
    $(that).parentsUntil('tr.admin-user-row-edit').parent().data 'id'

  @this_user_id: ( that )->
    $(that).parentsUntil('tr.admin-user-row-edit').parent().data 'user'


  # ## Event functions

  # Event so server can push out user updates
  @on_updates: ( updates )->
    time = Date.now()
    debug_admin 'got user updates', updates


  # Change this to onRender add a class based on ack value
  @send_update: ( data, cb )->
    debug_admin 'update user', data
    socket.emit 'user::update', data, ( error, response )->
      debug_admin 'Updated user returned', error, response
      if cb then cb( error, response )
    debug_admin 'updating user', data


  # Change this to onRender add a class based on ack value
  @send_delete: ( id_user, cb )->
    debug_admin 'delete user', id_user.user
    data =
      user: id_user.user
      _id: id_user.id
    socket.emit 'user::delete', data, ( error, response )->
      debug_admin 'deleted user', response
      # Wait for the update to propagate
      #send_read_all
      if cb then cb( error, response)
    debug_admin 'deleting user'


  @send_create: ( data, cb )->
    debug_admin 'create user', data
    msg =
      user: data
    socket.emit 'user::create', msg, ( error, response )->
      debug_admin 'Created user returned', data
      #Clear form
      unless error
        $('#admin-users-create')[0].reset()
      if cb then cb( error, response )
    debug_admin 'creating user'
    

  @send_read_one: ( id_user, cb )->
    debug_admin 'read user', name
    socket.emit 'user::read',
      user:  id_user
    , ( error, user )->
      debug_admin 'read user', user
      if cb then cb( error, user )
      # write to table
    debug_admin 'reading user'
    

  @send_read_all: ( cb )->
    debug_admin 'read all users'
    socket.emit 'users::read', {}, ( err, users )->
      debug_admin 'read users', users
      AdminUser.render_users users


  @send_password_reset: ( id_user, cb )->
    debug_admin 'resetting a users password'
    socket.emit 'user::reset_password',
      user: id_user.user
      _id:  id_user.id
    , ( error, user )->
      debug_admin 'reset user password', user
      if cb then cb(error, user)
      # write to table
    debug_admin 'reading user'



$ ->
  # Setup the socket message listeners

  socket.on 'users::updated', ( updates )->
    AdminUser.send_read_all()

  # Load the initial data
  AdminUser.send_read_all()

  # ## User edit
  # On row click, edit the user in that row

  # Show the edit form on row click
  $('#admin-users-table').on 'click', 'tr.admin-user-row',( ev )->
    id = $(this).data 'id'
    AdminUser.edit_row id


  # Save the edit
  $('#admin-users-table').on 'click', 'tr.admin-user-row-edit .admin-user-row-save', ( ev )->
    ev.preventDefault()
    $btn = $(this)
    $btn.button('loading')
    id = AdminUser.this_row_id ev.target

    form = AdminUser.get_edit_form(id)
    debug_admin 'formarr', form.serializeArray()
    data = {}
    form.serializeArray().map ( x )->
      debug 'form', x.name, x.value
      data[x.name] = x.value

    AdminUser.send_update data, ( error, response )->
      $btn.button('reset')
      if error
        return Message.error ErrorType.from_object(error)
      AdminUser.display_row id
      
    false


  # Hide the edit form on cancel
  $('#admin-users-table').on 'click', 'tr.admin-user-row-edit .admin-user-row-cancel', ( ev )->
    ev.preventDefault()
    id = AdminUser.this_row_id this
    AdminUser.display_row id


  # Delete the user
  $('#admin-users-table').on 'click', 'tr.admin-user-row-edit .admin-user-row-delete', ( ev )->
    ev.preventDefault()

    user = AdminUser.this_user_id this
    modal = $("#modal-delete-user")
    modal.find("#user-name").text user
    modal.find("#user-confirm").off 'click'
    modal.find("#user-confirm").on 'click', () ->
      modal.modal('hide')
      $btn = $(this)
      $btn.button('loading')
      id = AdminUser.this_row_id this
      AdminUser.send_delete { _id: id, user: user }, ->
        $btn.button('reset')
    modal.modal('show')

  # Do a password reset
  $('#admin-users-table').on 'click', 'tr.admin-user-row-edit .admin-user-row-password', ( ev )->
    ev.preventDefault()
    user = AdminUser.this_user_id this
    id = AdminUser.this_row_id this
    $btn = $(this)
    $btn.button('loading')
    AdminUser.send_password_reset { _id: id, user: user }, ->
      $btn.button('reset')
    false

  # Hide the edit form on escape key
  $('body').on 'keyup', '', ( ev )->
    if ev.which == 27
      id = AdminUser.this_row_id ev.target
      AdminUser.display_row id
    false

  # Update the modified user
  $('.admin-user-row-edit-form').on 'submit', ( ev )->
    ev.preventDefault()
    false


  # ## Add new user

  # Create new user
  $('#admin-users-create').on 'submit', ( ev )->
    ev.preventDefault()
    id = AdminUser.this_row_id ev.target
    $btn = $(this)
    $btn.button('loading')
    # Get the form and turn the fields into an object
    data = {}
    debug_admin 'formarr', ev, $(ev), $(ev.target).serializeArray()
    $(ev.target).serializeArray().map ( x )->
      debug 'form', x.name, x.value
      data[x.name] = x.value

    AdminUser.send_create data, ( error, response )->
      $btn.button('reset')
      if error
        return Message.error ErrorType.from_object(error)
      Message.info_label 'User created', response
      AdminUser.display_row id

    false






