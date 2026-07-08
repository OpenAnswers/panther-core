// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_admin = debug('oa:event:console:admin');

// ## AdminCertificate

// Methods for rendering the admin certificate section
// The class is only really for namespacing these methods
// This is largely a copy paste of AdminUser

// Should be a generic Admin class that does most of the grunt work
// Most socket table/edit forms are similar so should be able to setup a
// global generic table renderer

class AdminCertificate {
  // ## Event functions

  // ###### send_client_archive()
  static send_client_archive(data, cb) {
    debug_admin('reading client archive', data);
    return socket.emit('certificate::client::archive', data, function (err, tarball) {
      debug_admin('read client archive', tarball);
      if (cb) {
        return cb(err, tarball);
      }
    });
  }

  // ###### gen_blob()
  static gen_blob(string, type) {
    type ??= 'text/html';
    const bytes = new Uint8Array(string.length);
    for (let i = 0, end = string.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      bytes[i] = string.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  }

  // ###### save_archive()
  static save_archive(data) {
    if (data == null) {
      return Message.error('archive save failed - request incomplete');
    }
    if (data.archive == null) {
      return Message.error('archive save failed - no archive specified');
    }
    const components = data.archive.split('-');
    if (components.length !== 2) {
      return Message.error('archive save failed - invalid archive name');
    }
    const suffix = components[1] === 'linux' ? '.tar' : '.zip';
    data = {
      path: components[0],
      file: components[0].concat('-', components[1], '-client', suffix),
    };
    return this.send_client_archive(data, (err, res) => {
      if (err) {
        return Message.error('archive save failed');
      }
      const confblob = this.gen_blob(res.client, 'application/binary');
      return saveAs(confblob, components[0].concat('-config-', components[1], suffix));
    });
  }
}

$(() =>
  // Setup the socket message listeners

  // Select the download
  $('#admin-download-configuration').on('submit', function (ev) {
    ev.preventDefault();
    // Get the form and turn the fields into an object
    const data = {};
    $(ev.target)
      .serializeArray()
      .map(function (x) {
        debug('form', x.name, x.value);
        return (data[x.name] = x.value);
      });
    AdminCertificate.save_archive(data);
    return false;
  })
);

window.AdminCertificate = AdminCertificate;
