//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:events');

// node modules
const util = require('util');

// npm modules
const Promise = require('bluebird');
const moment = require('moment');

// OA modules
const Errors = require('../../lib/errors');
const { SocketIO } = require('../../lib/socketio');
const { Mongoose } = require('../../lib/mongoose');
const { Activities } = require('../../lib/activities');

const { Severity } = require('../model/severity');
const { EventArchive } = require('../model/event_archive');
const { User } = require('../model/user');
const { Filters } = require('../model/filters');

const { server_event } = require('../../lib/eventemitter');
const { _ } = require('oa-helpers');

const config = require('../../lib/config').get_instance();

//{ promisedFilterSummary} = require '../../lib/queries'
const { promisedFilterSummary } = require('../../lib/queries');

// ###### apply_updates_db( type, ids, set_fields, push_fields, user )

// Promise to apply DB updates for events

const apply_updates_db = function (type, ids, set_fields, push_fields, user) {
  push_fields ??= {};
  user ??= 'system';
  return new Promise(function (resolve, reject) {
    const object_ids = Mongoose.recids_to_objectid(ids);

    const query = { _id: { $in: object_ids } };
    const updates: any = {
      $set: set_fields,
      $push: {
        history: {
          timestamp: new Date(),
          user,
          message: Activities.type_to_history_text(type, set_fields),
        },
      },
    };

    if (push_fields.notes) {
      updates.$push.notes = push_fields.notes;
    }

    debug('UPDATING, ', updates);

    return Mongoose.alerts
      .updateMany(query, updates, { multi: true })
      .then(function (update) {
        debug(type, ids, update, type);

        server_event.emit('oa::events::updated', {
          type,
          ids,
          source: 'apply_updates_db',
        });

        return resolve(update);
      })
      .catch(function (err) {
        err.message = `Failed to ${type} ids ${object_ids.join(',')}: ` + err.message;
        logger.error('Update failed', type, err, err.stack);
        return reject(err);
      });
  });
};

// ###### apply_socket_updates_db( type, ids, set_fields, socket, socket_cb )

// Apply DB updates from a socket connection

const apply_socket_updates_db = function (type, ids, set_fields, push_fields, socket, socket_cb) {
  const evs = socket.ev;
  return new Promise((resolve, reject) =>
    apply_updates_db(type, ids, set_fields, push_fields, evs.user())
      .then(function (result) {
        debug('apply_socket_updates_db', socket.id, type, ids, result, type);

        logger.info('socket [%s] user [%s] set [%s] on ids [%s]', socket.id, evs.user(), type, ids, '');

        // socket.ev.debug "#{type} ids done",
        //   rows: result.n

        if (_.isFunction(socket_cb)) {
          socket_cb(null, result);
        } else {
          debug('Can not callback - nothing supplied');
        }

        const metadata = _.clone(set_fields);
        metadata.ids = ids;
        metadata.new_owner = metadata.owner;

        // Resolve the promise now we are done
        resolve(result);

        return Activities.store_event(type, evs.user(), metadata);
      })
      .catch(Errors.ValidationError, function (err) {
        logger.error('apply_socket_updates_db validation error', err, err.stack);
        return evs.error(err.message);
      })
      .catch(err => reject(err))
  );
};

// ####### copy_events( tag, expire_hours, ids )

// Copy some events to the event archive, adding an expire date

//     copy_events 'something', 8, object_ids

const copy_events_async = (tag, expire_hours, ids) =>
  new Promise(function (resolve, reject) {
    const coll = EventArchive.collection;
    const expire_date = moment().add(expire_hours, 'hours').toDate();

    const batch_copy = coll.initializeUnorderedBulkOp();

    // Struggled to get promisifyAll on the .execute() function
    //batch_ex = Promise.promisify batch_copy.execute { context: batch_copy }

    const query = { _id: { $in: ids } };

    return Mongoose.alerts
      .find(query)
      .toArray()
      .then(function (docs) {
        debug('docs to copy before removal', docs.length);

        for (var doc of docs as any[]) {
          var new_doc = {
            expire: expire_date,
            operation: tag,
            event: doc,
          };
          batch_copy.insert(new_doc);
          logger.info('Copying event [%s] - identifier: [%s]', tag, doc.identifier);
        }

        if (docs.length === 0) {
          return resolve(docs.length);
        }
        return batch_copy.execute();
      })
      .then(function (results) {
        debug('copy_events_async results:', results);
        return resolve(results);
      })
      .catch(err => reject(err));
  });

// Promise to find a filter for a socket
// This (and things like it) need a home. controllers?
const find_filter_from_socket_Async = socket =>
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

// ###### events::severities

// Get the the counter for the severities of all events
// Used in the dashboard for counts and graphs
// This is an expensive query, so should be cached every so often
// and the counts updated (and possibly steamed out) via the incoming
// events to the event_server process

SocketIO.route_return('events::severities', function (socket, data) {
  const groups = config.rules.set.groups.store_order;

  return promisedFilterSummary().then(function (results) {
    // results: {sev_counts: [], sev_counts_group: [], severities: []}
    results.groups = groups;
    logger.debug('sending out sev results', results.sev_counts, results.sev_counts_group);
    socket.emit('events::severities', results);
    return results;
  });
});

// ###### events::clear

// This clears events from the console by setting their severity to 0
// Usually triggered by a user in the context menu or via keypress

SocketIO.route('events::clear', function (socket, data, client_cb) {
  debug('events::clear msg', data.ids);
  const evs = socket.ev;
  const { ids } = data;

  if (ids == null) {
    return socket.ev.exception('SocketMsgError', 'No .ids on message');
  }

  if (!_.isArray(ids)) {
    debug('events::clear - ids not array', ids);
    return socket.ev.exception('SocketMsgError', `The event ids were not an array [${ids}]`);
  }

  if (!(ids.length > 0)) {
    return socket.ev.error('No ids to clear');
  }

  const object_ids = Mongoose.recids_to_objectid(ids);

  // Setup the queries
  const set_fields = {
    severity: 0,
    state_change: new Date(),
  };

  // Now promise through the updates
  return copy_events_async('clear', config.app.archive_time.clear, object_ids)
    .then(function (batch_result) {
      logger.info('copied clear events [%j]: %s', batch_result, ids);

      return apply_socket_updates_db('clear', ids, set_fields, {}, socket, client_cb);
    })
    .then(update => logger.info(socket.id, 'cleared ids [%s] [%j]', ids, update.result))
    .catch(function (err) {
      err.message = `Failed to clear ids [${ids.join(',')}] ` + err.message;
      logger.error('Severitize failed', err, err.stack);
      return server_event.emit('error', err);
    });
});

// ###### events::severity

// This changes the severity of an event

SocketIO.route('events::severity', function (socket, data, client_cb) {
  debug('events::severity msg', data.ids);
  const evs = socket.ev;
  const { ids } = data;

  if (ids == null) {
    return socket.ev.exception('SocketMsgError', 'No ids on message');
  }

  if (!_.isArray(ids)) {
    debug('events::clear - ids not array', ids);
    return socket.ev.exception('SocketMsgError', `The event ids were not an array [${ids}]`);
  }

  if (data.severity == null) {
    throw new Errors.ValidationError('No severity on message payload');
  }

  // check the severity specified is valid
  return Severity.findOne({ value: parseInt(data.severity) })
    .then(function (doc) {
      if (!doc) {
        throw new Errors.QueryError(`Severity value not found [${data.severity}]`);
      }

      const set_fields = {
        severity: parseInt(data.severity),
        state_change: new Date(),
      };

      return apply_socket_updates_db('severity', ids, set_fields, {}, socket, client_cb).then(update =>
        logger.info(socket.id, 'severity ids [%j]', update.result)
      );
    })
    .catch(function (err) {
      const id_str = ids.join(',');
      err.message = `Failed to set the severity for ids ${id_str}: ` + err.message;
      logger.error('Severity failed', err, err.stack);
      if (client_cb) {
        client_cb(err);
      }
      throw err;
    });
});

SocketIO.route_return('events::delete::all', function (socket, data, client_cb) {
  debug('events::delete::all');
  const evs = socket.ev;

  // protect this end point
  if (evs.socket.request.user.group !== 'admin') {
    logger.error('Permision denied delete::all - user is not an admin');
    throw new Errors.RequestError('Permision Denied');
  }

  return Mongoose.alerts
    .deleteMany({})
    .then(function (removed) {
      logger.info('User [%s] deleted all events', evs.user(), removed);

      Activities.store_event('delete-all', evs.user(), { ids: removed.deletedCount });

      server_event.emit('events::deleted::all', {
        rows: removed.deletedCount,
        source: 'socketio/events',
      });

      const response = {
        status: 'ok',
        rows: removed.deletedCount,
      };

      return response;
    })
    .catch(err => logger.error('Deleting all failed ', err));
});

// ###### events::delete

// This deletes events from the console
// Usually triggered by a user in the context menu or via keypress

SocketIO.route('events::delete', function (socket, data, client_cb) {
  debug('events::delete msg', data.ids);
  const evs = socket.ev;
  const { ids } = data;

  if (ids == null) {
    return socket.ev.exception('SocketMsgError', 'No ids on message');
  }

  if (!_.isArray(ids)) {
    debug('events::clear - ids not array', ids);
    return socket.ev.exception('SocketMsgError', `The event ids were not an array [${ids}]`);
  }

  if (!(ids.length > 0)) {
    return socket.ev.error('No ids to deletes');
  }

  const object_ids = Mongoose.recids_to_objectid(ids);
  //copy_events 'delete', 8, object_ids

  // Setup a query
  const remove_query = { _id: { $in: object_ids } };

  // Then run it
  // This should move the document into a "deleted" collection
  // Then this can be monitored for deletes and cleared up on a
  // custom TTL
  return copy_events_async('delete', config.app.archive_time.delete, object_ids)
    .then(function (batch_result) {
      logger.info('copied delete events [%j]: %s', batch_result, ids);

      return Mongoose.alerts.deleteMany(remove_query);
    })
    .then(function (remove) {
      logger.info(socket.id, 'deleted ids', remove.deletedCount);

      socket.emit('message', {
        message: 'deleted ids',
        rows: remove.deletedCount,
      });

      server_event.emit('oa::events::deleted', {
        ids,
        source: 'socketio/events',
      });

      if (client_cb) {
        client_cb(null, remove.deletedCount);
      }

      return Activities.store_event('delete', evs.user(), { ids });
    })
    .catch(function (err) {
      err.message = `Failed to remove ids ${object_ids.join(',')}: ` + err.message;
      logger.error('Deletes failed', err);
      return server_event.emit('error', err);
    });
});

// ack with note

SocketIO.route('events::acknowledge::note', function (socket, data, client_cb) {
  debug('events::acknowledge::note msg', data.ids);
  const evs = socket.ev;
  const { ids } = data;

  if (ids == null) {
    return socket.ev.exception('SocketMsgError', 'No ids on message');
  }

  if (!_.isArray(ids)) {
    debug('events::clear - ids not array', ids);
    return evs.exception('SocketMsgError', `The event ids were not an array [${ids}]`);
  }

  // Setup the queries
  const set_fields: any = {
    acknowledged: true,
    owner: evs.user(),
    state_change: new Date(),
  };

  if (_.isString(data.external_id) && data.external_id !== '') {
    set_fields.external_id = data.external_id;
  }

  let push_fields = {};
  if (_.isString(data.message)) {
    push_fields = {
      notes: {
        timestamp: new Date(),
        user: evs.user(),
        message: data.message,
      },
    };
  }

  // Now promise through the updates
  return apply_socket_updates_db('acknowledge', ids, set_fields, push_fields, socket, client_cb)
    .then(update => logger.info(socket.id, 'acknowledged ids [%j]', update.result))
    .catch(function (err) {
      const id_str = ids.join(',');
      err.message = `Failed to acknowledge the ids ${id_str}: ` + err.message;
      logger.error('Acknowledge failed', err, err.stack);
      if (client_cb) {
        client_cb(err);
      }
      throw err;
    });
});

// ###### events::external_id

SocketIO.route('events::external_id', function (socket, data, client_cb) {
  debug('events::external_id msg', data.ids);
  const evs = socket.ev;
  const { ids } = data;

  if (ids == null) {
    return socket.ev.exception('SocketMsgError', 'No ids on message');
  }

  if (!_.isArray(ids)) {
    debug('events::external_id - ids not array', ids);
    return evs.exception('SocketMsgError', `The event ids were not an array [${ids}]`);
  }

  if (!data.external_id) {
    debug('events::external_id - no external_id in message payload', ids);
    return evs.exception('SocketMsgError', 'The event external_id was not supplied');
  }

  // Setup the queries
  const set_fields = {
    external_id: data.external_id,
    state_change: new Date(),
  };

  // Now promise through the updates
  return apply_socket_updates_db('external_id', ids, set_fields, {}, socket, client_cb)
    .then(update => logger.info(socket.id, 'external_id [%j]', update.result))
    .catch(function (err) {
      const id_str = ids.join(',');
      err.message = `Failed to update the external_id for ids ${id_str}: ` + err.message;
      logger.error('Update external_id failed', err, err.stack);
      if (client_cb) {
        client_cb(err);
      }
      throw err;
    });
});

// ###### events::acknowledge

SocketIO.route('events::acknowledge', function (socket, data, client_cb) {
  debug('events::acknowledge msg', data.ids);
  const evs = socket.ev;
  const { ids } = data;

  if (ids == null) {
    return socket.ev.exception('SocketMsgError', 'No ids on message');
  }

  if (!_.isArray(ids)) {
    debug('events::clear - ids not array', ids);
    return evs.exception('SocketMsgError', `The event ids were not an array [${ids}]`);
  }

  // Setup the queries
  const set_fields = {
    acknowledged: true,
    owner: evs.user(),
    state_change: new Date(),
  };

  // Now promise through the updates
  return apply_socket_updates_db('acknowledge', ids, set_fields, {}, socket, client_cb)
    .then(update => logger.info(socket.id, 'acknowledged ids [%j]', update.result))
    .catch(function (err) {
      const id_str = ids.join(',');
      err.message = `Failed to acknowledge the ids ${id_str}: ` + err.message;
      logger.error('Acknowledge failed', err, err.stack);
      if (client_cb) {
        client_cb(err);
      }
      throw err;
    });
});

// ###### events::unacknowledge

SocketIO.route('events::unacknowledge', function (socket, data, client_cb) {
  debug('events::unacknowledge msg', data.ids);
  const evs = socket.ev;
  const { ids } = data;

  if (ids == null) {
    return socket.ev.exception('SocketMsgError', 'No ids on message');
  }

  if (!_.isArray(ids)) {
    return evs.exception('SocketMsgError', `The event ids were not an array [${ids}]`);
  }

  // Setup the queries
  const set_fields = {
    acknowledged: false,
    owner: evs.user(),
    state_change: new Date(),
  };

  // Now promise through the updates
  return apply_socket_updates_db('unacknowledge', ids, set_fields, {}, socket, client_cb)
    .then(update => logger.info(socket.id, 'unacknowledged ids [%j]', update.result))
    .catch(function (err) {
      const id_str = ids.join(',');
      err.message = `Failed to unacknowledge the ids ${id_str}: ` + err.message;
      logger.error('Unacknowledge failed', err, err.stack);
      if (client_cb) {
        client_cb(err);
      }
      throw err;
    });
});

// ### events::read REPLACE POPULATE

// This is the acknowledge event event, normally generated by a client
// sending a socketio acknoledge message
SocketIO.route_return('events::read', function (socket, msg, client_cb) {
  const limit = config.app.view_limit;

  return find_filter_from_socket_Async(socket)
    .then(function (query) {
      const fields = { notes: 0, history: 0, matches: 0 };

      // Return a new promise... and then
      return Mongoose.alerts.find(query, fields).sort({ state_change: -1 }).limit(limit).toArray();
    })
    .then(function (docs) {
      if (docs.length >= limit) {
        socket.ev.warn(`Limiting view to newest ${limit} events`);
      }

      if (docs.length === 0) {
        logger.info('Initial populate query found nada', docs);
        return socket.ev.info('No events matched filter');
      }

      msg = {
        status: 'success',
        data: docs,
      };
    })
    .catch(Errors.QueryError, err => logger.error('No filter. never mind'))
    .catch(Promise.OperationalError, err => logger.error('Unable load filter, because: ', err.message))
    .catch(function (err) {
      throw err;
    });
});

// ### events::assign

// This is the acknowledge event event, normally generated by a client
// sending a socketio assign message
SocketIO.route_return('events::assign', function (socket, msg, client_cb) {
  //return unless SocketIO.socket_check_ids msg
  if (!msg) {
    throw new Errors.SocketMsgError('No message in socket payload');
  }

  if (!msg.ids) {
    throw new Errors.ValidationError('No ids in message payload');
  }

  if (!msg.user) {
    throw new Errors.ValidationError('No user on message payload');
  }

  logger.info('%s Assigning ids [%s] to [%s]', socket.id, msg.ids, msg.user);

  // Setup the query
  const query = { username: msg.user };

  // Find the user then update the alerts
  return User.findOne(query)
    .then(function (doc) {
      if (doc == null) {
        throw new Errors.ValidationError(`Username does not exist [${msg.user}]`);
      }

      const set_fields = {
        owner: msg.user,
        state_change: new Date(),
      };

      // new promise
      return apply_socket_updates_db('assign', msg.ids, set_fields, {}, socket, msg.cb);
    })
    .then(function (result) {
      if (!result.modifiedCount || !(result.modifiedCount > 0)) {
        throw new Errors.QueryError(`No events modified[${msg.ids}]`);
      }

      return (msg = {
        status: 'success',
        data: {
          owner: msg.user,
          ids: msg.ids,
        },
      });
    })
    .catch(function (err) {
      err.message = `Failed to assign ids ${msg.ids.join(',')}: ` + err.message;
      logger.error('Assign failed', err);
      return server_event.emit('error', err);
    });
});

// ### event::occurrences
// ### @deprecated seems is no longer used

// Return the occurrences data for a single identifier.

server_event.on('event::occurrences', function (socket, data, client_cb) {
  debug('event::occurrences msg', data);
  const evs = socket.ev;

  if (!SocketIO.socket_check_msg(data) || !SocketIO.socket_check_data(data)) {
    return false;
  }

  return Mongoose.alerts
    .findOne({ _id: data.id })
    .then(function (doc) {
      if (!doc) {
        throw new Errors.QueryError(`Occurrence id not found [${data.id}]`);
      }

      return Mongoose.alertoccurences.findOne({ _id: doc.identifier });
    })
    .then(function (doc) {
      if (!doc) {
        throw new Errors.QueryError(`Requested occurrences for identifer [${data.identifier}] but it wasn't there`);
      }

      debug('event::occurrences retrieved', doc, data.identifier);
      if (client_cb) {
        return client_cb(null, doc);
      }
    })
    .catch(Errors.QueryError, function (error) {
      evs.exception(error);
      return client_cb(error);
    })
    .catch(function (error) {
      evs.error('QueryError', `There was a problem selecting event [${data.id}]`);
      throw error;
    });
});

// ### `event::detail`

// Return the full data for a single alert
// Seperated as we limit the 'view' data down to the required columns

SocketIO.route_return('event::details', function (socket, msg, client_cb) {
  //return unless SocketIO.socket_check_ids msg
  let id;
  if (!msg) {
    throw new Errors.SocketMsgError('No message in socket payload');
  }

  if (!msg.id) {
    throw new Errors.ValidationError('No ids in message payload');
  }

  if (!(id = Mongoose.recid_to_objectid_false(msg.id))) {
    throw new Errors.ValidationError('Invalid event id', msg.id);
  }

  return Mongoose.alerts.findOne({ _id: id }).then(function (doc) {
    if (!doc) {
      throw new Errors.QueryError(`Requested id [${id}] wasn't there`);
    }
    debug('events::detail retrieved id [%s]', id, doc);
    return Mongoose.alertoccurrences.findOne({ identifier: doc.identifier }).then(function (occurrence) {
      if (occurrence) {
        doc.occurrences = occurrence.current;
      }
      return doc;
    });
  });
});

// ### `event::raw_stream`

// Client joining the activities stream

SocketIO.route_return('events::join_raw_stream', function (socket, msg, client_cb) {
  socket.join('raw_stream');
  logger.info('[%s] [%s] joined the raw_stream of events', socket.id, socket.ev.user());

  // Setup the mongoose tail and callback
  Mongoose.event_raw_stream((err, data) => SocketIO.io.to('raw_stream').emit('events::raw_stream', data));

  return { message: 'Joined raw_stream' };
});
