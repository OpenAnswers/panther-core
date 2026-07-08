// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_admin = debug('oa:event:console:admin');

// ### AdminUser
// Methods for rendering the admin user section
// The class is only really for namespacing methods

class AdminUser {
  static initClass() {
    this.users_template = $('#admin-users-template').html();
    Mustache.parse(this.users_template);
    this.users_el = $('#admin-users-table');
  }

  static render_users(users) {
    this.set_selected_group(users);
    return this.users_el.html(Mustache.render(this.users_template, { users }));
  }

  // Create the "selected" flag for a dropdown menu to be able
  // to select the correct group
  static set_selected_group(users) {
    return (() => {
      const result = [];
      for (var user of users) {
        switch (user.group) {
          case 'user':
          case '':
            result.push((user.user_selected = 'selected'));
            break;
          case 'admin':
            result.push((user.admin_selected = 'selected'));
            break;
          default:
            result.push(console.log('User had no matching group', user.group));
        }
      }
      return result;
    })();
  }

  static get_edit_row(id) {
    return $(`tr.admin-user-row-edit[data-id=${id}]`);
  }

  static get_edit_form(id) {
    debug_admin("i'm getting form", id);
    return $(`form.admin-user-row-edit-form[data-id=\"${id}\"]`);
  }

  static get_display_row(id) {
    return $(`tr.admin-user-row[data-id=${id}]`);
  }

  static edit_row(id) {
    this.get_display_row(id).addClass('hide');
    return this.get_edit_row(id).removeClass('hide');
  }

  static display_row(id) {
    this.get_edit_row(id).addClass('hide');
    return this.get_display_row(id).removeClass('hide');
  }

  static this_row_id(that) {
    return $(that).parentsUntil('tr.admin-user-row-edit').parent().data('id');
  }

  static this_user_id(that) {
    return $(that).parentsUntil('tr.admin-user-row-edit').parent().data('user');
  }

  // ## Event functions

  // Event so server can push out user updates
  static on_updates(updates) {
    const time = Date.now();
    return debug_admin('got user updates', updates);
  }

  // Change this to onRender add a class based on ack value
  static send_update(data, cb) {
    debug_admin('update user', data);
    socket.emit('user::update', data, function (error, response) {
      debug_admin('Updated user returned', error, response);
      if (cb) {
        return cb(error, response);
      }
    });
    return debug_admin('updating user', data);
  }

  // Change this to onRender add a class based on ack value
  static send_delete(id_user, cb) {
    debug_admin('delete user', id_user.user);
    const data = {
      user: id_user.user,
      _id: id_user.id,
    };
    socket.emit('user::delete', data, function (error, response) {
      debug_admin('deleted user', response);
      // Wait for the update to propagate
      //send_read_all
      if (cb) {
        return cb(error, response);
      }
    });
    return debug_admin('deleting user');
  }

  static send_create(data, cb) {
    debug_admin('create user', data);
    const msg = { user: data };
    socket.emit('user::create', msg, function (error, response) {
      debug_admin('Created user returned', data);
      //Clear form
      if (!error) {
        $('#admin-users-create')[0].reset();
      }
      if (cb) {
        return cb(error, response);
      }
    });
    return debug_admin('creating user');
  }

  static send_read_one(id_user, cb) {
    debug_admin('read user', name);
    socket.emit('user::read', { user: id_user }, function (error, user) {
      debug_admin('read user', user);
      if (cb) {
        return cb(error, user);
      }
    });
    // write to table
    return debug_admin('reading user');
  }

  static send_read_all(cb) {
    debug_admin('read all users');
    return socket.emit('users::read', {}, function (err, users) {
      debug_admin('read users', users);
      return AdminUser.render_users(users);
    });
  }

  static send_password_reset(id_user, cb) {
    debug_admin('resetting a users password');
    socket.emit(
      'user::reset_password',
      {
        user: id_user.user,
        _id: id_user.id,
      },
      function (error, user) {
        debug_admin('reset user password', user);
        if (cb) {
          return cb(error, user);
        }
      }
    );
    // write to table
    return debug_admin('reading user');
  }
}
AdminUser.initClass();

$(function () {
  // Setup the socket message listeners

  socket.on('users::updated', updates => AdminUser.send_read_all());

  // Load the initial data
  AdminUser.send_read_all();

  // ## User edit
  // On row click, edit the user in that row

  // Show the edit form on row click
  $('#admin-users-table').on('click', 'tr.admin-user-row', function (ev) {
    const id = $(this).data('id');
    return AdminUser.edit_row(id);
  });

  // Save the edit
  $('#admin-users-table').on('click', 'tr.admin-user-row-edit .admin-user-row-save', function (ev) {
    ev.preventDefault();
    const $btn = $(this);
    $btn.button('loading');
    const id = AdminUser.this_row_id(ev.target);

    const form = AdminUser.get_edit_form(id);
    debug_admin('formarr', form.serializeArray());
    const data = {};
    form.serializeArray().map(function (x) {
      debug('form', x.name, x.value);
      return (data[x.name] = x.value);
    });

    AdminUser.send_update(data, function (error, response) {
      $btn.button('reset');
      if (error) {
        return Message.error(ErrorType.from_object(error));
      }
      return AdminUser.display_row(id);
    });

    return false;
  });

  // Hide the edit form on cancel
  $('#admin-users-table').on('click', 'tr.admin-user-row-edit .admin-user-row-cancel', function (ev) {
    ev.preventDefault();
    const id = AdminUser.this_row_id(this);
    return AdminUser.display_row(id);
  });

  // Delete the user
  $('#admin-users-table').on('click', 'tr.admin-user-row-edit .admin-user-row-delete', function (ev) {
    ev.preventDefault();

    const user = AdminUser.this_user_id(this);
    const modal = $('#modal-delete-user');
    modal.find('#user-name').text(user);
    modal.find('#user-confirm').off('click');
    modal.find('#user-confirm').on('click', function () {
      modal.modal('hide');
      const $btn = $(this);
      $btn.button('loading');
      const id = AdminUser.this_row_id(this);
      return AdminUser.send_delete({ _id: id, user }, () => $btn.button('reset'));
    });
    return modal.modal('show');
  });

  // Do a password reset
  $('#admin-users-table').on('click', 'tr.admin-user-row-edit .admin-user-row-password', function (ev) {
    ev.preventDefault();
    const user = AdminUser.this_user_id(this);
    const id = AdminUser.this_row_id(this);
    const $btn = $(this);
    $btn.button('loading');
    AdminUser.send_password_reset({ _id: id, user }, () => $btn.button('reset'));
    return false;
  });

  // Hide the edit form on escape key
  $('body').on('keyup', '', function (ev) {
    if (ev.which === 27) {
      const id = AdminUser.this_row_id(ev.target);
      AdminUser.display_row(id);
    }
    return false;
  });

  // Update the modified user
  $('.admin-user-row-edit-form').on('submit', function (ev) {
    ev.preventDefault();
    return false;
  });

  // ## Add new user

  // Create new user
  return $('#admin-users-create').on('submit', function (ev) {
    ev.preventDefault();
    const id = AdminUser.this_row_id(ev.target);
    const $btn = $(this);
    $btn.button('loading');
    // Get the form and turn the fields into an object
    const data = {};
    debug_admin('formarr', ev, $(ev), $(ev.target).serializeArray());
    $(ev.target)
      .serializeArray()
      .map(function (x) {
        debug('form', x.name, x.value);
        return (data[x.name] = x.value);
      });

    AdminUser.send_create(data, function (error, response) {
      $btn.button('reset');
      if (error) {
        return Message.error(ErrorType.from_object(error));
      }
      Message.info_label('User created', response);
      return AdminUser.display_row(id);
    });

    return false;
  });
});

window.AdminUser = AdminUser;
