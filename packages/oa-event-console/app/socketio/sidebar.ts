//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { Activity } = require('../model/activity');
const { SocketIO } = require('../../lib/socketio');

// Client joining the activities stream

SocketIO.route('activities::join_room', function (socket, data, client_cb) {
  socket.join('activities');
  return Activity.find({})
    .sort('-time')
    .limit(15)
    .exec(function (err, activities) {
      activities = activities.reverse();
      return socket.emit('activities::populate', activities);
    });
});

SocketIO.route('info::users_active', (socket, data, client_cb) =>
  socket.emit('info::users', SocketIO.connected_users())
);
