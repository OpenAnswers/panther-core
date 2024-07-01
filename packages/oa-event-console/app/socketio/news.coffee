# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

{ NewsRequest }  = require '../controller/news'
{ SocketIO }      = require '../../lib/socketio'


# Client joining the activities stream

SocketIO.route_return 'news::read', ( socket, data )->
  NewsRequest.fetch_news()
  .then ( result )->
    data: result
