// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Setup debug instance for the inventory
const debug_inventory = debug('oa:event:console:inventory');

// Local copies of the w2ui escape helpers from console/console-helpers.ts.
// The dashboard page does not load the console bundle, so those module-scoped
// consts aren't reachable here. w2ui 1.4 does no cell escaping, so every
// column whose value comes from user data needs a render that escapes.
const w2_escape_cell = function (value) {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
const w2_add_default_escape_render = function (columns) {
  for (var col of columns) {
    if (col.render) {
      continue;
    }
    (function (fieldname) {
      col.render = function (record) {
        return w2_escape_cell(record[fieldname]);
      };
    })(col.field);
  }
};

// ----------------------------------------------------------------

const Cls = (window.InventoryStream = class InventoryStream {
  static initClass() {
    this.logger = debug('oa:event:console:inventory-stream');
  }

  static mongo_to_grid(doc) {
    doc.recid = doc._id;
    delete doc._id;
    return doc;
  }

  static handlePopulate() {
    return socket.on('inventory::populate', function (docs) {
      if (!_.isArray(docs)) {
        return;
      }

      docs.forEach(doc => InventoryStream.mongo_to_grid(doc));

      return w2ui['inventory-grid'].add(docs);
    });
  }

  static joinInventoriesRoom() {
    return socket.emit('inventory::join_room');
  }
});
Cls.initClass();

class InventoryHelpers {
  static initClass() {
    this.logger = debug('oa:event:console:inventory-helpers');
  }

  static socketio_Async(route, data, options) {
    const self = this;
    return new Promise(function (resolve, reject) {
      if (!data) {
        return reject(new Error('Inventory socket requires data to send'));
      }

      // construct payload message
      const msg = { data };

      // send message
      return socket.emit(route, msg, function (err, response) {
        if (err) {
          console.error('Problem with message [%s]', route, msg, err);
          reject(ErrorType.from_object(err));
        }

        // resolve with response
        self.logger('got response to [%s]', route, response);
        return resolve(response);
      });
    });
  }

  static send_delete(rec_ids) {
    return this.socketio_Async('inventory::delete', rec_ids).then(response_payload => response_payload.ids);
  }

  // ### menu_x_pos( click_event )
  // Build a x position for a conext menu from a click event
  // Keeps it inside the page
  // Doesn't handle sub menus!

  static menu_x_pos(ev, $menu) {
    const mouse_x = ev.pageX;
    const page_width = $(window).width();
    const menu_width = $menu.width();

    // opening menu would pass the side of the page
    if (mouse_x + menu_width + 10 > page_width && menu_width < mouse_x) {
      return page_width - menu_width - 10;
    } else {
      return mouse_x;
    }
  }

  // ### menu_y_pos( click_event )
  // Build a y position for a conext menu from a click event
  // Keeps it inside the page
  // Doesn't handle sub menus!

  static menu_y_pos(ev, $menu) {
    const mouse_y = ev.pageY; // position on page
    const client_y = ev.clientY; // position in viewport
    const viewport_height = $(window).height();
    const menu_height = $menu.height();
    const margin_offset = 20;

    this.logger(
      'InventoryHelper.menu_y_pos [%d] [%d] [%d] - [%d] [%d]',
      mouse_y,
      client_y,
      viewport_height,
      menu_height,
      margin_offset
    );

    if (client_y + menu_height + margin_offset > viewport_height) {
      // below bottom of viewport
      return mouse_y - menu_height;
    } else {
      return mouse_y;
    }
  }
}
InventoryHelpers.initClass();

window.InventoryHelpers = InventoryHelpers;

// On DOM ready — must be after class definitions because module scripts
// are deferred, so $(function(){}) fires immediately.
$(function () {
  InventoryStream.handlePopulate();
  InventoryStream.joinInventoriesRoom();
  // No `url:` — records arrive via socket.io. Each column gets an
  // escaping render because w2ui 1.4 does no cell-value escaping.
  const inventory_columns = [
    { type: 'String', field: 'node', caption: 'Node name', size: '40%', sortable: true },
    { field: 'last_seen', caption: 'Last Seen', size: '60%', sortable: true },
  ];
  w2_add_default_escape_render(inventory_columns);
  $('#inventory-grid').w2grid({
    multiSelect: true,
    name: 'inventory-grid',
    records: [],
    columns: inventory_columns,
    style: 'border-color: transparent;',
  });
  w2ui['inventory-grid'].resize();
  return w2ui['inventory-grid'].on('contextMenu', function (ev) {
    debug_inventory('right clicked', ev, ev.originalEvent);

    // Get the record ids
    const context_selection = this.getSelection();
    debug_inventory('CTX:', context_selection);

    // get reference to context menu
    const context_menu = $('#inventory-context-menu');

    // draw context menu

    // Establish location of mouse in relation to viewport
    const mouseX = ev.originalEvent.pageX;
    const mouseY = ev.originalEvent.pageY;

    const menuWidth = context_menu.width();
    const menuHeight = context_menu.height();

    const menuX = InventoryHelpers.menu_x_pos(ev.originalEvent, context_menu);
    const menuY = InventoryHelpers.menu_y_pos(ev.originalEvent, context_menu);

    const $window = $(window);

    debug_inventory(
      'xs and ys',
      mouseX,
      mouseY,
      menuX,
      menuY,
      menuWidth,
      menuHeight,
      $window.width(),
      $window.height()
    );

    // Position the context menu
    context_menu
      .show()
      .css({
        position: 'absolute',
        top: menuY,
        left: menuX,
      })
      .off('click')
      .on('click', function (ev_menu_click) {
        // Save the target element
        const target = $(ev_menu_click.target);
        debug_inventory('got context click', ev_menu_click, context_selection, target.attr('action'));

        switch (target.attr('action')) {
          case 'delete':
            InventoryHelpers.send_delete(context_selection).then(function (delete_result) {
              debug_inventory('DELETED these: ', delete_result);
              return w2ui['inventory-grid'].remove(...(delete_result || []));
            });
            break;
        }
        return $(this).hide();
      });

    // close menu on click outside menu
    return $(document).click(() => context_menu.hide());
  });
});
