# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:summary')
{ objhash, _ }    = require 'oa-helpers'

{ SocketIO }      = require '../../lib/socketio'


# Client joining the activities stream

SocketIO.route 'summary::join_room', ( socket, data, client_cb )->
  debug 'JOINED summary room'

  summaryPoller = require('../../lib/mongopollers').MongoSummaryPollers

  # FIXME
  # reused MongoPoller and it requires a hashing method
  # TODO refactor mongopollers to use a base class

  options = { filter: "summary" }
  filter_hash = objhash options
  summaryPoller.fetch_id_and_start filter_hash, options
  # /FIXME

  socket.join 'summary'
  socket.emit 'summary:populate', {}
#  socket.join 'inventory'
#  socket.emit 'inventory::populate', {lop:1}
