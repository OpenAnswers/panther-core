# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

{ Activity }      = require '../model/activity'
{ SocketIO }      = require '../../lib/socketio'


# Client joining the activities stream

SocketIO.route 'activities::join_room', ( socket, data, client_cb )->
  socket.join 'activities'
  Activity.find({}).sort('-time').limit(15).exec (err, activities) ->
    activities = activities.reverse()
    socket.emit 'activities::populate', activities

SocketIO.route 'info::users_active', ( socket, data, client_cb ) ->
  socket.emit 'info::users', SocketIO.connected_users()