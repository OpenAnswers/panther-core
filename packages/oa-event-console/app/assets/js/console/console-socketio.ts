// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Setup debug instance for the socketios
const debug_socketio = debug('oa:event:console:socketio');

// ### On Load
$(function () {
  // Setup the console socket message listeners

  socket.on('deletes', deletes => on_deletes(deletes));

  socket.on('inserts', inserts => on_inserts(inserts));

  socket.on('deltas', data => on_deltas(data));

  socket.on('events::ids', data => on_ids(data));

  // Not sure this is needed due to messaging
  socket.on('error', data => Message.error(data.message, data.error));

  return console_process_hash(window.location.hash);
});

// ### ConsoleSocketIO
//
// A namespace for all the socketio related functions

class ConsoleSocketIO {
  // ###### get_event_detail( event_id )
  // This requests the event detail data
  // The callback is executed by the server when the data is ready
  static get_event_detail(id, tab_field, redisplay) {
    tab_field ??= 'default';
    redisplay ??= false;
    debug_socketio('event_detail id', id);
    ClipBoard.set_events_copy_text([id]);
    return socket.emit('event::details', { id }, function (err, data) {
      if (err) {
        debug_socketio(err.message);
        return Message.error('Could not retrieve event details');
      }

      // Don't show the modal again - only 'redisplay' using current details
      if (!redisplay) {
        EventDetails.show(tab_field);
        window.location.hash = `/event/${id}`;
      }

      return ConsoleSocketIO.on_event_details(data);
    });
  }

  // ###### `on_event_details( data )`
  // Process the event_details response into HTML by calling
  // the render method on EventDetails
  static on_event_details(data) {
    return EventDetails.render(data);
  }
}

// ###### `delete_from_grid( ids )`
// Delete an array of ids from the local w2ui grid
const delete_from_grid = function (delete_ids) {
  const del = [];
  const missing = [];

  for (var id of delete_ids) {
    var rec;
    if ((rec = w2ui['event_grid'].get(id))) {
      debug_socketio('deleting rec', rec.recid);
      del.push(id);
    } else {
      missing.push(id);
    }
  }

  w2ui['event_grid'].remove(...(del || []));

  if (missing.length > 0) {
    console.log("Couldn't delete ids that were already gone", missing);
  }

  return del;
};

// ###### `on_deletes( ids )`
// Delete an array of ids from the local w2ui grid
var on_deletes = function (deletes) {
  const time = Date.now();
  debug_socketio('got deletes', deletes.data.join(' '));

  const selected = w2ui['event_grid'].getSelection(true);
  const del = delete_from_grid(deletes.data);

  w2ui['event_grid'].refresh();

  console.log('Deleting [%s] records completed in [%s]ms', del.length, Date.now() - time);
  if (del.length !== deletes.data.length) {
    console.warn("Couldn't delete some records", _.difference(del, deletes.data));
  }

  return w2ui['event_grid'].select(selected);
};

// Ids
// On updates the system will send out the list of ID's that should be in your
// view. This is so a console can pick up deletes that have no event
// and updates that take an event out of your view/filter
var on_ids = function (data) {
  debug_socketio('events::ids data [%j] %j', data, w2ui['event_grid'].records);

  const deletes = [];

  for (var rec of w2ui['event_grid'].records) {
    if (!rec || !rec.recid) {
      continue;
    }
    debug_socketio('rec.recid[%s] ids[%s]', rec.recid, data.ids[rec.recid]);
    if (data.ids[rec.recid] !== 1) {
      deletes.push(rec.recid);
    }
  }

  return w2ui['event_grid'].remove(...(deletes || []));
};

// Insert records
var on_inserts = function (inserts) {
  debug_socketio('inserts since', inserts.since);

  // The refresh will mess with selections
  const ids = w2ui['event_grid'].getSelection();
  w2ui['event_grid'].selectNone();

  // Build the intial record
  inserts.data.forEach(doc => mongo_to_grid(doc));
  //   res = w2ui['event_grid'].add doc

  w2ui['event_grid'].clear();
  const res = w2ui['event_grid'].add(inserts.data);
  debug_socketio('loaded', res);

  // Get current sort column, or default to last_occurrence
  const column = w2ui['event_grid'].oa_config.sort_column;
  const direction = w2ui['event_grid'].oa_config.sort_direction;

  // Put the selection back
  w2ui['event_grid'].select(...(ids || []));

  return debug_socketio('sorted', res);
};
// Setup the update listener now
// We have the inserts done

// Update records
var on_deltas = function (data) {
  let res;
  const to_add = [];
  console.log('Received delta message from server');
  debug_socketio('deltas', data);

  if (data.inserts != null && data.inserts.length > 0) {
    res = w2ui['event_grid'].add(data.inserts);
    debug_socketio('added', res);
  }

  if (data.updates != null && data.updates.length > 0) {
    data.updates.forEach(function (doc) {
      mongo_to_grid(doc);
      debug_socketio('delta doc recieved: ', doc);

      if (doc.recid == null) {
        console.error('Record has no recid', doc);
        return;
      }

      // Update or save to add later
      res = w2ui['event_grid'].set(doc.recid, doc, true);
      if (res) {
        return debug_socketio(`Updated result [${res}]`);
      } else {
        return to_add.push(doc);
      }
    });

    //if doc.severity is 4
    //Message.warn "#{doc.node} event #{doc.summary}"

    //if doc.severity is 5
    //Message.error "#{doc.node} event #{doc.summary}"

    // The refresh will mess with selections
    const ids = w2ui['event_grid'].getSelection();
    w2ui['event_grid'].selectNone();

    // Add the records we saved that weren't updates
    if (to_add.length > 0) {
      const add = w2ui['event_grid'].add(to_add);
      debug_socketio('deleta added [%s] records', add);
    } else {
      const sort = w2ui['event_grid'].localSort();
      const ref = w2ui['event_grid'].refresh();
      debug_socketio('refresh', ref, sort);
    }

    // Put the selection back
    return w2ui['event_grid'].select(...(ids || []));
  }
};

// Change this to onRender add a class based on ack value
const send_acknowledge = function (ids, cb) {
  debug_socketio('acking ids', ids);
  socket.emit('events::acknowledge', { ids }, cb);
  debug_socketio('recs before ack', w2ui['event_grid'].get(ids));
  console.log('Acknowledging event', ids);
  for (var id of ids) {
    var rec = w2ui['event_grid'].get(id);
    //new_class = _.without rec._custom_class, 'unacknowledged'
    //rec._custom_class = _.union new_class, ['acknowledged']
    w2ui['event_grid'].set(id, { acknowledged: true, owner: 'Acknowledging..' });
  }
  //w2ui['event_grid'].select selected...
  return debug_socketio('recs after ack', w2ui['event_grid'].get(ids));
};

const send_acknowledge_with_note = function (ids, message, external_id, cb) {
  debug_socketio('acking ids', ids);
  socket.emit(
    'events::acknowledge::note',
    {
      ids,
      external_id,
      message,
    },
    cb
  );
  debug_socketio('recs before ack', w2ui['event_grid'].get(ids));
  console.log('Acknowledging event', ids);
  for (var id of ids) {
    var rec = w2ui['event_grid'].get(id);
    //new_class = _.without rec._custom_class, 'unacknowledged'
    //rec._custom_class = _.union new_class, ['acknowledged']
    w2ui['event_grid'].set(id, { acknowledged: true, owner: 'Acknowledging..' });
  }
  //w2ui['event_grid'].select selected...
  return debug_socketio('recs after ack', w2ui['event_grid'].get(ids));
};

const send_external_id = function (ids, external_id, cb) {
  debug_socketio('external ids', ids);
  socket.emit(
    'events::external_id',
    {
      ids,
      external_id,
    },
    cb
  );
  debug_socketio('recs before extid', w2ui['event_grid'].get(ids));
  console.log('Updating external ID for ids', ids);
  for (var id of ids) {
    var rec = w2ui['event_grid'].get(id);
    w2ui['event_grid'].set(id, { external_id });
  }
  return debug_socketio('recs after extid', w2ui['event_grid'].get(ids));
};

// Change this to onRender add a class based on ack value
const send_unacknowledge = function (ids, cb) {
  debug_socketio('unacking ids', ids);
  socket.emit('events::unacknowledge', { ids }, cb);
  debug_socketio('recs before unack', w2ui['event_grid'].get(ids));
  console.log('Unacknowledging event', ids);
  for (var id of ids) {
    var rec = w2ui['event_grid'].get(id);
    //new_class = _.without rec._custom_class, 'acknowledged'
    //rec._custom_class = _.union new_class, ['unacknowledged']
    w2ui['event_grid'].set(id, { acknowledged: false });
  }
  //w2ui['event_grid'].refreshRow id
  return debug_socketio('recs after unack', w2ui['event_grid'].get(ids));
};

const send_assign = function (ids, user, cb) {
  debug_socketio('assign ids', ids, user);
  socket.emit(
    'events::assign',
    {
      ids,
      user,
    },
    function (err, data) {
      if (err) {
        return err;
      }
      debug_socketio('locally assigning');
      for (var id of ids) {
        w2ui['event_grid'].set(id, { owner: user }, true);
      }
      w2ui['event_grid'].refresh();
      if (_.isFunction(cb)) {
        return cb(err, data);
      }
    }
  );

  return debug_socketio('locally assigned', ids);
};

// Send the delete message, locally deleting on response
const send_delete = function (ids, cb) {
  debug_socketio('delete ids', ids);
  return socket.emit('events::delete', { ids }, function (err, res) {
    if (err) {
      return Message.error(err);
    }
    debug_socketio('locally deleting');
    w2ui['event_grid'].remove(...(ids || []));
    w2ui['event_grid'].selectNone();

    debug_socketio('locally deleted', ...ids);
    if (cb) {
      return cb();
    }
  });
};

// Send the clear message, locally clearing on response
const send_clear = function (ids, cb) {
  debug_socketio('clearing ids', ids);
  return socket.emit('events::clear', { ids }, function (err, res) {
    if (err) {
      return Message.error(err);
    }

    w2ui['event_grid'].selectNone();

    for (var id of ids) {
      var rec = w2ui['event_grid'].get(id);
      w2ui['event_grid'].set(id, { severity: 0 });
    }

    debug_socketio('recs after clear', w2ui['event_grid'].get(ids));
    if (cb) {
      return cb();
    }
  });
};

const send_action = function (ids, type) {
  debug_socketio('action ids', ids);
  return socket.emit('action', {
    type,
    ids,
  });
};

const send_severity = function (ids, severity_value, cb) {
  debug_socketio('severity ids', ids, severity_value);
  socket.emit(
    'events::severity',
    {
      severity: parseInt(severity_value),
      ids,
    },
    cb
  );

  for (var id of ids) {
    var rec = w2ui['event_grid'].get(id);
    w2ui['event_grid'].set(id, { severity: severity_value });
  }

  return debug_socketio('recs after sev', w2ui['event_grid'].get(ids));
};

// ###### set_view( view_id, client_callback )
// Set a view on the server and client
const set_view = (id, name) =>
  socket.emit('console::set_view', { id }, function (err) {
    if (err) {
      return Message.error(err);
    }
    $('.dropdown-menu').stop(true, true).fadeOut(100);
    w2ui['event_grid'].clear();
    socket.emit('populate');
    return $('.console-view-name').html(name);
  });
// Once we've set a filter. repopulate the grid records

// ###### set_group( group_name, client_callback )
// Set a group on the server and client (modifies filter)
const set_group = name =>
  socket.emit('console::set_group', { group: name }, function (err) {
    if (err) {
      return Message.error(err);
    }
    $('.dropdown-menu').stop(true, true).fadeOut(100);
    w2ui['event_grid'].clear();
    socket.emit('populate');
    return $('.console-group-name').html(name);
  });
// Once we've set a group. repopulate the grid records

// ###### set_severity( severity_label, client_callback )
// Set a group on the server and client (modifies filter)
const set_severity = label =>
  socket.emit('console::set_severity', { severity: label }, function (err) {
    let colour;
    if (err) {
      return Message.error(err);
    }
    $('.dropdown-menu').stop(true, true).fadeOut(100);
    w2ui['event_grid'].clear();
    socket.emit('populate');

    switch (label.toLowerCase()) {
      case 'indeterminate':
        colour = 'purple';
        break;
      case 'warning':
        colour = 'blue';
        break;
      case 'minor':
        colour = 'yellow';
        break;
      case 'major':
        colour = 'orange';
        break;
      case 'critical':
        colour = 'red';
        break;
      default:
        colour = 'white';
    }

    const newHtml = `\
<span class="colour-severity-dropdown colour-${colour}"></span>
<span style="float: left">${label}</span>\
`;

    return $('.console-severity-name').html(newHtml);
  });
// Once we've set a group. repopulate the grid records

// ###### set_group_and_view( group_name, view_id, view_name )
// Set both the group then the view, populating at the end
const set_group_and_view = (group_name, filter_id, filter_name) =>
  socket.emit('console::set_group', { group: name }, function (err) {
    if (err) {
      return Message.error(err);
    }
    $('.console-view-name').html(filter_name);

    return socket.emit('console::set_view', { id: filter_id }, function (err) {
      if (err) {
        return Message.error(err);
      }
      w2ui['event_grid'].clear();
      socket.emit('populate');
      return $('.console-group-name').html;
    });
  });

// ###### set_group_and_severity( group_name, view_id, view_name )
// Set both the group then severity, populating at the end
const set_group_and_severity = (group_name, severity) =>
  socket.emit('console::set_group', { group: name }, function (err) {
    if (err) {
      return Message.error(err);
    }
    $('.console-view-name').html(filter_name);

    socket.emit('console::set_severity', { severity }, function (err) {});
    return Message.error(
      err(
        (() => {
          if (err) {
            $('.dropdown-menu').stop(true, true).fadeOut(100);
            w2ui['event_grid'].clear();
            socket.emit('populate');
            return $('.console-severity-name').html(label);
          }
        })()
      )
    );
  });
// Once we've set a group. repopulate the grid records

window.ConsoleSocketIO = ConsoleSocketIO;
