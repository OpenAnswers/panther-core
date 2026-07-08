// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # ApiKey

// Methods for rendering the admin apikey section
// The class is only really for namespacing methods

const debug_apikey = debug('oa:event:console:apikey');

// ## Class

class ApiKey {
  static initClass() {
    this.apikeys_template = $('#admin-apikeys-template').html();
    Mustache.parse(this.apikeys_template);
    this.apikeys_el = $('#admin-apikeys-table');
  }

  static render_apikeys(apikeys) {
    const content = Mustache.render(this.apikeys_template, apikeys);
    //debug_apikey 'apikey content', content
    return this.apikeys_el.html(content);
  }

  static render_context(data) {
    this.apikeys_context_template = $('#admin-apikeys-context-template').html();
    this.apikeys_context_el = $('#admin-apikey-create .row .context-block');

    const content = Mustache.render(this.apikeys_context_template, data);
    return this.apikeys_context_el.html(content);
  }

  static get_edit_row(apikey) {
    return $(`tr.admin-apikey-row-edit[data-apikey=${apikey}]`);
  }

  static get_edit_form(apikey) {
    debug_apikey("i'm getting form", apikey);
    return $(`form.admin-apikey-row-edit-form[data-apikey=\"${apikey}\"]`);
  }

  static get_display_row(apikey) {
    return $(`tr.admin-apikey-row[data-apikey=${apikey}]`);
  }

  static edit_row(apikey) {
    this.get_display_row(apikey).addClass('hide');
    return this.get_edit_row(apikey).removeClass('hide');
  }

  static display_row(apikey) {
    this.get_edit_row(apikey).addClass('hide');
    return this.get_display_row(apikey).removeClass('hide');
  }

  static this_apikey(that) {
    return $(that).parentsUntil('tr.admin-apikey-row-edit').parent().data('apikey');
  }

  // ## Event functions

  // Event so server can push out apikey updates
  static on_updates(updates) {
    const time = Date.now();
    return debug_apikey('got apikey updates', updates);
  }

  // Change this to onRender add a class based on ack value
  static send_update(data, cb) {
    debug_apikey('updating apikey', data);
    return socket.emit('apikey::update', data, function (error, response) {
      debug_apikey('Updated apikey', response);
      if (cb) {
        return cb(error, response);
      }
    });
  }

  // Change this to onRender add a class based on ack value
  static send_delete(id_apikey, cb) {
    debug_apikey('delete apikey', id_apikey.apikey);
    socket.emit('apikey::delete', { apikey: id_apikey.apikey }, function (error, response) {
      debug_apikey('deleted apikey', response);
      // Wait for the update to propagate
      //send_read_all
      if (cb) {
        return cb(error, response);
      }
    });
    return debug_apikey('deleting apikey');
  }

  static send_create(data, cb) {
    debug_apikey('create apikey', data);
    socket.emit('apikey::create', { apikey: data }, function (error, response) {
      debug_apikey('created apikey', response);
      //clear form
      $('#admin-apikey-create')[0].reset();
      if (cb) {
        return cb(error, response);
      }
    });
    return debug_apikey('creating apikey');
  }

  static send_read_one(apikey, cb) {
    debug_apikey('read apikey', name);
    socket.emit('apikey::read', { apikey }, function (error, response) {
      debug_apikey('read apikey', apikey);
      // write to table
      if (cb) {
        return cb(error, response);
      }
    });
    return debug_apikey('reading apikey');
  }

  static send_read_all(cb) {
    debug_apikey('read all apikeys');
    return socket.emit('apikeys::read', {}, function (error, response) {
      debug_apikey('read apikeys', response.apikeys);
      ApiKey.render_apikeys(response);
      ApiKey.render_context(response.data);
      if (cb) {
        cb(error, response);
      }

      if (response.max) {
        $('#admin-apikey-create-submit').prop('disabled', true);
        return Message.info('API Key Limit Reached');
      } else {
        return $('#admin-apikey-create-submit').prop('disabled', false);
      }
    });
  }
}
ApiKey.initClass();

$(function () {
  // Setup the socket message listeners

  socket.on('apikey::updated', updates => ApiKey.send_read_all());

  // Load the initial data
  ApiKey.send_read_all();

  // ## ApiKey edit
  // On row click, show the edit options for this key

  // Show the edit form on row click
  $('#admin-apikeys-table').on('click', 'tr.admin-apikey-row', function (ev) {
    const apikey = $(this).data('apikey');
    return ApiKey.edit_row(apikey);
  });

  // Save the edit
  $('#admin-apikeys-table').on('click', 'tr.admin-apikey-row-edit .admin-apikey-row-save', function (ev) {
    ev.preventDefault();

    const apikey = ApiKey.this_row_apikey(ev.target);

    const form = ApiKey.get_edit_form(apikey);
    debug_apikey('formarr', form.serializeArray());
    const data = {};
    form.serializeArray().map(function (x) {
      debug('form', x.name, x.value);
      return (data[x.name] = x.value);
    });

    ApiKey.send_update(data, (error, response) => display_row(apikey));

    return false;
  });

  // Hide the edit form on cancel
  $('#admin-apikeys-table').on('click', 'tr.admin-apikey-row-edit .admin-apikey-row-cancel', function (ev) {
    ev.preventDefault();
    const apikey = ApiKey.this_apikey(this);
    return ApiKey.display_row(apikey);
  });

  // Delete the apikey
  $('#admin-apikeys-table').on('click', 'tr.admin-apikey-row-edit .admin-apikey-row-delete', function (ev) {
    ev.preventDefault();
    const $btn = $(this);
    $btn.button('loading');

    const apikey = ApiKey.this_apikey(this);
    return ApiKey.send_delete({ apikey }, function (error, response) {
      $btn.button('reset');
      if (error) {
        return Message.error(ErrorType.from_object(error));
      }
      return Message.info_label(
        'API Key Deleted',
        'The API key was deleted from the console. Credentials may be cached for a short period of time'
      );
    });
  });

  // Hide the edit form on escape key
  $('body').on('keyup', '', function (ev) {
    if (ev.which === 27) {
      const id = ApiKey.this_row_id(ev.target);
      ApiKey.display_row(id);
    }
    return false;
  });

  // Update the modified apikey
  $('.admin-apikey-row-edit-form').on('submit', function (ev) {
    ev.preventDefault();
    return false;
  });

  // ## Add new apikey

  // Create new apikey
  return $('#admin-apikey-create').on('submit', function (ev) {
    ev.preventDefault();

    const $btn = $('#admin-apikey-create-submit');
    $btn.button('loading');
    // Get the form and turn the fields into an object
    const data = {};
    debug_apikey('formarr', ev, $(ev), $(ev.target).serializeArray());
    $(ev.target)
      .serializeArray()
      .map(function (x) {
        debug('form', x.name, x.value);
        return (data[x.name] = x.value);
      });

    ApiKey.send_create(data, function (error, response) {
      $btn.button('reset');
      if (error) {
        return Message.error(ErrorType.from_object(error));
      }
    });
    //ApiKey.display_row id

    return false;
  });
});

window.ApiKey = ApiKey;
