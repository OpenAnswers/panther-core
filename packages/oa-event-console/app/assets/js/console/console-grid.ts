// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Setup debug instance for the grid

const debug_grid = debug('oa:event:console:grid');

// # w2ui grid

// onload
$(function () {
  // Add a date renderer to any date fields
  w2_add_date_render(w2grid_show_columns);

  // Then fill in an HTML-escaping default renderer for every remaining
  // column. w2ui 1.4 performs no cell-value escaping of its own — see
  // w2_escape_cell / w2_add_default_escape_render in console-helpers.ts.
  w2_add_default_escape_render(w2grid_show_columns);

  // The main event grid. Intentionally has no `url:` — all data flows via
  // socket.io. Do NOT add `url:` without also setting `parser: JSON.parse`,
  // because w2ui 1.4's default parser uses `eval()` on the response body.
  $('#event_grid').w2grid({
    name: 'event_grid',
    records: [],
    multiSearch: false,
    markSearch: true,
    reorderColumns: true,
    columns: w2grid_show_columns,
  });

  // Size the grid on the first draw
  w2size();

  // Make sure the grid uses up the available space, no scrolling
  $(window).on('resize', () => w2size());

  // Populate from the filterid if we have it, otherwise just populate
  // Maybe use jQuery BBQ or something that can manage complex routes/data
  // in the hash. group will be the next thing added

  $(window).on('hashchange', () => console_process_hash(window.location.hash));

  // This would be the first page load, so pass in true as the second param
  console_process_hash(window.location.hash, true);

  // ## Context menu

  $(document).mousemove(function (ev) {
    window.cursorX = ev.pageX;
    return (window.cursorY = ev.pageY);
  });

  // Set some sort defaults
  w2ui['event_grid'].oa_config = {};
  w2ui['event_grid'].oa_config.sort_column = 'last_occurrence';
  w2ui['event_grid'].oa_config.sort_direction = 'ASC';

  // Store some information about sorts
  w2ui['event_grid'].on('sort', function (event) {
    console.log('sort event', event);
    w2ui['event_grid'].oa_config.sort_column = event.field || 'last_occurrence';
    return (w2ui['event_grid'].oa_config.sort_direction = event.direction || 'ASC');
  });

  // Context menu actions on right click
  w2ui['event_grid'].on('contextMenu', function (ev) {
    debug_grid('right clicked', ev, ev.originalEvent);

    // Get the recids we are acting on
    const context_selection = this.getSelection();
    debug_grid('selection', context_selection);

    ClipBoard.set_events_copy_text(context_selection);

    // Save the ref to the menu
    const context_menu = $('#console-context-menu');

    if (context_menu.hasClass('open')) {
      return context_menu.removeClass('open');
    }

    // Establish location of mouse in relation to viewport
    const mouseX = ev.originalEvent.pageX;
    const mouseY = ev.originalEvent.pageY;

    const menuWidth = context_menu.width();
    const menuHeight = context_menu.height();

    const menuX = Helpers.menu_x_pos(ev.originalEvent, context_menu);
    const menuY = Helpers.menu_y_pos(ev.originalEvent, context_menu);

    const $window = $(window);

    debug_grid('xs and ys', mouseX, mouseY, menuX, menuY, menuWidth, menuHeight, $window.width(), $window.height());

    const $dropdown_menus = context_menu.find('.dropdown-submenu');

    const menu_plus_gap = mouseX + menuWidth * 2;
    if (mouseX !== menuX || menu_plus_gap > $window.width()) {
      $dropdown_menus.addClass('pull-left');
      debug_grid($dropdown_menus);
    } else {
      $dropdown_menus.removeClass('pull-left');
    }

    // if mouseY != menuY
    //   $dropdown_menus.addClass 'ummm'
    //   debug_grid $dropdown_menus
    // else
    //   $dropdown_menus.removeClass 'ummm'

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
        debug_grid('got context click', ev_menu_click, context_selection, target.attr('action'));

        switch (target.attr('action')) {
          case 'acknowledge':
            send_acknowledge(context_selection);
            break;

          case 'acknowledge-with-note':
            debug_grid('ack with NOTE');
            EventBulkModify.show(context_selection);
            break;

          case 'add-extid':
            debug_grid('add external ID');
            EventBulkExtID.show(context_selection);
            break;

          case 'unacknowledge':
            send_unacknowledge(context_selection);
            break;

          case 'assign':
            var user = target.attr('user');
            debug_grid('context assign user', user);
            send_assign(context_selection, user);
            break;

          case 'clear':
            send_clear(context_selection);
            break;

          case 'delete':
            send_delete(context_selection);
            break;

          case 'severity':
            var severity = target.attr('severity');
            debug_grid('context update severity', severity);
            send_severity(context_selection, severity);
            break;

          case 'copy-summary':
            debug_grid('User is copying summary');
            debug_grid(w2ui['event_grid'].get(context_selection[0]));
            break;

          case 'copy-all':
            debug_grid('User is copying all');
            break;

          case 'create-rule':
            debug_grid('in contextmenu create-rule');
            window.location = `/rules/new#${context_selection}`;
            break;

          case 'notes':
            debug_grid(context_selection);
            ConsoleSocketIO.get_event_detail(ev.recid, 'notes');
            break;

          case 'details':
            debug_grid(context_selection);
            ConsoleSocketIO.get_event_detail(ev.recid, 'details');
            break;
        }

        $(this).find('.dropdown-menu').removeAttr('style');
        return $(this).hide();
      });

    // Now look at all the dropdown submenus
    for (var menu of $('#console-context-menu').find('.dropdown-menu').toArray()) {
      var $menu = $(menu);
      var bottom = $menu.parent().offset().top + $menu.outerHeight(true);
      debug_grid(
        'position dropdown-menu dh->%s dt->%s db->%s wh->%s',
        $menu.outerHeight(true),
        $menu.parent().offset().top,
        bottom,
        $window.height()
      );
      if (bottom > $window.height()) {
        var up = bottom - $window.height() + 6;
        debug_grid('up', up);
        $menu.css({ marginTop: `-=${up}px` });
      } else {
        $menu.removeAttr('style');
      }
    }

    return $(document).click(() => context_menu.hide());
  });

  // ## Keyboard handlers

  // Keys can do the context menu actions too

  //$('#grid_event_grid_body').attr 'tabindex', "1"

  $(document).keydown('#grid_event_grid_body', function (ev) {
    // filter keyboard events from only BODY
    if (ev.target.nodeName !== 'BODY') {
      return;
    }

    const selection = w2ui['event_grid'].getSelection();
    if (selection == null || !(selection.length > 0)) {
      return;
    }
    if (EventDetails.modal) {
      return;
    }
    if (_.isArray(selection && selection.length === 0)) {
      return;
    }
    switch (ev.which) {
      case 67: // c for clear
        if (ev.altKey || ev.metaKey || ev.ctrlKey || ev.shiftKey) {
          break;
        }
        debug_grid('keyboard clear', selection);
        return send_clear(selection);

      case 46:
      case 8: //del, backspace
        debug_grid('keyboard delete', selection);
        return send_delete(selection);

      case 75: // k for ack toggle
        if (ev.altKey || ev.metaKey || ev.ctrlKey || ev.shiftKey) {
          break;
        }
        debug_grid('keyboard ack/unack', selection);
        var acks = [];
        var unacks = [];
        for (var id of selection) {
          var rec = w2ui['event_grid'].get(id);
          if (rec.acknowledged === false) {
            acks.push(id);
          } else if (rec.acknowledged === true) {
            unacks.push(id);
          } else {
            console.error('Acknowledge field is odd', rec);
          }
        }
        if (acks.length > 0) {
          send_acknowledge(acks);
        }
        if (unacks.length > 0) {
          return send_unacknowledge(unacks);
        }
        break;

      case 65: // a for assign
        if (ev.altKey || ev.metaKey || ev.ctrlKey || ev.shiftKey) {
          break;
        }
        return debug_grid('keyboard assign', selection);
      // open assign menu

      case 83: // s for sev
        if (ev.altKey || ev.metaKey || ev.ctrlKey || ev.shiftKey) {
          break;
        }
        return debug_grid('keyboard severity', selection);
      // open severity menu

      case 191: // ? shows help
        debug_grid('help', selection);
        // open assign menu
        return $('#console-help-modal').modal();

      case 13: // enter/return
        debug_grid('keyboard open', selection);
        return ConsoleSocketIO.get_event_detail(selection[0].toString());

      default:
        return debug_grid('other key', ev.which, selection);
    }
  });

  // Select/unselect events need some special styling as
  // w2ui doesn't let us manage it easily with css
  // w2ui['event_grid'].on 'select', (ev)->
  //   debug_grid 'selected event', ev, ev.recid
  //   # compute some style based on sev

  // w2ui['event_grid'].on 'unselect', (ev)->
  //   debug_grid 'unselected event', ev, ev.recid
  //   # reset the selected styles

  // w2ui['event_grid'].on 'refresh', (ev)->
  //   debug_grid 'refresh event', ev, ev.recid
  //   # reset the selected styles

  // w2ui['event_grid'].on 'refreshRow', (ev)->
  //   debug_grid 'refreshRow event', ev, ev.recid
  //   # reset the selected styles

  // w2ui['event_grid'].on 'refreshrow', (ev)->
  //   debug_grid 'refreshrow event', ev, ev.recid
  //   # reset the selected styles

  // w2ui['event_grid'].on 'render', (ev)->
  //   debug_grid 'render event', ev, ev.recid
  //   # reset the selected styles

  // Open the event details modal when double clicking and event
  w2ui['event_grid'].on('dblClick', function (ev) {
    debug_grid('double click, showing event', ev.recid);
    return ConsoleSocketIO.get_event_detail(ev.recid);
  });

  // ### Search Box

  // Make the form search the grid
  const $console_search = $('#console-search-input');
  const $console_search_icon = $('#console-toolbar-search-icon');

  // Watch for changes in the search box
  $console_search.on('change keyup input', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const search_term = $console_search.val();
    debug_grid('searching keypress', ev.which);

    // Performance issues on large result sets
    if (search_term.length < 2) {
      w2ui['event_grid'].searchReset();
      $console_search_icon.removeClass('glyphicon-remove');
      $console_search_icon.addClass('glyphicon-search');
    }

    // Need someway to show the user this is limited to only searching
    // with the enter key/click when the record set is large.
    if (search_term.length >= 2 && (w2ui['event_grid'].total < 400 || ev.which === 13)) {
      debug_grid('searching for ', search_term, w2ui['event_grid'].total);
      w2ui['event_grid'].search('all', search_term);

      $console_search_icon.removeClass('glyphicon-search');
      return $console_search_icon.addClass('glyphicon-remove');
    }
  });

  // ### Search Icon Click

  // Clicking the X icon in search clears the text and forces
  // the event processing as if the user did it
  $console_search_icon.click(function (ev) {
    // Any search terms we have an X
    if ($(ev.target).hasClass('glyphicon-remove')) {
      return $console_search.val('').trigger('change');

      // Some search term we have a search icon to click (or press enter)
    } else if ($(ev.target).hasClass('glyphicon-search')) {
      const search_term = $console_search.val();
      w2ui['event_grid'].search('all', search_term);
      $console_search_icon.removeClass('glyphicon-remove');
      return $console_search_icon.addClass('glyphicon-search');

      // Error
    } else {
      return console.error('Wrong class on search icon');
    }
  });

  // # Refresh the view

  return $('.console-column-checkbox > input[type="checkbox"]').click(function (ev) {
    let column_def, res, resc;
    debug_grid('clicked! for [%s]', ev.target.value, ev);

    debug('all', w2grid_all_columns);

    if (_.find(w2grid_show_columns, { field: ev.target.value })) {
      res = w2ui['event_grid'].toggleColumn(ev.target.value);
    } else if ((column_def = _.find(w2grid_all_columns, { field: ev.target.value }))) {
      if (ev.target.checked) {
        debug_grid('adding column', ev.target.value);
        resc = w2ui['event_grid'].addColumn(column_def);
        //res = w2ui['event_grid'].toggleColumn ev.target.value
      } else {
        debug_grid('removing column', ev.target.value);
        //res = w2ui['event_grid'].toggleColumn ev.target.value
        resc = w2ui['event_grid'].removeColumn(ev.target.value);
      }
    } else {
      Message.error(`Columns shouldn't get here [${column_def}]`);
    }

    return debug_grid('columns res [%s]', res, resc);
  });
});

// Moved to onhashchange event, might not be the most cross browser
// compatible solution (history.js, bjquery bbq, jquery history)

// # # Set a filter from the menu
// $('.filter-link').click (ev)->
//   debug 'clicked .filter-link', ev
//   filter_link = $(this)
//   id    = filter_link.data('filterid')
//   name  = filter_link.data('filtername')
//   set_view id, name

// # # Set a filter from the menu
// $('.group-link').click (ev)->
//   debug 'clicked .group-link', ev
//   group_link = $(this)
//   name  = group_link.data('group')
//   set_group name

//show_keyboard_help
