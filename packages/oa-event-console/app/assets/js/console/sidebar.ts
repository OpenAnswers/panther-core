// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_sidebar = debug('oa:event:console:sidebar');

// ----------------------------------------------------------------
// On DOM ready

$(function () {
  $(window).on('resize orientationChange', event => Sidebar.resizeSidebar());
  Sidebar.resizeSidebar();

  socket.emit('info::users_active');
  socket.emit('activities::join_room');

  // Initial population
  socket.on('activities::populate', docs => docs.map(doc => Sidebar.processActivity(doc, false)));

  // On each new event
  socket.on('activity', function (doc) {
    debug_sidebar(doc);
    return Sidebar.processActivity(doc);
  });

  socket.on('info::users', function (users) {
    debug_sidebar(users);
    return Sidebar.processUsers(users);
  });

  $('#sidebar-minimise').on('click', () => Sidebar.hideSidebar());

  $('#toolbar-icon-activity-expand').on('click', () => Sidebar.showSidebar());

  return Sidebar.hideSidebar();
});

// ## Sidebar

const Cls = (window.Sidebar = class Sidebar {
  static initClass() {
    // A store for previous selected id's so we don't "forget"
    // previous selections before highlighting activity
    this.selected_ids = null;

    // ### processActivity

    // Take the feed of activity from the server and turn it into sidebar entries
    // on the client via mustache templates

    this.template_html = $('#template-sidebar-entry').html();
  }

  static hideSidebar() {
    $('#toolbar-icon-activity-expand').show();
    $('#consoleContainer .right').hide();
    return window.dispatchEvent(new Event('resize'));
  }

  static showSidebar() {
    $('#toolbar-icon-activity-expand').hide();
    $('#consoleContainer .right').show();
    return window.dispatchEvent(new Event('resize'));
  }

  // ### handleMouseOvers
  // setup all the mouse over handlers for the sidebar
  static handleMouseOvers() {
    const self = this;
    $('.sidebarEntry').unbind();

    $('.sidebarEntry').on('mouseover', function () {
      const ids = $(this).data('ids');
      debug_sidebar('selected over', self.selected_ids);
      Helpers.w2ui_highlight_records(ids);
      return w2ui['event_grid'].scrollIntoView(ids[0]);
    });

    return $('.sidebarEntry').on('mouseout', function () {
      debug_sidebar('selected out', self.selected_ids);
      return Helpers.w2ui_highlight_remove();
    });
  }

  // ### processUsers
  //
  // render to the sidebar the list of logged in users

  static processUsers(users) {
    let first = true;
    $('#sidebar .users').html('Logged in: ');
    return (() => {
      const result = [];
      for (var pos in users) {
        var user = users[pos];
        var data = {
          user,
          first,
        };

        var html = Mustache.render($('#template-sidebar-user-entry').html(), data);
        $('#sidebar .users').append(html);

        result.push((first = false));
      }
      return result;
    })();
  }

  static processActivity(doc, animate) {
    // We only care about event activity in the sidebar at this stage
    animate ??= true;
    if (doc.category !== 'event') {
      debug_sidebar('not an events activity', doc.category);
      return;
    }

    if (!doc.metadata.ids) {
      console.error('no event ids on activity', doc.metadata);
      return;
    }

    // `data` is passed to the Mustache render
    // It is a slightly different view than the serialised
    // databse document that is fed out

    const data = {
      event: doc.type,
      ids: doc.metadata.ids,
      ids_str: JSON.stringify(doc.metadata.ids),
      username: doc.username,
      time: doc.time,
      metadata: doc.metadata,
      count: doc.metadata.ids.length,
    };

    // Create the relevant template id, the templates
    // deal with most of the differences
    let template_id = `template-sidebar-${doc.type}-event`;
    if (doc.metadata.ids?.length > 1) {
      template_id += 's';
    }

    // Severity requires the severity text to be added
    if (doc.type === 'severity') {
      debug_sidebar('severity type', severity);
      var severity = $.grep(severities, e => e.value === parseInt(doc.metadata.severity));
      data.metadata = { new_severity: severity[0].label };
    }

    // Render the message, then the main template
    data.message = Mustache.render($(`#${template_id}`).html(), data);
    debug_sidebar('rendered message', data.message);
    const entry = $(Mustache.render(this.template_html, data));

    if (animate) {
      entry.hide();
      entry.prependTo('#sidebar .entries').animate({ height: 'toggle', opacity: 'toggle' }, 'fast');
    } else {
      entry.prependTo('#sidebar .entries');
    }

    debug_sidebar($('#sidebar .entries .sidebarEntry').length + ' entries in the sidebar now.');
    const entriesPresent = $('#sidebar .entries .sidebarEntry').length;

    if (entriesPresent > 20) {
      $('#sidebar .entries .sidebarEntry').last().remove();
    }

    $(entry).find('.time').timeago();
    return Sidebar.handleMouseOvers();
  }

  static resizeSidebar() {
    let spaceAboveSidebar;
    const viewportHeight = $(window).height();
    if ($('#nav').is(':visible')) {
      spaceAboveSidebar = $('#nav').outerHeight(true);
    } else {
      spaceAboveSidebar = 0;
    }

    $('#sidebarContainer').height(viewportHeight - spaceAboveSidebar);
    return $('#sidebarContainer').css('margin-top', spaceAboveSidebar);
  }

  static addEntry(user, message, animate) {
    let entry;
    animate ??= true;
    const template = $('#template-sidebar-entry').html();
    const date = new Date().toISOString();
    const data = {
      name: user,
      message,
      time: date,
    };
    debug_sidebar('rendering with data', data);
    return (entry = $(Mustache.render(template, { data })));
  }
});
Cls.initClass();
