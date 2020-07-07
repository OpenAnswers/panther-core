# ----------------------------------------------------------------
# On DOM ready

$ ->
  ActivityStream.handlePopulate()
  ActivityStream.handleNewActivity()
  ActivityStream.joinActivitiesRoom()


class @ActivityStream

  @logger = debug 'oa:event:console:activity-stream'

  @handlePopulate = ->
    socket.on 'activities::populate', (docs) ->
      docs = docs.reverse()
      docs = docs.slice(0, 4)
      for doc in docs.reverse()
        ActivityStream.processActivity doc, false

  @handleNewActivity = ->
    socket.on 'activity', (doc) ->
      ActivityStream.processActivity doc

  @joinActivitiesRoom = ->
    socket.emit 'activities::join_room'

  @html_user = ( username )->
    "<a href='#'>#{username}</a>"

  @processActivity = ( doc, animate = true )->
    @logger 'activity doc', doc
    data = {}
    data.time = doc.time
    data.message = "No message"
    user = @html_user(doc.username)
    

    if doc.category is 'event'
      count = doc.metadata.ids.length

      switch doc.type

        when "acknowledge"
          if count == 1
            data.message =  "#{user} acknowledged <a href='/console#/event/#{doc.metadata}'>an event.</a>"
          else
            data.message = "#{user} acknowledged #{count} events."

        when "unacknowledge"
          if count == 1
            data.message = "#{user} unacknowledged <a href='/console#/event/#{doc.metadata}'>an event.</a>"
          else
            data.message = "#{user} unacknowledged #{count} events."
        
        when "assign"
          if count == 1
            data.message = "#{user} assigned <a href='/console#/event/#{doc.metadata.ids}'>an event</a> to <a href='#'>#{doc.metadata.new_owner}.</a>"
          else
            data.message = "#{user} assigned #{count} events to <a href='#'>#{doc.metadata.new_owner}.</a>"
        
        when "severity"
          if count == 1
            data.message = "#{user} changed <a href='/console#/event/#{doc.metadata.ids}'>an event's</a> severity."
          else
            data.message = "#{user} changed #{count} events' severities."

        when "clear"
          if count == 1
            data.message = "#{user} cleared <a href='/console#/event/#{doc.metadata.ids}'>an event.</a>"
          else
            data.message = "#{user} cleared #{count} events."

        when "delete"
          if count == 1
            data.message =  "#{user} deleted <a href='/console#/event/#{doc.metadata}'>an event.</a>"
          else
            data.message = "#{user} deleted #{count} events."
        
        when "delete-all"
          data.message = "#{user} deleted all events"

    else
      #message_fmt = doc.message
      data.message = if doc.message
        doc.message.html or doc.message.text
      else
        'nope'

    entry = $(Mustache.render $("#template-activity-stream-entry").html(), data: data)
    entriesPresent = $(".activity-widget .entry").length
    if entriesPresent == 4
      $(".activity-widget .entry").last().remove()

    if animate
      entry.hide()
      entry.prependTo(".activity-widget").animate({"height": "toggle", "opacity": "toggle"}, "slow")
    else
      entry.prependTo(".activity-widget")

    $(entry).find(".details").timeago()







