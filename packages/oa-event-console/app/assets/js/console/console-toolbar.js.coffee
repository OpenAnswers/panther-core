$ ->
  $('#toolbar-icon-refresh').click ->
    Notification.info "Console Refreshed", "The event console has been refreshed."
    socket.emit 'populate'

  $('#toolbar-icon-settings').click ->
    ConsoleSettings.show()
    true

  $('#toolbar-icon-minimal-mode').click ->
    if $("#nav").is(":visible")
      $("#nav").hide()
      $("#toolbar-icon-minimal-mode").html("<span class='glyphicon glyphicon-save'></span>")
      window.dispatchEvent(new Event('resize'))
    else
      $("#nav").show()
      $("#toolbar-icon-minimal-mode").html("<span class='glyphicon glyphicon-open'></span>");
      window.dispatchEvent(new Event('resize'))
    $(".ui-tooltip").remove()

  $(".toolbar-icon").tooltip({
    tooltipClass: 'ui-tooltip-arrow-top',
    position: {
      my: "center+16px"
      at: "bottom+30px"
    }
  })

