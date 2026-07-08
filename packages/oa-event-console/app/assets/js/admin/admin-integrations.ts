// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_admin = debug('oa:event:console:admin');

// ## AdminIntegrations

// Methods for rendering the different types of AdminIntegrations

// Eventually this should source from the server side config

class AdminIntegrations {
  static initClass() {
    this.template_create = '#admin-integrations-{name}-create-template';
    this.element_create = $('#admin-integrations-create-type').html();

    this.types = {
      http: {},
      zendesk: {},
      sns: {},
      ses: {},
    };
  }

  static generate() {
    return (() => {
      const result = [];
      for (var type in this.types) {
        this.template_create_id = format_string(this.template_create, { name: this.name });
        this.template_create = $(this.template_create_id).html();
        if (this.template_create === null) {
          Message.error(`Integration create null ${type} ${this.template_create_id}`);
        }
        result.push(Mustache.parse(this.template_create));
      }
      return result;
    })();
  }

  // Clear for create render area back to blank and set the select
  static clear_create() {
    $('#admin-integrations-create select[name="type"]').val('');
    return this.element_create.html('');
  }

  static send_read_all(cb) {
    debug_admin('read all integrations');
    return socket.emit('integrations::read', {}, function (error, data) {
      debug_admin('read integrations', data);
      return AdminIntegration.render(data);
    });
  }
}
AdminIntegrations.initClass();

// ## AdminIntegration

// An instance of AdminIntegration controls a user created integration

// The templates are rendered in pug and placed in a <script> tag to
// hide them from normal flow

class AdminIntegration {
  static initClass() {
    this.template = $('#admin-integrations-template').html();
    Mustache.parse(this.template);
    this.element = $('#admin-integrations-table');

    this.template_show = '#admin-integrations-{name}-template';
    this.template_edit = '#admin-integrations-{name}-edit-template';
  }

  constructor(name, id, options) {
    this.name = name;
    this.id = id;
    this.template_show_id = format_string(this.constructor.template_show, { name: this.name });
    this.template_show = $(this.template_show_id).html();
    if (this.template_show === null) {
      Message.error('integration show null ' + this.name);
    }
    Mustache.parse(this.template_show);

    this.template_edit_id = format_string(this.constructor.template_edit, { name: this.name });
    this.template_edit = $(this.template_edit_id).html();
    if (this.template_edit === null) {
      Message.error('integration edit null ' + this.name);
    }
    Mustache.parse(this.template_edit);
  }

  // Rendering functions
  render(integrations) {
    this.set_selected_group(integrations);
    return this.element.html(Mustache.render(this.template, { integrations }));
  }

  render_create(type) {
    return this.element_create.html(Mustache.render(this.template_create));
  }

  render_edit(id, data) {
    this.element_edit = `#something row ${id}`;
    return $(this.element_edit).html(Mustache.render(this.template_edit, data));
  }

  render_show(id, data) {
    this.element_show = `#something row ${id}`;
    return $(this.element_show).html(Mustache.render(this.template_show, data));
  }

  send_read(cb) {
    debug_admin('read integration', this.name);
    socket.emit('integration::read', { id: this.id }, (error, integration) =>
      debug_admin('read integration', integration)
    );
    // write to table

    return debug_admin('reading integration', this.name);
  }

  // This would be nicer for reuse, if the vars were setup
  static render_type(type, action) {
    if (!this.types[name][action]) {
      console.error('No setup for type [%s] action [%s]', type, action);
    }
    const { element } = this.types[name];
    const { template } = this.types[name];
    return element.html(Mustache.render(template));
  }

  static get_edit_row(id) {
    return $(`tr.admin-integration-row-edit[data-id=${id}]`);
  }

  static get_edit_form(id) {
    debug_admin("i'm getting form", id);
    return $(`form.admin-integration-row-edit-form[data-id=\"${id}\"]`);
  }

  static get_display_row(id) {
    return $(`tr.admin-integration-row[data-id=${id}]`);
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
    return $(that).parentsUntil('tr.admin-integration-row-edit').parent().data('id');
  }

  // ## Event functions

  // Event so server can push out integration updates
  static on_updates(updates) {
    const time = Date.now();
    return debug_admin('got integration updates', updates);
  }

  // Change this to onRender add a class based on ack value
  static send_update(data, cb) {
    debug_admin('updating integration', data);
    return socket.emit('integration::update', data, (error, response) => debug_admin('Updated integration', response));
  }

  // Change this to onRender add a class based on ack value
  static send_delete(id_integration, cb) {
    debug_admin('delete integration', id_integration.integration);
    socket.emit(
      'integration::delete',
      {
        integration: id_integration.integration,
        _id: id_integration.id,
      },
      (error, response) => debug_admin('deleted integration', response)
    );
    // Wait for the update to propagate
    //send_read_all
    return debug_admin('deleting integration');
  }

  static send_create(data, cb) {
    debug_admin('create integration', data);
    socket.emit('integration::create', { integration: data }, function (error, response) {
      debug_admin('created integration');
      //clear form
      return $('#admin-integrations-create')[0].reset();
    });
    return debug_admin('creating integration');
  }

  static send_read_one(name, cb) {
    debug_admin('read integration', name);
    socket.emit('integration::read', { ids }, (error, integration) => debug_admin('read integration', integration));
    // write to table
    return debug_admin('reading integration');
  }
}
AdminIntegration.initClass();

$(function () {
  // Setup the socket message listeners

  socket.on('integrations::updated', updates => AdminIntegrations.send_read_all());

  // Load the initial data
  AdminIntegrations.send_read_all();

  // ## Integrations edit
  // On row click, edit the row

  // Show the edit form on row click
  $('#admin-integrations-table').on('click', 'tr.admin-integration-row', function (ev) {
    const id = $(this).data('id');
    return AdminIntegration.edit_row(id);
  });

  // Hide the edit form on cancel
  $('#admin-integrations-table').on(
    'click',
    'tr.admin-integration-row-edit .admin-integration-row-save',
    function (ev) {
      ev.preventDefault();

      const id = AdminIntegration.this_row_id(ev.target);

      const form = AdminIntegration.get_edit_form(id);
      debug_admin('formarr', form.serializeArray());
      const data = {};
      form.serializeArray().map(function (x) {
        debug('form', x.name, x.value);
        return (data[x.name] = x.value);
      });

      AdminIntegration.send_update(data, response => display_row(id));

      return false;
    }
  );

  // Hide the edit form on cancel
  $('#admin-integrations-table').on(
    'click',
    'tr.admin-integration-row-edit .admin-integration-row-cancel',
    function (ev) {
      ev.preventDefault();
      const id = AdminIntegration.this_row_id(this);
      return AdminIntegration.display_row(id);
    }
  );

  // Delete the integration
  $('#admin-integrations-table').on(
    'click',
    'tr.admin-integration-row-edit .admin-integration-row-delete',
    function (ev) {
      ev.preventDefault();
      const id = AdminIntegration.this_row_id(this);
      return AdminIntegration.send_delete({
        _id: id,
      });
    }
  );

  // Hide the edit form on cancel
  $('#admin-integrations-table').on(
    'click',
    'tr.admin-integration-row-edit .admin-integration-row-password',
    function (ev) {
      ev.preventDefault();
      return false;
    }
  );

  // Update the modified user
  $('.admin-integration-row-edit-form').on('submit', function (ev) {
    ev.preventDefault();
    return false;
  });

  // Update the modified user
  // Only works on focus
  $('body').on('keyup', '', function (ev) {
    if (ev.which === 27) {
      const id = AdminIntegration.this_row_id(ev.target);
      AdminIntegration.display_row(id);
    }
    return false;
  });

  // ## Create new integrtation

  // Show the create zendesk form
  $('#admin-integrations-create select[name="type"]').on('change', function (ev) {
    debug_admin('should create integrations', ev);
    const type = $(ev.target).val();
    return AdminIntegrations.render_create(type);
  });

  // Submit new integration
  return $('#admin-integrations-create').on('submit', function (ev) {
    ev.preventDefault();

    // '.has-error'
    // Get the form and turn the fields into an object
    const data = {};
    debug_admin('formarr', ev, $(ev), $(ev.target).serializeArray());
    $(ev.target)
      .serializeArray()
      .map(function (x) {
        debug('form', x.name, x.value);
        return (data[x.name] = x.value);
      });

    AdminIntegration.send_create(data, response => AdminIntegration.display_row(id));

    return false;
  });
});

window.AdminIntegrations = AdminIntegrations;
window.AdminIntegration = AdminIntegration;
