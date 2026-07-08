// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_evb = debug('oa:event:event-detail-bulk');

// # EventDetails

// Events and Class name space for all the console event details stuff

// ## Event details modal events

// onload
$(function () {
  debug_evb('ON LOAD');

  // Stop key press events from bubbling past the modal to the console
  //  $(EventBulkModify.id).on 'keydown keyup keypress', ( ev )->
  //    debug_ev 'keypress in the modal', ev
  //    ev.stopPropogation()

  $('#event-detail-bulk-modify-modal').on('keydown keyup keypress', function (ev) {
    debug_evb('keypress on blockme modal', ev);
    return ev.stopPropagation();
  });

  // Buttons in the event_detail modal also do the actions
  //  $(EventBulkModify.id).on 'click', (ev)->
  //    debug_evb 'modal click ev', ev, $(ev.target)
  //    event_id = $('#event-details-bulk-add-note > input[name="id"]').val()

  //    switch $(ev.target).data('action')
  //
  //      when 'acknowledge'
  //        send_acknowledge [event_id], ( err, res )->
  //          ConsoleSocketIO.get_event_detail event_id

  // The event detail "add note" form handler
  $('#event-details-bulk-add-note').submit(ev => EventBulkModify.update(ev));

  // Capture the close event, and fix the modal status
  $(EventBulkModify.id).on('hidden.bs.modal', ev => (EventBulkModify.modal = false));

  // Capture the show event, and fix the modal status
  return $(EventBulkModify.id).on('shown.bs.modal', ev => (EventBulkModify.modal = true));
});

class EventBulkModify {
  static initClass() {
    this.id = '#event-detail-bulk-modify-modal';
    this.modal = false;
    this.event_ids = [];
  }

  static show(event_ids) {
    $(this.id).modal('show');
    debug_evb('SHOW BM', event_ids);
    $('#event-details-bulk-add-note > input[name="externalid"]').val('');
    $('#event-details-bulk-add-note > input[name="note"]').val('');
    this.event_ids = event_ids;
    return (this.modal = true);
  }

  static hide() {
    $(this.id).modal('hide');
    debug_evb('HIDE BM');
    this.modal = false;
    return (this.event_ids = []);
  }

  static update(ev) {
    const self = this;
    debug_evb('update note');
    ev.preventDefault();
    // Get the note
    const note = $('#event-details-bulk-add-note > input[name="note"]').val();
    // Get the external ID
    const external_id = $('#event-details-bulk-add-note > input[name="externalid"]').val();

    // Run away
    if (note.match(/^\s*$/)) {
      return;
    }

    return send_acknowledge_with_note(this.event_ids, note, external_id, function (err, res) {
      debug_evb('done update', res);
      $('#event-details-bulk-add-note > input[name="note"]').val('');
      $('#event-details-bulk-add-note > input[name="externalid"]').val('');
      return self.hide();
    });
  }

  static blah() {
    socket.emit(
      'events::acknowledge::note',
      {
        ids: this.event_ids,
        external_id,
        message: note,
      },
      function (err, res) {
        debug_evb('done update', res);
        $('#event-details-bulk-add-note > input[name="note"]').val('');
        $('#event-details-bulk-add-note > input[name="externalid"]').val('');
        return self.hide();
      }
    );
    return (() => {
      const result = [];
      for (var id of this.event_ids) {
        var rec = w2ui['event_grid'].get(id);
        //new_class = _.without rec._custom_class, 'unacknowledged'
        //rec._custom_class = _.union new_class, ['acknowledged']
        result.push(w2ui['event_grid'].set(id, { acknowledged: true, owner: 'Acknowledging..' }));
      }
      return result;
    })();
  }
}
EventBulkModify.initClass();

window.EventBulkModify = EventBulkModify;
