
# logging modules
{logger, debug} = require('oa-logging')('oa:event:console:zmq')

# oa modules
{Config}        = require './config'


# # ### Zmq events

class Zmq
  @zmq = require 'zmq'
  @sock = @zmq.socket 'push'
  @sock.bindSync Config.zmq.uri
  
  @poll_mongo: () ->
    @ock.send 'db'



module.exports =
  Zmq: Zmq