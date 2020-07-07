{ NewsRequest }  = require '../controller/news'
{ SocketIO }      = require '../../lib/socketio'


# Client joining the activities stream

SocketIO.route_return 'news::read', ( socket, data )->
  NewsRequest.fetch_news()
  .then ( result )->
    data: result
