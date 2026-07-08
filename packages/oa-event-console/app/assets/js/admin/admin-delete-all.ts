// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # DeleteAll

// Methods for rendering the admin delete section
// The class is only really for namespacing methods

const debug_delete_all = debug('oa:event:console:delete:all');

// ## Class

class DeleteAll {
  static initClass() {
    this.delete_all_id = '#delete-all-button';
    this.delete_all_confirmation_id = '#delete-all-button-confirmed';
  }

  static show_confirmation() {
    debug_delete_all('showing confirmation');
    return $(this.delete_all_confirmation_id).show();
  }

  static hide_confirmation() {
    debug_delete_all('hiding confirmation');
    return $(this.delete_all_confirmation_id).hide();
  }

  static delete_confirmed() {
    debug_delete_all('sending delete all');
    this.send_delete(function (err, response) {
      debug_delete_all('Deletion responded with', response);
      if (err) {
        return Message.error('Deletion failed');
      } else {
        if (response.rows > 0) {
          return Message.info_label(`All events were Deleted (count=${response.rows})`);
        } else {
          return Message.info_label('No events were Deleted');
        }
      }
    });
    return this.hide_confirmation();
  }

  // Send Delete to server
  static send_delete(cb) {
    debug_delete_all('delete all');
    socket.emit('events::delete::all', {}, function (error, response) {
      debug_delete_all('deleted apikey', response);
      //send_read_all
      if (cb) {
        return cb(error, response);
      }
    });
    return debug_delete_all('deleting all events');
  }
}
DeleteAll.initClass();

$(function () {
  // Setup the socket message listeners

  socket.on('admin::delete::all', response => debug('Deleted', response));

  DeleteAll.hide_confirmation();

  $('#delete-all-button').on('click', function (ev) {
    ev.preventDefault();
    return DeleteAll.show_confirmation();
  });

  return $('#delete-all-button-confirmed').on('click', function (ev) {
    ev.preventDefault();
    return DeleteAll.delete_confirmed();
  });
});

window.DeleteAll = DeleteAll;
