// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_ev = debug('oa:event:event-detail');

// # EventDetails

// Events and Class name space for all the console event details stuff

// ## Event details modal events

// onload
$(function () {
  // Buttons in the event_detail modal also do the actions
  $(EventDetails.id).on('click', function (ev) {
    debug_ev('modal click ev', ev, $(ev.target));
    const event_id = $('#event-details-add-note input[name="id"]').val();

    switch ($(ev.target).data('action')) {
      case 'acknowledge':
        return send_acknowledge([event_id], (err, res) => ConsoleSocketIO.get_event_detail(event_id, 'default', true));

      case 'unacknowledge':
        return send_unacknowledge([event_id], (err, res) =>
          ConsoleSocketIO.get_event_detail(event_id, 'default', true)
        );

      case 'delete':
        return send_delete([event_id], (err, res) => EventDetails.hide());

      case 'clear':
        return send_clear(
          [event_id],
          (
            err,
            res //ConsoleSocketIO.get_event_detail event_id, 'default', true
          ) => EventDetails.hide()
        );

      case 'create-rule':
        return (window.location = `/rules/new#${event_id}`);

      case 'assign':
        var user = $(ev.target).data('user');
        if (!user) {
          return Message.error('No user');
        }
        debug_ev('event details assign user', user);
        return send_assign([event_id], user, (err, res) => ConsoleSocketIO.get_event_detail(event_id, 'default', true));

      case 'severity':
        var severity = $(ev.target).data('severity');
        if (!severity) {
          return Message.error('No severity');
        }
        debug_ev('event details update severity', severity);
        return send_severity([event_id], severity, (err, res) =>
          ConsoleSocketIO.get_event_detail(event_id, 'default', true)
        );
    }
  });

  // Show one of the event details modal console-toolbar-search-iconndhf
  $('#event-details-modal-tabpanel a').click(function (ev) {
    ev.preventDefault();
    return $(this).tab('show');
  });

  // The event detail "add note" form handler
  $('#event-details-add-note').submit(function (ev) {
    ev.preventDefault();
    // Get the event ID currently loaded in the modal
    const event_id = $('#event-details-add-note input[name="id"]').val();
    // Get the note
    const note = $('#event-details-add-note input[name="note"]').val();
    // Run away
    if (note.match(/^\s*$/)) {
      return;
    }

    // Send the socket message
    return socket.emit(
      'event_add_note',
      {
        id: event_id,
        message: note,
      },
      function (err, res) {
        // The callback for the server to call once the emit is processed
        // Reload the event in the modal
        ConsoleSocketIO.get_event_detail(event_id);
        // Clear the form note
        return $('#event-details-add-note input[name="note"]').val('');
      }
    );
  });

  // Capture the close event, and fix the modal status
  $(EventDetails.id).on('hidden.bs.modal', ev => (EventDetails.modal = false));

  // Capture the show event, and fix the modal status
  $(EventDetails.id).on('shown.bs.modal', ev => (EventDetails.modal = true));

  // Stop key press events from bubbling past the modal to the console
  return $(EventDetails.id).on('keydown keyup keypress', function (ev) {
    debug_ev('keypress in the modal', ev);
    return ev.stopPropagation();
  });
});

// ## EventDetail namespace for functions

class EventDetails {
  static initClass() {
    this.id = '#event-details-modal';

    this.modal = false;
    // ### Summary tab

    // @detail_fields are the fields that display on the "event detail tab"
    this.detail_fields = ['node', 'owner', 'severity', 'group'];

    // Store the two templates
    this.details_fields_template = $('#event-details-details-field-template').html();
    Mustache.parse(this.details_fields_template);
    this.details_fields_el = $('#event-details-widget-fields');

    this.details_summary_template = $('#event-details-details-summary-template').html();
    Mustache.parse(this.details_summary_template);
    this.details_summary_el = $('#event-details-widget-summary');

    // ### Notes tab
    this.notes_template = $('#event-details-notes-template').html();
    Mustache.parse(this.notes_template);
    this.notes_el = $('#event-details-modal-notes-table');

    // ### History tab
    this.history_template = $('#event-details-history-template').html();
    Mustache.parse(this.history_template);
    this.history_el = $('#event-details-modal-history-table');

    // ### matches tab
    this.matches_global_template = $('#event-details-matches-global-row-template').html();
    this.matches_group_template = $('#event-details-matches-group-row-template').html();
    this.matches_rule_template = $('#event-details-matches-rule-row-template').html();

    Mustache.parse(this.matches_global_template);
    Mustache.parse(this.matches_group_template);
    Mustache.parse(this.matches_rule_template);
    this.matches_global = $('#event-details-modal-global-matches-table tbody');
    this.matches_group = $('#event-details-modal-group-matches-table tbody');

    // ### Details tab
    this.fields_template = $('#event-details-fields-row-template').html();
    Mustache.parse(this.fields_template);
    this.fields_el = $('#event-details-modal-fields-table');

    // Some columns we don't want in the event_detail modal
    this.top_fields = ['node', 'summary'];
    this.ignore_fields = ['notes', 'history', 'matches', 'autoincr_id', '__v', 'occurrences'];

    this.button_ack_el = $('.btn.event-detail-acknowledge');
    this.button_unack_el = $('.btn.event-detail-unacknowledge');
  }

  static show(tab_field) {
    tab_field ??= 'default';
    debug_ev('showing event details for tab field', tab_field);
    $(this.id).modal('show');

    switch (tab_field) {
      case 'notes':
        $('#event-details-modal-tabpanel a[href="#event-details-modal-notes"]').tab('show');
        break;

      case 'details':
        $('#event-details-modal-tabpanel a[href="#event-details-modal-details"]').tab('show');
        break;
    }

    return (this.modal = true);
  }

  static hide() {
    $(this.id).modal('hide');
    return (this.modal = false);
  }

  // Render the details section
  static details(data) {
    // Make the text render similarly in html
    const fancy_summary = data.summary
      .escapeHTML()
      .replace(/\f/gm, '<br><br>')
      .replace(/\r?\n\t/gm, '<br>')
      .replace(/\r?\n/gm, '<br>')
      .replace(/\s/gm, '&nbsp;');

    // Loop over all the required fields to render
    for (var field of this.detail_fields) {
      this.details_fields_el = $(`#event-details-widget-field-${field}`);
      var field_data = {
        title: _.capitalize(field),
        content: data[field],
      };
      debug_ev('rendering field', field, field_data);
      this.details_fields_el.html(Mustache.render(this.details_fields_template, field_data));
    }

    // Summary is seperate
    return this.details_summary_el.html(Mustache.render(this.details_summary_template, { summary: fancy_summary }));
  }

  static notes(data) {
    this.notes_el.html(Mustache.render(this.notes_template, data));
    if (data.notes.length === 0) {
      return this.notes_el.append('<tr><td>No notes</td></tr>');
    }
  }

  static history(data) {
    this.history_el.html(Mustache.render(this.history_template, data));
    if (data.history.length === 0) {
      return this.history_el.append('<tr><td>No history</td></tr>');
    }
  }

  static matches(data) {
    let render_data;
    this.matches_global.html('');
    this.matches_group.html('');

    const all_matches_global = _.get(data, 'matches.global', []);
    const all_matches_group = _.get(data, 'matches.group', []);

    if (all_matches_global.length === 0) {
      this.matches_global.append('<tr><td>No matches</td></tr>');
    }
    for (var glmatch of all_matches_global) {
      render_data = {
        name: glmatch.name,
        uuid: glmatch.uuid.split('-')[0],
        uuid_full: glmatch.uuid,
      };
      debug('Render data', render_data);
      this.matches_global.append(Mustache.render(this.matches_global_template, render_data));
    }

    if (all_matches_group.length === 0) {
      this.matches_group.append('<tr><td>No matches</td></tr>');
    }
    for (var grmatch of all_matches_group) {
      render_data = {
        group_name: grmatch.group_name,
        group_uuid: grmatch.group_uuid.split('-')[0],
        group_uuid_full: grmatch.group_uuid,
      };
      this.matches_group.append(Mustache.render(this.matches_group_template, render_data));
      for (var rumatch of grmatch.matches) {
        var rule_data = {
          name: rumatch.name,
          uuid: rumatch.uuid.split('-')[0],
          uuid_full: rumatch.uuid,
        };
        this.matches_group.append(Mustache.render(this.matches_rule_template, rule_data));
      }
    }

    return true;
  }

  static fields(data) {
    const order = this.leftover_fields(data);
    this.fields_el.html('');
    this.fields_el.append($('#event-details-fields-heading-template').html());
    for (var key of order) {
      this.fields_el.append(
        Mustache.render(this.fields_template, {
          name: key,
          value: data[key],
        })
      );
    }
    return true;
  }

  // Work out the fields we should display in details
  static leftover_fields(event_data) {
    return _.difference(_.keys(event_data).sort(), this.ignore_fields);
  }

  static buttons(data) {
    if (data.acknowledged) {
      this.button_ack_el.hide();
      this.button_unack_el.show();
      return this.button_unack_el.focus();
    } else {
      this.button_ack_el.show();
      this.button_ack_el.focus();
      return this.button_unack_el.hide();
    }
  }

  // ###### store_id( data )
  // Store the id so notes can submit with it
  static store_id(data) {
    return $('#event-details-add-note input[name="id"]').val(data._id);
  }

  // ###### chart( data )
  // Render the chart from the id in `data`
  static chart(data) {
    if (data.occurrences) {
      debug_ev('got occurences', data.occurrences);
      $('#ev-occurrences').html('');
      //Occurrence.c3_time '#ev-occurrences', data.occurrences
      return Occurrence.event_time_dots('#ev-occurrences', data.occurrences, { size: 15 });
    }
  }

  // ### render( data )
  // Render all the components of event details
  static render(data) {
    this.store_id(data);
    this.details(data);
    this.notes(data);
    this.history(data);
    this.matches(data);
    this.fields(data);
    this.buttons(data);
    return this.chart(data);
  }
}
EventDetails.initClass();

window.EventDetails = EventDetails;
