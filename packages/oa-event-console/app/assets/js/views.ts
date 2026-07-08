// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_views = debug('oa:event:console:admin');

// ### Views
// Methods for rendering the view section
// The class is only really for namespacing methods
// This needs to be made generic as the same thing is being
// used in multiple places.. admin-users admin-integration
class Views {
  static initClass() {
    // Pull in the <script> templates that are rendered by Jade
    this.template = $('#views-template').html();
    Mustache.parse(this.template);

    // Allow for multiple types of template
    this.mustache = {
      user: {
        template: this.template,
        element: $('#views-table-user'),
      },
      default: {
        template: this.template,
        element: $('#views-table-default'),
      },
    };
  }

  // Render a type of template
  static render_type(type, data) {
    debug_views('render_type', type, data);
    if (this.mustache[type] == null) {
      console.log('ERROR: No setup for type [%s]', type);
      return;
    }
    const { element } = this.mustache[type];
    const { template } = this.mustache[type];
    return element.html(Mustache.render(template, { views: data }));
  }
  //debug_views 'rendered', element.html()

  // Clear for create render area back to blank and set the select
  static clear_create() {
    $('#admin-views-create select[name="type"]').val('');
    return this.element_create.html('');
  }

  // Select the edit row for an id
  static get_edit_row(id) {
    return $(`tr.views-row-edit[data-id=${id}]`);
  }

  // Select the edit form for an id
  static get_edit_form(id) {
    debug_views("i'm getting form", id);
    return $(`form.views-row-edit-form[data-id=\"${id}\"]`);
  }

  // Select the display row for an id
  static get_display_row(id) {
    return $(`tr.views-row[data-id=${id}]`);
  }

  // Show the edit view, hide the display view
  static edit_row(id) {
    this.get_display_row(id).addClass('hide');
    return this.get_edit_row(id).removeClass('hide');
  }

  // Show the display view, hide the edit view
  static display_row(id) {
    this.get_edit_row(id).addClass('hide');
    return this.get_display_row(id).removeClass('hide');
  }

  // Get this row-edit id from any child element
  static this_row_id(that) {
    return $(that).parentsUntil('tr.views-row-edit').parent().data('id');
  }

  // ## Event functions

  // Event so server can push out integration updates
  static on_updates(updates) {
    const time = Date.now();
    return debug_views('got view updates', updates, time);
  }

  // Change this to onRender add a class based on ack value
  static send_update(data, cb) {
    debug_views('updating views', data);
    return socket.emit('view::update', { view: data }, response => debug_views('Updated views', response));
  }

  // Change this to onRender add a class based on ack value
  static send_delete(id_view, cb) {
    debug_views('delete view', id_view);
    socket.emit('view::delete', { _id: id_view }, response => debug_views('deleted view', response));
    // Wait for the update to propagate
    //send_read_all
    return debug_views('deleting view');
  }

  static send_create(data, cb) {
    debug_views('create view', data);
    socket.emit('view::create', { view: data }, function (response) {
      debug_views('created view');
      //clear form
      return $('#views-add-form')[0].reset();
    });
    return debug_views('creating view');
  }

  static send_read_one(id, cb) {
    debug_views('read view', name);
    socket.emit('view::read', { _id: id }, view => debug_views('read view', view));
    // write to table
    return debug_views('reading view');
  }

  static send_read_all(cb) {
    debug_views('read all views');
    return socket.emit('views::read', {}, function (data) {
      debug_views('read views', data);
      return Views.render_type('user', data);
    });
  }

  static send_set_default(id, cb) {
    debug_views('setting default');
    return socket.emit('view::set_default', id, data => debug_views('set default to', id));
  }
}
Views.initClass();

// Window onload
$(function () {
  // Setup the socket message listeners
  // Reload data when it changes
  socket.on('views::updated', function (updates) {
    debug_views('views::updated so rendering');
    return Views.send_read_all();
  });

  // Load the initial data
  Views.send_read_all();

  // ## Edit Views

  // Show the edit form on row click
  $('#views-table-user').on('click', 'tr.views-row', function (ev) {
    const id = $(this).data('id');
    return Views.edit_row(id);
  });

  // Set as default
  $('#views-table-user').on('click', 'tr.views-row-edit .button-default', function (ev) {
    ev.preventDefault();

    const id = Views.this_row_id(this);

    Views.send_set_default(id, response => Views.display_row(id));

    return false;
  });

  // Save the edit
  $('#views-table-user').on('click', 'tr.views-row-edit .button-save', function (ev) {
    ev.preventDefault();
    const id = Views.this_row_id(this);
    const form = Views.get_edit_form(id);
    const data = Form.form_to_object(form);
    Views.send_update(data, response => Views.display_row(id));
    return false;
  });

  // Hide the edit form on cancel
  $('#views-table-user').on('click', 'tr.views-row-edit .button-cancel', function (ev) {
    ev.preventDefault();
    const id = Views.this_row_id(this);
    return Views.display_row(id);
  });

  // Delete the view
  $('#views-table-user').on('click', 'tr.views-row-edit .button-delete', function (ev) {
    ev.preventDefault();
    const id = Views.this_row_id(this);
    return Views.send_delete({
      _id: id,
    });
  });

  // Save the edit
  $('.views-row-edit-form').on('submit', function (ev) {
    ev.preventDefault();

    const form = $(ev.target);
    const data = Form.form_to_object(form);

    Views.send_update(data, response => Views.display_row(id));

    return false;
  });

  // Hide the edit form on escape
  // Only works on focus!
  $('body').on('keyup', '', function (ev) {
    if (ev.which === 27) {
      const id = Views.this_row_id(ev.target);
      Views.display_row(id);
    }
    return false;
  });

  // ## Create new view

  // Submit new view
  // $('#views-add-form').on 'click', '.button-save', ( ev )->
  //   ev.preventDefault()
  //   false

  // Save the edit
  $('#views-add-form').on('submit', function (ev) {
    ev.preventDefault();

    const form = $(ev.target);
    const data = Form.form_to_object(form);

    Views.send_create(data, response => Views.display_row(id));
    return false;
  });

  // Typeahead

  const typeahead_defaults = {
    minLength: 0,
    showHintOnFocus: true,
    autoSelect: true,
    items: 'all',
  };

  return $('.fields_typeahead').typeahead(_.defaults({ source: fields_list }, typeahead_defaults));
});

window.Views = Views;
