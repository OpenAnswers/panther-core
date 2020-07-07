# Setup debug instance for the inventory
debug_inventory = debug 'oa:event:console:inventory'


# ----------------------------------------------------------------
# On DOM ready

$ ->
  InventoryStream.handlePopulate()
  InventoryStream.joinInventoriesRoom()
  $('#inventory-grid').w2grid
    multiSelect: true
    name: 'inventory-grid'
    records: []
    columns: [{ type: "String", field: "node",caption:"Node name", size: '40%', sortable: true}, { field: "last_seen", caption: "Last Seen", size: '60%', sortable: true}]
    style: "border-color: transparent;"
  w2ui['inventory-grid'].resize()
  w2ui['inventory-grid'].on 'contextMenu', (ev)->
    debug_inventory 'right clicked', ev, ev.originalEvent

    # Get the record ids
    context_selection = this.getSelection()
    debug_inventory 'CTX:', context_selection

    # get reference to context menu
    context_menu = $('#inventory-context-menu')

    # draw context menu

    # Establish location of mouse in relation to viewport
    mouseX = ev.originalEvent.pageX
    mouseY = ev.originalEvent.pageY

    menuWidth  = context_menu.width()
    menuHeight = context_menu.height()

    menuX = InventoryHelpers.menu_x_pos ev.originalEvent, context_menu
    menuY = InventoryHelpers.menu_y_pos ev.originalEvent, context_menu

    $window = $(window)

    debug_inventory 'xs and ys',
      mouseX, mouseY,
      menuX, menuY,
      menuWidth, menuHeight,
      $window.width(), $window.height()


    # Position the context menu
    context_menu.show()
    .css
      position: 'absolute'
      top:  menuY
      left: menuX
    .off 'click'
    .on 'click', ( ev_menu_click )->

      # Save the target element
      target = $(ev_menu_click.target)
      debug_inventory 'got context click', ev_menu_click,
        context_selection, target.attr 'action'

      switch target.attr('action')
        when 'delete'
          InventoryHelpers.send_delete context_selection
          .then (delete_result)->
            debug_inventory "DELETED these: ", delete_result
            w2ui['inventory-grid'].remove delete_result...
      $(this).hide()
    
    # close menu on click outside menu
    $(document).click ->
      context_menu.hide()

class @InventoryStream

  @logger = debug 'oa:event:console:inventory-stream'

  @mongo_to_grid = (doc) ->
    doc.recid = doc._id
    delete doc._id
    doc

  @handlePopulate = ->
    socket.on 'inventory::populate', (docs) ->

      return unless _.isArray docs

      docs.forEach (doc) ->
        InventoryStream.mongo_to_grid doc

      w2ui['inventory-grid'].add docs

  @joinInventoriesRoom = ->
    socket.emit 'inventory::join_room'


class InventoryHelpers

  @logger = debug 'oa:event:console:inventory-helpers'

  @socketio_Async: (route, data, options)->
    self = @
    new Promise ( resolve, reject)->

      unless data
        return reject new Error 'Inventory socket requires data to send'

      # construct payload message
      msg = 
        data: data
      
      # send message
      socket.emit route, msg, (err, response)->
        if err
          console.error 'Problem with message [%s]', route, msg, err
          reject ErrorType.from_object( err )

        # resolve with response
        self.logger 'got response to [%s]', route, response
        resolve response

  @send_delete: (rec_ids)->
    @socketio_Async 'inventory::delete', rec_ids
    .then (response_payload)->
      return response_payload.ids


  # ### menu_x_pos( click_event )
  # Build a x position for a conext menu from a click event
  # Keeps it inside the page
  # Doesn't handle sub menus!

  @menu_x_pos: ( ev, $menu ) ->
    mouse_x     = ev.pageX
    page_width  = $(window).width()
    menu_width  = $menu.width()
    
    # opening menu would pass the side of the page
    if mouse_x + menu_width + 10 > page_width and
    menu_width < mouse_x
      page_width - menu_width - 10
    else
      mouse_x


  # ### menu_y_pos( click_event )
  # Build a y position for a conext menu from a click event
  # Keeps it inside the page
  # Doesn't handle sub menus!

  @menu_y_pos: (ev, $menu) ->
    mouse_y = ev.pageY # position on page
    client_y = ev.clientY # position in viewport
    viewport_height = $(window).height()
    menu_height = $menu.height()
    margin_offset = 20

    @logger "InventoryHelper.menu_y_pos [%d] [%d] [%d] - [%d] [%d]", mouse_y, client_y, viewport_height, menu_height, margin_offset

    if client_y + menu_height + margin_offset > viewport_height # below bottom of viewport
      mouse_y - menu_height
    else 
      mouse_y
