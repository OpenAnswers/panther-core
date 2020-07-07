$.fn.contextMenu = (settings) ->

  return this.each ->
    # Open context menu
    
    $(this).on "contextmenu", (e) ->
      
      console.log e
      #console.log $(ui.selected, e.target)
        #.closest('tr')
        #.first
      # Open menu

      $(settings.menu_selector)
        .data "invoked_on", $(e.target)
        .show()
        .css
          position: "absolute"
          left: menu_x_pos e
          top:  menu_y_pos e
        .off 'click'
        .on 'click', (e) ->
          $(this).hide()
          $invoked_on = $(this).data("invoked_on")
          $selected_menu = $(e.target)
          settings.menu_selected.call( this, $invoked_on, $selected_menu )
      false

    # make sure menu closes on any click
    $(document).click ->
      $(settings.menu_selector).hide()

    menu_x_pos = (e) ->
      mouse_x     = e.pageX
      page_width  = $(window).width()
      menu_width  = $(settings.menu_selector).width()
      
      # opening menu would pass the side of the page
      if mouse_x + menu_width > page_width and
      menu_width < mouse_x
        mouse_x - menu_width
      else
        mouse_x

    menu_y_pos = (e) ->
      mouse_y     = e.pageY
      page_height = $(window).height()
      menu_height = $(settings.menu_selector).height()

      # opening menu would pass the bottom of the page
      if mouse_y + menu_height > page_height and
      menu_height < mouse_y
        mouse_y - menu_height
      else
        mouse_y


# Add the event

$("#ev td").contextMenu
  menu_selector: "#console-context-menu",
  menu_selected: ( invoked_on, selected_menu ) ->
    console.log selected_menu
    console.log invoked_on
    row_id  = invoked_on.parent().attr('id')
    menu_id = selected_menu.parent().attr('id')
    console.log "You selected the menu item [#{menu_id}]" +
                " on the row id [#{row_id}]"
