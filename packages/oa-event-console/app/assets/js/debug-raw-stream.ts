// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # ApiKey

// Methods for rendering the admin apikey section
// The class is only really for namespacing methods

const debug_raw_stream = debug('oa:event:console:debug');

// On load
socket.emit('events::join_raw_stream', function (err, res) {
  if (err) {
    Message.error(err);
  }
  return Message.info_label('Joined raw stream', 'You are now recieveing the raw stream of events');
});

socket.on('events::raw_stream', function (doc) {
  debug_raw_stream('raw_stream got doc', doc);
  return RawStream.process_event(doc);
});

$(() => socket.emit('events::join_raw_stream', (err, res) => debug('initial raw_stream setup')));

// ## RawStream Class

class RawStream {
  static initClass() {
    this.logger = debug_raw_stream;
    this.container = $('#debug_raw_stream');
  }

  static process_event(doc) {
    return this.container.append('<div class="raw_event">' + JSON.stringify(doc) + '</div>');
  }
}
RawStream.initClass();

window.RawStream = RawStream;
