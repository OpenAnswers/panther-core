# ----------------------------------------------------------------
# On DOM ready

$ ->
  SummaryStream.joinSummaryRoom()


class @SummaryStream

  @logger = debug 'oa:event:console:summary-stream'

  @joinSummaryRoom = ->
    socket.emit 'summary::join_room'
