// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Refresh

// Refresh your page on server changes, usually for a dev environment

// Requires socket or /status support on the server for
// it's refresh data

class Refresh {
  static initClass() {
    this.logger = debug('oa:refresh');

    // Track the previous start and update time
    this.start_time = null;
    this.update_time = null;

    // How often to run
    this.timeout = 1000;
  }

  // -----------------------------------------------------------------
  // ###### `Function `Refresh.run()`
  // Main entry point
  static run() {
    if (typeof socket === 'undefined') {
      Refresh.logger('running poll');
      return Refresh.run_ajax_poll();
    } else {
      Refresh.logger('running socket');
      return Refresh.run_socket();
    }
  }

  // -----------------------------------------------------------------
  // ###### `Function `Refresh.run_ajax_poll()`
  // If we have a socket io connection `socket` use that
  static run_socket() {
    // Reload when the app has restarted
    socket.on('time_start', function (msg) {
      if (!Refresh.start_time) {
        Refresh.start_time = msg.start;
      }

      if (!Refresh.update_time) {
        Refresh.update_time = msg.update;
      }

      if (Refresh.start_time !== msg.start) {
        return location.reload();
      }
    });

    // Reload when a view updates
    return socket.on('time_update', function (msg) {
      Refresh.update_time = msg.time;
      return location.reload();
    });
  }

  // -----------------------------------------------------------------
  // ###### `Function `Refresh.run_ajax_poll()`
  // Use the `/api/status` api call
  static run_ajax_poll() {
    Refresh.logger('send request');
    return $.ajax({
      url: '/status/time',
      timeout: 2000,
      complete() {
        Refresh.logger('set next timeout');
        return setTimeout(() => Refresh.run_ajax_poll(), 1000);
      },
      success(data) {
        Refresh.logger('request returned', Refresh.start_time, Refresh.update_time, data);
        if (!Refresh.start_time) {
          Refresh.start_time = data.time.start;
        }
        if (!Refresh.update_time) {
          Refresh.update_time = data.time.update;
        }
        if (Refresh.start_time !== data.time.start) {
          location.reload();
        }
        if (Refresh.update_time !== data.time.update) {
          return location.reload();
        }
      },
      error(error) {
        return Refresh.logger('failed', error);
      },
      dataType: 'json',
    });
  }
}
Refresh.initClass();

// auto run when included
Refresh.run();

window.Refresh = Refresh;
