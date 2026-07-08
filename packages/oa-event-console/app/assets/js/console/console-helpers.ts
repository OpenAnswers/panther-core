// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Setup a debug instance for the helpers

const debug_helpers = debug('oa:event:console:helpers');

// ### ts_to_locale( timestamp )
// Convert a timestamp into something readable

const ts_to_locale = ts => new Date(ts).toLocaleString();

// ###### date_column_to_locale( record, field )
// The odd w2ui render setup doesn't easily provide the field
// to the render functions so we have to work around
// with this translation

const date_column_to_locale = (record, field) => ts_to_locale(record[field]);

// ###### w2_escape_cell( value )
// Escape a raw cell value for safe insertion into w2ui's
// `'<div>' + data + '</div>'` cell template. w2ui 1.4 does no escaping
// of its own, so any column whose field comes from event payload data
// (node, summary, agent, owner, ...) is an XSS sink unless wrapped here.

const w2_escape_cell = function (value) {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// ###### w2_add_default_escape_render( w2_columns )
// Attach an escaping default `render` to every column that does not
// already define one. Must run AFTER any specific render attachers
// (e.g. w2_add_date_render) so we only fill gaps.

const w2_add_default_escape_render = function (columns) {
  for (var col of columns) {
    if (col.render) {
      continue;
    }
    (function (fieldname) {
      col.render = function (record) {
        return w2_escape_cell(record[fieldname]);
      };
    })(col.field);
  }
};

// ###### w2_add_date_render( w2_columns )
// Modify a field definition to include a w2 date render function
// when it hits a display type of date in the array

const w2_add_date_render = columns =>
  (() => {
    const result = [];
    for (var col_def of columns) {
      debug_helpers('Looking for a date type column', col_def.field);
      if (!col_def.display_type || col_def.display_type !== 'Date') {
        continue;
      }
      debug_helpers('Found date type for a column', col_def.field);

      var fieldname = col_def.field;

      // Closure on `fieldname` and then define the render function
      result.push(
        (fieldname =>
          (col_def.render = function (record, row_index, col_index) {
            debug_helpers('Date render running', row_index, col_index, fieldname, record);
            const converted_date = new Date(record[fieldname]);
            if (converted_date.toString() === 'Invalid Date') {
              console.log('w2_add_date_render() Date field is not convertable', fieldname, record[fieldname]);
              return record[fieldname];
            } else {
              return converted_date.toLocaleString();
            }
          }))(fieldname)
      );
    }
    return result;
  })();

// ###### w2size()
// This sets the size of the w2grid to whatever is left of the screen
// after the nav bar. The nav bar doesn't take up render space so this
// needs a little bit of work
// Should be able to do this with css!!

const w2size = function () {
  let nav_height;
  debug_helpers(height, $('#nav').outerHeight(true), $(window).height());

  // Get the height of the nav bar and put the options bar below
  if ($('#nav').is(':visible')) {
    nav_height = $('#nav.navbar').outerHeight(true);
  } else {
    nav_height = 0;
  }
  $('#options_bar').css('margin-top', nav_height);

  // Now take the gap away from the console height
  const opt_height = $('#options_bar').outerHeight(true);
  var height = $(window).height() - opt_height;

  // Set the available height on the grid
  $('#event_grid').css('height', height);
  return w2ui['event_grid'].resize();
};

// **Note** this relies on the `w2grid_all_columns` global :|
// Store an array of w2ui data fields
const w2ui_date_fields = _.map(_.filter(w2grid_all_columns, { display_type: 'Date' }), 'field');
debug_helpers('w2_is_date_fields', w2ui_date_fields);

const w2_is_date_field = field => w2ui_date_fields.indexOf(field) > -1;

// ###### mongo_to_grid( document )
// Make a db doc into a w2ui record
// Should move this to the server

const mongo_to_grid = function (doc) {
  // recid is the w2ui record key
  doc.recid = doc._id;
  delete doc._id;

  // We need a sev style for the row
  //doc.style = sev_style doc.severity

  // We can load these when we need them
  if (doc.history) {
    delete doc.history;
  }
  if (doc.notes) {
    delete doc.notes;
  }
  doc._custom_class = w2_row_class_render;

  // Summary is no longer pre-escaped here: the grid's default cell render
  // (w2_add_default_escape_render) now escapes every field on the way out,
  // so escaping here would double-encode (`&amp;lt;` instead of `&lt;`).
  if (!(doc.summary && _.isString(doc.summary))) {
    // If we have a generic error handler we can do things like
    // notify, log and event socket it back in one place
    Message.warn(`Document didn't have a string summary\nnode[${doc.node}] sev[${doc.severity}]`, doc);
  }

  // Acks weren't populated by default previously
  // This may be redundant now
  if (doc.acknowledged !== true) {
    doc.acknowledged = false;
  }

  return doc;
};

// ###### w2_row_class_render()
// Modify an array of class names depending on record content

var w2_row_class_render = function (record, row_cls) {
  // Class for ack/unack
  row_cls ??= [];
  if (record.acknowledged) {
    row_cls.push('acknowledged');
  } else {
    row_cls.push('unacknowledged');
  }

  // Class for severity
  row_cls.push(`severity-${record.severity}`);

  return row_cls.join(' ');
};

// Filter by data attribute, works for data set with jquery `.data`
// If you are using this then maybe you shouldn't be using
// the DOM as a data store?
$.fn.filterByData = function (key, value) {
  return this.filter(function () {
    return $(this).data(key) === value;
  });
};

// console_process_hash( url_hash_component )
// Process any url hash (#whatever) changes for the console
// Currently supports `/view` and `/group`

const console_process_hash = function (hash, firstLoad) {
  let group_name, id, severity_name, tab, view;
  const view_res = hash.match(/\/view\/(.+?)(\/|$)/i);
  const group_res = hash.match(/\/group\/(.+?)(\/|$)/i);
  const event_res = hash.match(/\/event\/([a-f0-9]+)(\/(details|notes|history|fields))?/i);
  const severity_res = hash.match(/\/severity\/(\w+)/i);

  debug_helpers('processing console hash change', hash);

  if (!hash) {
    debug_helpers('Found no location #, populating with whatever we have');
    socket.emit('populate');
    return false;
  }

  // Check the groups
  if (group_res) {
    group_name = decodeURI(group_res[1]);
    debug_helpers('got group #', group_name);
  }

  // Check the view
  if (view_res) {
    // If we have an id, find it in the JS view structure
    id = decodeURI(view_res[1]);
    view = _.find(filters, function (e) {
      debug_helpers('#', hash, view_res);
      return e._id === id;
    });
    debug_helpers('got view #', id, view.name);
  }

  if (event_res) {
    id = decodeURI(event_res[1]);
    tab = decodeURI(event_res[2]);
    debug_helpers('got event #', id, tab);
    try {
      ConsoleSocketIO.get_event_detail(id);
    } catch (error) {
      console.log(`Couldn't open event detail: ${error}`);
    }
  }

  if (severity_res) {
    severity_name = decodeURI(severity_res[1]);
    debug_helpers('got sev #', id, tab);
  }

  // Now apply the groups and views or events we found
  if (group_name != null && view?.name) {
    set_group_and_view(group_name, id, view.name);
  }

  if (group_name != null && (typeof severity !== 'undefined' && severity !== null ? severity.name : undefined)) {
    return set_group_and_severity(group_name, severity);
  } else if (view?.name) {
    // We matched an ID to a name, so use that
    return set_view(id, view.name);
  } else if (group_name != null) {
    return set_group(group_name);
  } else if (event_res != null) {
    if (firstLoad) {
      // On page first load, remember to populate console events
      return socket.emit('populate');
    }
  } else if (severity_res != null) {
    return set_severity(severity_name);
  } else {
    // Otherwise just get the defaults
    return socket.emit('populate');
  }
};

class Helpers {
  static w2ui_highlight_records(ids) {
    debug_helpers('highlighting', ids);
    return w2ui['event_grid'].resize();
  }

  static w2ui_highlight_remove(ids) {
    debug_helpers('remove highlighting', ids);
    return w2ui['event_grid'].resize();
  }

  // ### menu_x_pos( click_event )
  // Build a x position for a conext menu from a click event
  // Keeps it inside the page
  // Doesn't handle sub menus!

  static menu_x_pos(ev, $menu) {
    const mouse_x = ev.pageX;
    const page_width = $(window).width();
    const menu_width = $menu.width();

    // opening menu would pass the side of the page
    if (mouse_x + menu_width + 10 > page_width && menu_width < mouse_x) {
      return page_width - menu_width - 10;
    } else {
      return mouse_x;
    }
  }

  // ### menu_y_pos( click_event )
  // Build a y position for a conext menu from a click event
  // Keeps it inside the page
  // Doesn't handle sub menus!

  static menu_y_pos(ev, $menu) {
    const mouse_y = ev.pageY;
    const page_height = $(window).height();
    const menu_height = $menu.height();

    // opening menu would pass the bottom of the page
    if (mouse_y + menu_height + 20 > page_height && menu_height < mouse_y) {
      return page_height - menu_height - 20;
    } else {
      return mouse_y;
    }
  }
}

window.Helpers = Helpers;
