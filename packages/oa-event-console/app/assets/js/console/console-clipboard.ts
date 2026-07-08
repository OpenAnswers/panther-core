// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_clipboard = debug('oa:event:console:clipboard');

class ClipBoard {
  static initClass() {
    this.clipboard_brief_fields = [
      'node',
      'tag',
      'summary',
      'last_occurrence',
      'first_occurrence',
      'severity',
      'group',
      'agent',
      'tally',
    ];

    this.clipboard_skip_fields = ['history', 'notes', 'autoincr_id', '__v', '_custom_class', 'style'];

    // Store an array of the w2ui fields
    this.w2ui_fields = _.map(w2grid_all_columns, 'field');
  }

  // Return the text for the brief details of an event
  static copy_event_text_brief(event) {
    let text;
    text = (() => {
      const result = [];
      for (var field of this.clipboard_brief_fields) {
        var event_field_data = event[field] || '';

        if (w2_is_date_field(field)) {
          event_field_data = ts_to_locale(event_field_data);
        }

        result.push((text = `${field}: ${event_field_data}`));
      }
      return result;
    })();

    return text.join('\n');
  }

  // Return the text for a complete event
  static copy_event_text_all(event) {
    let text;
    const event_fields = _.keys(event);
    const configured_fields = _.intersection(this.w2ui_fields, event_fields);
    const event_extra_fields = _.difference(this.w2ui_fields, event_fields);
    let fields = configured_fields.concat(event_extra_fields);
    fields = _.without(fields, this.clipboard_skip_fields);

    text = (() => {
      const result = [];
      for (var field of fields) {
        var event_field_data = event[field];

        if (w2_is_date_field(field)) {
          event_field_data = ts_to_locale(event_field_data);
        }

        result.push((text = `${field}: ${event_field_data}`));
      }
      return result;
    })();

    return text.join('\n');
  }

  // This needs to be triggered some time before the copy so that the
  // html elements have the correct content when the flash "click" happens

  static set_event_copy_text(id) {
    // populate summary data somewhere
    const event = w2ui['event_grid'].get(id);

    debug_clipboard('ev to copy', event, this.w2ui_fields);

    const clipboard_full_text = ClipBoard.copy_event_text_all(event);
    const clipboard_brief_text = ClipBoard.copy_event_text_brief(event);

    return [clipboard_full_text, clipboard_brief_text];
  }

  static set_events_copy_text(ids) {
    let clipboard_brief_text = '';
    let clipboard_full_text = '';
    for (var id of ids) {
      var [clipboard_full_text_id, clipboard_brief_text_id] = this.set_event_copy_text(id);
      clipboard_full_text += clipboard_full_text_id + '\n\n';
      clipboard_brief_text += clipboard_brief_text_id + '\n\n';
    }

    // populate full event detail somewhere
    //clipboard.setText clipboard_full_text
    $('#clipboard_full_text').val(clipboard_full_text);
    debug_clipboard('set full text to', $('#clipboard_full_text').val());

    $('#clipboard_brief_text').val(clipboard_brief_text);
    return debug_clipboard('set summary text to', $('#clipboard_brief_text').val());
  }
}
ClipBoard.initClass();

// window on load
$(function () {
  // ### Copy event to clipboard

  // This uses clipboard to copy event data into the clipboard
  // use "text: ()=> " to grab from hidden element

  let clipboard_brief;
  const clipboard_details_full = new Clipboard('a.copy-details-full', {
    text() {
      return $('#clipboard_full_text').val();
    },
  });

  const clipboard_details_brief = new Clipboard('a.copy-details-brief', {
    text() {
      return $('#clipboard_brief_text').val();
    },
  });

  return (clipboard_brief = new Clipboard('a.copy-context-brief', {
    text() {
      return $('#clipboard_brief_text').val();
    },
  }));
});

window.ClipBoard = ClipBoard;
