
debug_sidebar = debug 'oa:event:console:sidebar'

# ----------------------------------------------------------------
# On DOM ready

$ ->

  $(window).on 'resize orientationChange', (event) ->
    Sidebar.resizeSidebar()
  Sidebar.resizeSidebar()

  socket.emit 'info::users_active'
  socket.emit 'activities::join_room'

  # Initial population
  socket.on 'activities::populate', (docs) ->
    for doc in docs
      Sidebar.processActivity doc, false

  # On each new event
  socket.on 'activity', (doc) ->
    debug_sidebar doc
    Sidebar.processActivity doc

  socket.on 'info::users', (users)->
    debug_sidebar users
    Sidebar.processUsers users

  $("#sidebar-minimise").on 'click', ->
    Sidebar.hideSidebar()
    
  $("#toolbar-icon-activity-expand").on 'click', ->
    Sidebar.showSidebar()

  Sidebar.hideSidebar()
    
# ## Sidebar

class @Sidebar

  # A store for previous selected id's so we don't "forget"
  # previous selections before highlighting activity
  @selected_ids: null

  @hideSidebar = ->
    $("#toolbar-icon-activity-expand").show()
    $("#consoleContainer .right").hide()
    window.dispatchEvent(new Event('resize'))

  @showSidebar = ->
    $("#toolbar-icon-activity-expand").hide()
    $("#consoleContainer .right").show()
    window.dispatchEvent(new Event('resize'))


  # ### handleMouseOvers
  # setup all the mouse over handlers for the sidebar
  @handleMouseOvers: ->
    self = @
    $(".sidebarEntry").unbind()
    
    $(".sidebarEntry").on 'mouseover', ->
      ids = $(@).data('ids')
      debug_sidebar 'selected over', self.selected_ids
      Helpers.w2ui_highlight_records ids
      w2ui['event_grid'].scrollIntoView( ids[0] )

    $(".sidebarEntry").on 'mouseout', ->
      debug_sidebar 'selected out', self.selected_ids
      Helpers.w2ui_highlight_remove()


  # ### processUsers
  #
  # render to the sidebar the list of logged in users

  @processUsers: (users)->
    first = true
    $("#sidebar .users").html("Logged in: ")
    for pos, user of users
      data =
        user: user
        first: first

      html = Mustache.render $("#template-sidebar-user-entry").html(), data
      $("#sidebar .users").append(html)

      first = false

  # ### processActivity

  # Take the feed of activity from the server and turn it into sidebar entries
  # on the client via mustache templates

  @template_html: $("#template-sidebar-entry").html()

  @processActivity: ( doc, animate = true )->

    # We only care about event activity in the sidebar at this stage
    unless doc.category is 'event'
      debug_sidebar 'not an events activity', doc.category
      return

    unless doc.metadata.ids
      console.error 'no event ids on activity', doc.metadata
      return

    # `data` is passed to the Mustache render
    # It is a slightly different view than the serialised
    # databse document that is fed out

    data =
      event:    doc.type
      ids:      doc.metadata.ids
      ids_str:  JSON.stringify(doc.metadata.ids)
      username: doc.username
      time:     doc.time
      metadata: doc.metadata
      count:    doc.metadata.ids.length

    # Create the relevant template id, the templates
    # deal with most of the differences
    template_id = "template-sidebar-#{doc.type}-event"
    if doc.metadata.ids?.length > 1
      template_id += 's'

    # Severity requires the severity text to be added
    if doc.type is "severity"
      debug_sidebar 'severity type', severity
      severity = $.grep severities, (e) ->
        return e.value == parseInt(doc.metadata.severity)
      data.metadata =
        new_severity: severity[0].label

    # Render the message, then the main template
    data.message = Mustache.render $("##{template_id}").html(), data
    debug_sidebar 'rendered message', data.message
    entry = $(Mustache.render @template_html, data)

    if animate
      entry.hide()
      entry.prependTo("#sidebar .entries").animate({"height": "toggle", "opacity": "toggle"}, "fast")
    else
      entry.prependTo("#sidebar .entries")

    debug_sidebar $("#sidebar .entries .sidebarEntry").length + " entries in the sidebar now."
    entriesPresent = $("#sidebar .entries .sidebarEntry").length

    if entriesPresent > 20
      $("#sidebar .entries .sidebarEntry").last().remove()

    $(entry).find(".time").timeago()
    Sidebar.handleMouseOvers()


  @resizeSidebar = ->
    viewportHeight    = $(window).height()
    if $("#nav").is(":visible")
      spaceAboveSidebar = $("#nav").outerHeight(true)
    else
      spaceAboveSidebar = 0

    $("#sidebarContainer").height(viewportHeight - spaceAboveSidebar)
    $("#sidebarContainer").css("margin-top", spaceAboveSidebar)


  @addEntry = (user, message, animate = true) ->
    template = $("#template-sidebar-entry").html()
    date = new Date().toISOString()
    data =
      name: user
      message: message
      time: date
    debug_sidebar 'rendering with data', data
    entry = $(Mustache.render template, data: data)
    




    

