# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

{ SocketIO }      = require '../../lib/socketio'
{ Mongoose }      = require '../../lib/mongoose'

# Client joining the activities stream

SocketIO.route 'inventory::join_room', ( socket, data, client_cb )->
  socket.join 'inventory'

  Mongoose.inventory.find({}, null, {sort: {last_seen: -1}}).toArrayAsync()
  .then (inventory) ->
    socket.emit 'inventory::populate', inventory
