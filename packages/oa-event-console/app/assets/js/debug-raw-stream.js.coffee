# # ApiKey

# Methods for rendering the admin apikey section
# The class is only really for namespacing methods

debug_raw_stream = debug 'oa:event:console:debug'

# On load
socket.emit 'events::join_raw_stream', ( err, res )->
  if err then Message.error(err)
  Message.info_label 'Joined raw stream', 'You are now recieveing the raw stream of events'

socket.on 'events::raw_stream', ( doc )->
  debug_raw_stream 'raw_stream got doc', doc
  RawStream.process_event doc


$ ->
  socket.emit 'events::join_raw_stream', ( err, res )->
    debug 'initial raw_stream setup'






# ## RawStream Class

class RawStream
  @logger = debug_raw_stream
  @container = $('#debug_raw_stream')

  @process_event: ( doc )->
    @container.append '<div class="raw_event">'+JSON.stringify(doc)+'</div>'
