// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
$.fn.contextMenu = function (settings) {
  return this.each(function () {
    // Open context menu

    let menu_y_pos;
    $(this).on('contextmenu', function (e) {
      console.log(e);
      //console.log $(ui.selected, e.target)
      //.closest('tr')
      //.first
      // Open menu

      $(settings.menu_selector)
        .data('invoked_on', $(e.target))
        .show()
        .css({
          position: 'absolute',
          left: menu_x_pos(e),
          top: menu_y_pos(e),
        })
        .off('click')
        .on('click', function (e) {
          $(this).hide();
          const $invoked_on = $(this).data('invoked_on');
          const $selected_menu = $(e.target);
          return settings.menu_selected.call(this, $invoked_on, $selected_menu);
        });
      return false;
    });

    // make sure menu closes on any click
    $(document).click(() => $(settings.menu_selector).hide());

    var menu_x_pos = function (e) {
      const mouse_x = e.pageX;
      const page_width = $(window).width();
      const menu_width = $(settings.menu_selector).width();

      // opening menu would pass the side of the page
      if (mouse_x + menu_width > page_width && menu_width < mouse_x) {
        return mouse_x - menu_width;
      } else {
        return mouse_x;
      }
    };

    return (menu_y_pos = function (e) {
      const mouse_y = e.pageY;
      const page_height = $(window).height();
      const menu_height = $(settings.menu_selector).height();

      // opening menu would pass the bottom of the page
      if (mouse_y + menu_height > page_height && menu_height < mouse_y) {
        return mouse_y - menu_height;
      } else {
        return mouse_y;
      }
    });
  });
};

// Add the event

$('#ev td').contextMenu({
  menu_selector: '#console-context-menu',
  menu_selected(invoked_on, selected_menu) {
    console.log(selected_menu);
    console.log(invoked_on);
    const row_id = invoked_on.parent().attr('id');
    const menu_id = selected_menu.parent().attr('id');
    return console.log(`You selected the menu item [${menu_id}]` + ` on the row id [${row_id}]`);
  },
});
