//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:events:fixme');

// node modules
const util = require('util');

// npm modules
const Promise = require('bluebird');
if (process.env.NODE_ENV === undefined || process.env.NODE_ENV === 'development') {
  logger.warn('enabling Promise long stack traces - Promise.longStackTraces()');
  Promise.longStackTraces();
}

// OA modules
const { Path } = require('../../lib/path');
const { SocketIO } = require('../../lib/socketio');
const { Mongoose } = require('../../lib/mongoose');
const { Activities } = require('../../lib/activities');
const { User } = require('../model/user');
const { Severity } = require('../model/severity');
const { Filters } = require('../model/filters');
const { _, objhash, throw_error } = require('oa-helpers');
const { server_event } = require('../../lib/eventemitter');

const config = require('../../lib/config').get_instance();

const Errors = require('../../lib/errors');

// ### socketio::connect

server_event.on('oa::events::populate', function (msg) {
  debug('oa::events::populate msg', msg.message);

  const limit = config.app.view_limit;

  find_socket_filter_db(msg.socket)
    .then(function (query) {
      const fields = { notes: 0, history: 0 };

      // Return a new promise... and then
      return Mongoose.alerts.find(query, fields).sort({ state_change: -1 }).limit(limit).toArray();
    })
    .then(function (docs) {
      if (docs.length > 0) {
        debug('emitting', docs.length, docs);
        msg.socket.emit('inserts', { data: docs });
        if (docs.length >= limit) {
          return msg.socket.ev.warn(`Limiting view to newest ${limit} events`);
        }
      } else {
        logger.info('Initial populate query found nada', docs);
        msg.socket.emit('inserts', { data: [] });
        return msg.socket.ev.info('No events matched filter');
      }
    })
    .catch(Errors.QueryError, err => logger.error('No filter. never mind'))
    .catch(Promise.OperationalError, err => logger.error('Unable load filter, because: ', err.message))
    .catch(function (err) {
      throw err;
    });

  return true;
});

// Promise to find a filter for a socket
// This (and things like it) need a home. controllers?
var find_socket_filter_db = socket =>
  new Promise(function (resolve, reject) {
    let filter;
    debug('evs', socket.ev?.id);
    const evs = socket.ev;

    if (!evs) {
      return reject(new Errors.SocketError('No ev property attached to socket'));
    }

    if (!evs.user()) {
      return reject(new Errors.SocketError('No user attached to socket'));
    }

    // If we already have a filter on this socket, no need to find the default
    if ((filter = evs.event_filter_running())) {
      return resolve(filter);
    }

    debug('find_socket_filter running query for default filter');

    return Filters.findOne({ user: evs.user(), default: true })
      .then(function (doc) {
        if (doc == null) {
          logger.error('No default filter found for user [%s] using {}', evs.user());
          return resolve(evs.event_filter({}));
        } else {
          return resolve(evs.event_filter(doc.f));
        }
      })
      .catch(err => reject(err))
      .finally(() => debug('find_socket_filter finally'));
  });

// Set a filter for a socket
// This is a req/response so has a client callback
server_event.on('oa::events::set_filter', function (msg) {
  let id;
  logger.info(msg.socket.id, 'setting the filter to', msg.data.id);
  const evs = msg.socket.ev;

  if (!(id = Mongoose.recid_to_objectid_false(msg.data.id))) {
    msg.socket.ev.warn('Filter id not valid', id);
    return false;
  }

  return Filters.findOne({ user: evs.user(), _id: id })
    .then(function (doc) {
      if (doc == null) {
        evs.warn('No default filter found, using all');
        evs.event_filter({});
        if (msg.cb != null) {
          return msg.cb();
        }
      } else {
        const filter = doc.f === undefined ? {} : doc.f;
        evs.event_filter(filter);
        if (msg.cb != null) {
          return msg.cb();
        }
      }
    })
    .catch(function (err) {
      throw err;
    });
});

server_event.on('oa::events::updates', function (msg) {
  // This is all the updated events from the db (ish, the `state_change` timestamp
  //  acts a bit odd under load when there are processing delays)
  // It needs to be filtered down for each clients filter.
  // This could be done with filter name spaces that clients connect to.
  // Then they can share the room
  // Sift could do the filtering

  // Store the objhash and filter somewhere for reference

  // garbage collect the room as they are used/unused

  logger.info('Sending out doc deltas', msg.docs.length);
  return SocketIO.io.emit('deltas', {
    updates: msg.docs,
    inserts: [],
  });
});

// this might be better as a query poll per filter?
// Then there is no sift and we're not tying up the node process.
// on large updates, mongo would have most stuff in memory already
// and can probably do the filtering a lot faster than js

// for room in rooms
//   for doc in docs
//     room.sift doc

// ### oa::events::deletes
//
// This is the delete event event, normally generated by a client
// sending a socketio delete message
server_event.on('oa::events::deletes', function (msg) {
  debug('oa::events::deletes msg', msg.data);
  if (!SocketIO.socket_check_ids(msg)) {
    return;
  }

  const object_ids = Mongoose.recids_to_objectid(msg.data.ids);

  logger.info(msg.socket.id, msg.socket.ev.user(), 'deleting ids', object_ids.join(', '));

  // Setup a query
  const remove_query = { _id: { $in: object_ids } };

  // Then run it
  // This should move the document into a "deleted" collection
  // Then this can be monitored for deletes and cleared up on a
  // custom TTL
  return Mongoose.alerts
    .remove(remove_query)
    .then(function (remove) {
      logger.info(msg.socket.id, 'deleted ids', remove.result.n);

      msg.socket.emit('message', {
        message: 'deleted ids',
        rows: remove.result.n,
      });

      server_event.emit('oa::events::deleted', {
        ids: msg.data.ids,
        source: 'fixme',
      });

      if (msg.cb) {
        msg.cb(null, remove.result.n);
      }

      return Activities.store_event('delete', msg.socket.ev.user(), { ids: msg.data.ids });
    })
    .catch(function (err) {
      err.message = `Failed to remove ids ${object_ids.join(',')}: ` + err.message;
      logger.error('Deletes failed', err);
      return server_event.emit('error', err);
    });
});

// ### type_to_history_text( type, set_fields )

// We need to log some information for each update type
// All messages for the types are stored here and looked up
// via their name.
// `fields` will be used for any %s string replacements (via urtil.format)

// `type` - the type of message to create
// `set_fields` - the data being set in this operation
// Returns - A formatted message string

const type_to_history_text = function (type, set_fields) {
  const types = {
    acknowledge: {
      message: 'Acknowleged',
    },
    unacknowledge: {
      message: 'Unacknowledged',
    },
    assign: {
      message: 'Assigned to %s',
      fields: ['owner'],
    },
    severity: {
      message: 'Changed severity to %s',
      fields: ['severity'],
    },
    clear: {
      message: 'Cleared event',
    },
  };

  // place for util.format args
  const vars = [];
  if (types[type].fields != null) {
    for (var name of types[type].fields as string[]) {
      vars.push(set_fields[name]);
    }
  }

  return util.format(types[type].message, ...vars);
};

// ###### apply_updates_db( type, ids, set_fields, user )

// Promise to apply DB updates for events

const apply_updates_db = function (type, ids, set_fields, user) {
  user ??= 'system';
  return new Promise(function (resolve, reject) {
    const object_ids = Mongoose.recids_to_objectid(ids);

    const query = { _id: { $in: object_ids } };
    const updates = {
      $set: set_fields,
      $push: {
        history: {
          timestamp: new Date(),
          user,
          message: type_to_history_text(type, set_fields),
        },
      },
    };

    return Mongoose.alerts
      .update(query, updates, { multi: true })
      .then(function (update) {
        debug(type, ids, update.result, type);

        server_event.emit('oa::events::updated', {
          type,
          ids,
          source: 'apply_updates_db',
        });

        return resolve(update.result);
      })
      .catch(function (err) {
        err.message = `Failed to ${type} ids ${object_ids.join(',')}: ` + err.message;
        logger.error('Update failed', type, err, err.stack);
        return reject(err);
      });
  });
};

// ###### apply_updates_db( type, ids, set_fields, socket, socket_cb )

// Promise to apply DB updates from a socket connection
// Includes logging and the client callback from the socket

const apply_socket_updates_db = (type, ids, set_fields, socket, socket_cb) =>
  new Promise((resolve, reject) =>
    apply_updates_db(type, ids, set_fields, socket.ev.user())
      .then(function (result) {
        debug(socket.id, type, ids, result, type);

        logger.info('socket [%s] user [%s] set [%s] on ids [%s]', socket.id, socket.ev.user(), type, ids, '');

        if (socket_cb) {
          socket_cb(null, result.n);
        }

        return resolve(result);
      })
      .catch(Errors.ValidationError, function (err) {
        logger.error('apply_socket_updates_db validation error', err, err.stack);
        return socket.ev.error(err.message);
      })
      .catch(err => reject(err))
  );

// ### oa::events::severity

// This is the severity event, normally generated by a client
// sending a socketio change sev message
server_event.on('oa::events::severity', function (msg) {
  debug('oa::events::severity msg', msg.data);
  if (!SocketIO.socket_check_ids(msg)) {
    return;
  }

  if (msg.data.severity == null) {
    return msg.socket.ev.exception('SocketMsgError', 'No severity on message');
  }

  if (isNaN(Number(msg.data.severity)) || msg.data.severity === '') {
    return msg.socket.ev.exception('SocketMsgError', `Severity is not a number [${msg.data.severity}]`);
  }

  // Setup the queries
  const set_fields = {
    severity: parseInt(msg.data.severity),
    state_change: Date.now(),
  };

  // Now promise through it
  return Severity.findOne({ value: msg.data.severity })
    .then(function (doc) {
      if (doc == null) {
        return msg.socket.ev.exception('QueryError', `No severities found [${msg.data.severity}]`);
      }

      return apply_socket_updates_db('severity', msg.data.ids, set_fields, msg.socket, msg.cb);
    })
    .then(function (update) {
      logger.info(msg.socket.id, 'severitying ids [%j]', update.result, '');

      const metadata = {
        ids: msg.data.ids,
        new_severity: msg.data.severity,
      };

      return Activities.store_event('severity', msg.socket.ev.user(), metadata);
    })
    .catch(function (err) {
      const id_string = msg.data.ids.join(',');
      err.message = `Failed to set severity on ids ${id_string}: ` + err.message;
      logger.error('Severitize failed', err, err.stack);
      return server_event.emit('error', err);
    });
});

// ### oa::event::add_note

// Return the full data for a single alert
// Seperated as we limit the 'view' data down to the required columns

server_event.on('oa::event::add_note', function (msg) {
  let id;
  debug('oa::event::add_note msg', msg.data);

  if (!SocketIO.socket_check_msg(msg) || !SocketIO.socket_check_data(msg)) {
    return false;
  }

  const evs = msg.socket.ev;

  if (!(id = Mongoose.recid_to_objectid_false(msg.data.id))) {
    evs.warn('Invalid event id for note', msg.data.id);
    return false;
  }

  const query = { _id: id };
  const updates = {
    $push: {
      notes: {
        timestamp: new Date(),
        user: evs.user(),
        message: msg.data.message,
      },
    },
  };

  return Mongoose.alerts
    .update(query, updates)
    .then(function (update) {
      debug('oa::event::add_note update', update);
      if (update.modifiedCount != null && update.modifiedCount === 1) {
        debug('oa::event::add_note ', update.modifiedCount, id);
        return msg.cb(null, update.modifiedCount);
      } else {
        return evs.exception('QueryError', `Attempted to add note for [${id}] but it wasn't there`);
      }
    })
    .catch(function (error) {
      evs.error('QueryError', `There was a problem selecting event [${id}]`);
      return server_event.emit('error', error);
    });
});
