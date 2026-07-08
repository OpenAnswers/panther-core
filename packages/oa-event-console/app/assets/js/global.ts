// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Global JS

const debug_global = debug('oa:event:console:globals');

// ## Socketio Handling
// Must be before $(function(){...}) because module scripts are deferred,
// so jQuery fires ready callbacks immediately (DOM is already parsed).
console.log('Connecting socket.io to %s', window.location.origin);
var socket = io(`${window.location.origin}`, {
  //  transports: ['websocket', 'polling', 'flashsocket'] #[ 'websocket', 'polling-xhr', 'polling', 'polling-jsonp', 'polling' ]
  reconnectionDelay: 200,
  reconnectionDelayMax: 30000,
});
// Expose globally so page-specific bundles (dashboard, console, etc.) can use it
window.socket = socket;

// ### Global setup

$(function () {
  socket.on('logout', function (payload) {
    debug_global('You have been logged out');
    return (window.location.href = '/logout');
  });

  socket.on('ping', payload => socket.emit('pong', {}));

  socket.on('message', function (payload) {
    debug_global('got a message %j', payload);

    // Handle errors a bit more abruptly
    if (payload.error != null) {
      return Message.exception(`${payload.error}: ${payload.message}`);

      // Otherwise, just do what we are told
    } else if (payload.type != null) {
      //error warn info success
      const msg = `${payload.message}`;
      const auto_hide = payload.timeout != null ? true : false;
      const timeout = payload.timeout != null ? payload.timeout * 1000 : 30000;
      const className = payload.type != null ? payload.type : 'info';
      return Message.notify(payload.type, msg, payload.data);
    }
  });

  // Scrolley anchors
  // doc_root = $('html, body')

  // $('.container a').click ->
  //   doc_root.animate
  //     scrollTop: $( $.attr(this, 'href') ).offset().top
  //   , 300
  //   false

  // nav mouseover dropdowns
  $('ul.nav li.dropdown').hover(
    function () {
      $(this).addClass('open');
    },
    function () {
      $(this).removeClass('open');
    }
  );

  // dropdown-persistant
  // A bootstrp dropdown that doesn't close when clicked in

  $('.dropdown.dropdown-persistant ul.dropdown-menu').on('click', ev => ev.stopPropagation());

  // $('.dropdown.dropdown-persistant').on

  //   "shown.bs.dropdown": ()->
  //     @closable = false

  //   "click": ( ev )->
  //     if $(ev.target).hasClass 'btn'
  //       @closable = true
  //     else
  //       @closable = false

  //   "hide.bs.dropdown": ()->
  //     return @closable

  return $('#console-support').on('click', function (ev) {
    ev.preventDefault();
    $('#console-support-modal').modal();
    return false;
  });
});

// Not sure this is needed due to messaging
socket.on('connect', function () {
  $('.nav-connectionstatus-label').removeClass('label-danger').addClass('label-success').delay(2000).removeClass('in');

  // $('.console-toolbar-connectionstatus-icon')
  //   .removeClass 'glyphicon-ban-circle'
  //   .addClass 'glyphicon-ok-circle'
  $('.nav-connectionstatus-text').html(' ');
  $('.nav-connectionstatus-text').slideUp('slow');

  return Message.log('info', 'Connected to the Panther feed');
});

// Not sure this is needed due to messaging
socket.on('disconnect', function (data) {
  $('.nav-connectionstatus-label').addClass('label-danger in').removeClass('label-success hide');
  $('.nav-connectionstatus-text').slideDown('slow');
  $('.nav-connectionstatus-text').html('Disconnected');
  return Message.error('You have lost your connection to the Panther feed');
});

// Not sure this is needed due to messaging
socket.on('reconnect_attempt', function (data) {
  $('.nav-connectionstatus-label').addClass('label-danger in').removeClass('label-success hide');
  // $('.nav-connectionstatus-icon')
  //   .removeClass 'glyphicon-ok-circle'
  //   .addClass 'glyphicon-ban-circle'
  $('.nav-connectionstatus-text').html(`Reconnecting (${data})`);
  return Message.log('info', `Reconnect attempt [${data}]`);
});

// Not sure this is needed due to messaging
socket.on('reconnect_failed', function (data) {
  $('.nav-connectionstatus-label').addClass('label-danger in').removeClass('label-success hide');
  $('.nav-connectionstatus-text').html('Connection failed');
  return Message.log('warn', `Reconnection failed [${data}]`);
});

// Not sure this is needed due to messaging
socket.on('reconnect_error', function (data) {
  $('.nav-connectionstatus-label').addClass('label-danger in').removeClass('label-success hide');
  return Message.log('error', `Reconnection error [${data}]`);
});

// Stop disonnect message on navigation
window.onbeforeunload = function () {
  socket.off('disconnect');
  return undefined;
};
