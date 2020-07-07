# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:rule')

# npm modules
moment            = require 'moment'

# oa modules
Errors            = require '../../lib/errors'
{ SocketIO }      = require '../../lib/socketio'
config            = require('../../lib/config').get_instance()



# Read all
SocketIO.route 'integrations::read', ( socket, data, socket_cb ) ->
  debug 'got integrations::read', data


# Create
SocketIO.route 'integration::create', ( socket, data, socket_cb ) ->
  debug 'integration::create', data.group, data.rule


# Read
SocketIO.route 'integration::read', ( socket, data, socket_cb ) ->
  debug 'got integration::read', data


# Update
SocketIO.route 'integration::update', ( socket, data, socket_cb ) ->
  logger.info 'Updating integration %j', data, socket.id, socket.ev.user()
  Integrations.updateAsync data
  .then ( response ) ->
    debug 'update response', response
    socket_cb response
    SocketIO.io.emit 'integrations::updated'
  .catch Errors.ValidationError, ( err ) ->
    logger.error 'admin user update failed', data, err.message, err
    socket.ev.error err.message
  .finally ->
    debug 'wtf?'


# Delete
SocketIO.route 'integration::delete', ( socket, data, socket_cb ) ->
  logger.info 'Deleting integration', socket.id, data
  Integrations.deleteAsync data._id
  .then ( response ) ->
    socket.ev.info "Deleted integration #{data._id}"
    socket_cb response
    SocketIO.io.emit 'integrations::updated'
  .catch Errors.ValidationError, ( err ) ->
    logger.error 'admin user delete failed', data, err.message, err
    socket.ev.exception err.name, err.message