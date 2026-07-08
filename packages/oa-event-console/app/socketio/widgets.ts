//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { SocketIO } = require('../../lib/socketio');
const { Mongoose } = require('../../lib/mongoose');

// Client joining the activities stream

SocketIO.route('inventory::join_room', function (socket, data, client_cb) {
  socket.join('inventory');

  return Mongoose.inventory
    .find({}, { node: 1, _id: -1 })
    .sort({ last_seen: -1 })
    .toArray()
    .then(inventory => socket.emit('inventory::populate', inventory));
});
