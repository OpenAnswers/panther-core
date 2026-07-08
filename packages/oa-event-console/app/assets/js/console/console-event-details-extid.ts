// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_evb = debug('oa:event:event-detail-extid');

// # EventDetails

// Events and Class name space for all the console event details stuff

// ## Event external ID modal events

// onload
$(function () {
  debug_evb('ON LOAD');

  $('#event-detail-extid-modify-modal').on('keydown keyup keypress', function (ev) {
    debug_evb('keypress on blockme modal', ev);
    return ev.stopPropagation();
  });

  // The event detail "add extid" form handler
  $('#event-details-extid-add').submit(ev => EventBulkExtID.update(ev));

  // Capture the close event, and fix the modal status
  $(EventBulkExtID.id).on('hidden.bs.modal', ev => (EventBulkExtID.modal = false));

  // Capture the show event, and fix the modal status
  return $(EventBulkExtID.id).on('shown.bs.modal', ev => (EventBulkExtID.modal = true));
});

class EventBulkExtID {
  static initClass() {
    this.id = '#event-detail-extid-modify-modal';
    this.modal = false;
    this.event_ids = [];
  }

  static show(event_ids) {
    $(this.id).modal('show');
    debug_evb('SHOW BM EXTID', event_ids);
    $('#event-details-extid-add > input[name="externalid"]').val('');
    this.event_ids = event_ids;
    return (this.modal = true);
  }

  static hide() {
    $(this.id).modal('hide');
    debug_evb('HIDE BM EXTID');
    this.modal = false;
    return (this.event_ids = []);
  }

  static update(ev) {
    const self = this;
    debug_evb('update extid');
    ev.preventDefault();
    // Get the external ID
    const external_id = $('#event-details-extid-add > input[name="externalid"]').val();

    // Run away if external ID is empty
    if (external_id.match(/^\s*$/)) {
      return;
    }

    return send_external_id(this.event_ids, external_id, function (err, res) {
      debug_evb('done update', res);
      $('#event-details-extid-add > input[name="externalid"]').val('');
      return self.hide();
    });
  }
}
EventBulkExtID.initClass();

window.EventBulkExtID = EventBulkExtID;
