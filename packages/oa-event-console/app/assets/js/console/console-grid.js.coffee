
# Setup debug instance for the grid

debug_grid = debug 'oa:event:console:grid'

# # w2ui grid

# onload
$ ->

  # Add a date renderer to any date fields
  w2_add_date_render w2grid_show_columns


  # The main event grid
  $('#event_grid').w2grid
    name:           'event_grid'
    records:        []
    multiSearch:    false
    markSearch:     true
    reorderColumns: true
    columns:        w2grid_show_columns

  # Size the grid on the first draw
  w2size()

  # Make sure the grid uses up the available space, no scrolling
  $(window).on 'resize', ->
    w2size()


  # Populate from the filterid if we have it, otherwise just populate
  # Maybe use jQuery BBQ or something that can manage complex routes/data
  # in the hash. group will be the next thing added

  $(window).on 'hashchange', ->
    console_process_hash window.location.hash

  # This would be the first page load, so pass in true as the second param
  console_process_hash window.location.hash, true

  # ## Context menu

  $(document).mousemove (ev) ->
    window.cursorX = ev.pageX
    window.cursorY = ev.pageY


  # Set some sort defaults
  w2ui['event_grid'].oa_config = {}
  w2ui['event_grid'].oa_config.sort_column = 'last_occurrence'
  w2ui['event_grid'].oa_config.sort_direction = 'ASC'
  
  # Store some information about sorts
  w2ui['event_grid'].on 'sort', (event)->
    console.log 'sort event', event
    w2ui['event_grid'].oa_config.sort_column = event.field or 'last_occurrence'
    w2ui['event_grid'].oa_config.sort_direction = event.direction or 'ASC'


  # Context menu actions on right click
  w2ui['event_grid'].on 'contextMenu', (ev)->
    debug_grid 'right clicked', ev, ev.originalEvent

    # Get the recids we are acting on
    context_selection = this.getSelection()
    debug_grid 'selection', context_selection

    ClipBoard.set_events_copy_text context_selection

    # Save the ref to the menu
    context_menu = $('#console-context-menu')

    if context_menu.hasClass 'open'
      return context_menu.removeClass 'open'

    # Establish location of mouse in relation to viewport
    mouseX = ev.originalEvent.pageX
    mouseY = ev.originalEvent.pageY

    menuWidth  = context_menu.width()
    menuHeight = context_menu.height()

    menuX = Helpers.menu_x_pos ev.originalEvent, context_menu
    menuY = Helpers.menu_y_pos ev.originalEvent, context_menu

    $window = $(window)

    debug_grid 'xs and ys',
      mouseX, mouseY,
      menuX, menuY,
      menuWidth, menuHeight,
      $window.width(), $window.height()

    $dropdown_menus = context_menu.find('.dropdown-submenu')

    menu_plus_gap = mouseX + ( menuWidth * 2 )
    if mouseX != menuX or menu_plus_gap > $window.width()
      $dropdown_menus.addClass 'pull-left'
      debug_grid $dropdown_menus
    else
      $dropdown_menus.removeClass 'pull-left'
    
    # if mouseY != menuY
    #   $dropdown_menus.addClass 'ummm'
    #   debug_grid $dropdown_menus
    # else
    #   $dropdown_menus.removeClass 'ummm'


    context_menu.show()
    .css
      position: 'absolute'
      top:  menuY
      left: menuX
    .off 'click'
    .on 'click', ( ev_menu_click )->

      # Save the target element
      target = $(ev_menu_click.target)
      debug_grid 'got context click', ev_menu_click,
        context_selection, target.attr 'action'

      switch target.attr('action')

        when 'acknowledge'
          send_acknowledge context_selection
        
        when 'acknowledge-with-note'
          debug_grid 'ack with NOTE'
          EventBulkModify.show context_selection

        when 'add-extid'
          debug_grid 'add external ID'
          EventBulkExtID.show context_selection
          
        when 'unacknowledge'
          send_unacknowledge context_selection
        
        when 'assign'
          user = target.attr('user')
          debug_grid 'context assign user', user
          send_assign context_selection, user

        when 'clear'
          send_clear context_selection

        when 'delete'
          send_delete context_selection

        when 'severity'
          severity = target.attr('severity')
          debug_grid 'context update severity', severity
          send_severity context_selection, severity

        when 'copy-summary'
          debug_grid 'User is copying summary'
          debug_grid w2ui['event_grid'].get(context_selection[0])
        
        when 'copy-all'
          debug_grid 'User is copying all'

        when 'create-rule'
          debug_grid 'in contextmenu create-rule'
          window.location = "/rules/new##{context_selection}"

        when 'notes'
          debug_grid context_selection
          ConsoleSocketIO.get_event_detail ev.recid, 'notes'

        when 'details'
          debug_grid context_selection
          ConsoleSocketIO.get_event_detail ev.recid, 'details'

      $(this).find('.dropdown-menu').removeAttr 'style'
      $(this).hide()


    # Now look at all the dropdown submenus
    for menu in $('#console-context-menu').find('.dropdown-menu')
      $menu = $(menu)
      bottom = $menu.parent().offset().top + $menu.outerHeight(true)
      debug_grid 'position dropdown-menu dh->%s dt->%s db->%s wh->%s', $menu.outerHeight(true), $menu.parent().offset().top, bottom, $window.height()
      if bottom > $window.height()
        up = bottom - $window.height() + 6
        debug_grid 'up', up
        $menu.css marginTop: "-=#{up}px"
      else
        $menu.removeAttr 'style'


    $(document).click ->
      context_menu.hide()



  # ## Keyboard handlers

  # Keys can do the context menu actions too

  #$('#grid_event_grid_body').attr 'tabindex', "1"
  
  $(document).keydown '#grid_event_grid_body', ( ev )->

    # filter keyboard events from only BODY
    return unless ev.target.nodeName == "BODY"

    selection = w2ui['event_grid'].getSelection()
    return unless selection? and selection.length > 0
    return if EventDetails.modal
    return if _.isArray selection and selection.length == 0
    switch ev.which

      when 67  # c for clear
        break if ev.altKey or ev.metaKey or ev.ctrlKey or ev.shiftKey
        debug_grid 'keyboard clear', selection
        send_clear selection

      when 46, 8 #del, backspace
        debug_grid 'keyboard delete', selection
        send_delete selection

      when 75 # k for ack toggle
        break if ev.altKey or ev.metaKey or ev.ctrlKey or ev.shiftKey
        debug_grid 'keyboard ack/unack', selection
        acks   = []
        unacks = []
        for id in selection
          rec = w2ui['event_grid'].get id
          if rec.acknowledged is false
            acks.push id
          else if rec.acknowledged is true
            unacks.push id
          else
            console.error 'Acknowledge field is odd', rec
        send_acknowledge acks if acks.length > 0
        send_unacknowledge unacks if unacks.length > 0

      when 65 # a for assign
        break if ev.altKey or ev.metaKey or ev.ctrlKey or ev.shiftKey
        debug_grid 'keyboard assign', selection
        # open assign menu

      when 83 # s for sev
        break if ev.altKey or ev.metaKey or ev.ctrlKey or ev.shiftKey
        debug_grid 'keyboard severity', selection
        # open severity menu

      when 191 # ? shows help
        debug_grid 'help', selection
        # open assign menu
        $('#console-help-modal').modal()

      when 13 # enter/return
        debug_grid 'keyboard open', selection
        ConsoleSocketIO.get_event_detail selection[0].toString()

      else
        debug_grid 'other key', ev.which, selection



  # Select/unselect events need some special styling as
  # w2ui doesn't let us manage it easily with css
  # w2ui['event_grid'].on 'select', (ev)->
  #   debug_grid 'selected event', ev, ev.recid
  #   # compute some style based on sev

  # w2ui['event_grid'].on 'unselect', (ev)->
  #   debug_grid 'unselected event', ev, ev.recid
  #   # reset the selected styles

  # w2ui['event_grid'].on 'refresh', (ev)->
  #   debug_grid 'refresh event', ev, ev.recid
  #   # reset the selected styles

  # w2ui['event_grid'].on 'refreshRow', (ev)->
  #   debug_grid 'refreshRow event', ev, ev.recid
  #   # reset the selected styles

  # w2ui['event_grid'].on 'refreshrow', (ev)->
  #   debug_grid 'refreshrow event', ev, ev.recid
  #   # reset the selected styles

  # w2ui['event_grid'].on 'render', (ev)->
  #   debug_grid 'render event', ev, ev.recid
  #   # reset the selected styles


  # Open the event details modal when double clicking and event
  w2ui['event_grid'].on 'dblClick', (ev)->
    debug_grid 'double click, showing event', ev.recid
    ConsoleSocketIO.get_event_detail ev.recid


  # ### Search Box

  # Make the form search the grid
  $console_search = $("#console-search-input")
  $console_search_icon = $('#console-toolbar-search-icon')

  # Watch for changes in the search box
  $console_search.on 'change keyup input', ( ev )->
    ev.preventDefault()
    ev.stopPropagation()
    search_term = $console_search.val()
    debug_grid 'searching keypress', ev.which

    # Performance issues on large result sets
    if search_term.length < 2
      w2ui['event_grid'].searchReset()
      $console_search_icon.removeClass 'glyphicon-remove'
      $console_search_icon.addClass 'glyphicon-search'

    # Need someway to show the user this is limited to only searching
    # with the enter key/click when the record set is large.
    if search_term.length >= 2 and
       ( w2ui['event_grid'].total < 400 or ev.which is 13 )
      debug_grid 'searching for ', search_term, w2ui['event_grid'].total
      w2ui['event_grid'].search 'all', search_term

      $console_search_icon.removeClass 'glyphicon-search'
      $console_search_icon.addClass 'glyphicon-remove'


  # ### Search Icon Click

  # Clicking the X icon in search clears the text and forces
  # the event processing as if the user did it
  $console_search_icon.click ( ev )->

    # Any search terms we have an X
    if $(ev.target).hasClass('glyphicon-remove')
      $console_search.val('').trigger('change')

    # Some search term we have a search icon to click (or press enter)
    else if $(ev.target).hasClass('glyphicon-search')
      search_term = $console_search.val()
      w2ui['event_grid'].search 'all', search_term
      $console_search_icon.removeClass 'glyphicon-remove'
      $console_search_icon.addClass 'glyphicon-search'

    # Error
    else
      console.error 'Wrong class on search icon'


  # # Refresh the view

  $('.console-column-checkbox > input[type="checkbox"]').click (ev)->
    debug_grid 'clicked! for [%s]', ev.target.value, ev
    
    debug 'all', w2grid_all_columns
    
    if _.find(w2grid_show_columns, field: ev.target.value)
      res = w2ui['event_grid'].toggleColumn ev.target.value
    
    else if column_def = _.find(w2grid_all_columns, field: ev.target.value)
      if ev.target.checked
        debug_grid "adding column", ev.target.value
        resc = w2ui['event_grid'].addColumn column_def
        #res = w2ui['event_grid'].toggleColumn ev.target.value
      else
        debug_grid "removing column", ev.target.value
        #res = w2ui['event_grid'].toggleColumn ev.target.value
        resc = w2ui['event_grid'].removeColumn ev.target.value

    else
      Message.error "Columns shouldn't get here [#{column_def}]"

    debug_grid "columns res [%s]", res, resc

  # Moved to onhashchange event, might not be the most cross browser
  # compatible solution (history.js, bjquery bbq, jquery history)

  # # # Set a filter from the menu
  # $('.filter-link').click (ev)->
  #   debug 'clicked .filter-link', ev
  #   filter_link = $(this)
  #   id    = filter_link.data('filterid')
  #   name  = filter_link.data('filtername')
  #   set_view id, name
      
  # # # Set a filter from the menu
  # $('.group-link').click (ev)->
  #   debug 'clicked .group-link', ev
  #   group_link = $(this)
  #   name  = group_link.data('group')
  #   set_group name


  #show_keyboard_help
