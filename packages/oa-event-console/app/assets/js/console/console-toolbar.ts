// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
$(function () {
  $('#toolbar-icon-refresh').click(function () {
    Notification.info('Console Refreshed', 'The event console has been refreshed.');
    return socket.emit('populate');
  });

  $('#toolbar-icon-settings').click(function () {
    ConsoleSettings.show();
    return true;
  });

  $('#toolbar-icon-minimal-mode').click(function () {
    if ($('#nav').is(':visible')) {
      $('#nav').hide();
      $('#toolbar-icon-minimal-mode').html("<span class='glyphicon glyphicon-save'></span>");
      window.dispatchEvent(new Event('resize'));
    } else {
      $('#nav').show();
      $('#toolbar-icon-minimal-mode').html("<span class='glyphicon glyphicon-open'></span>");
      window.dispatchEvent(new Event('resize'));
    }
    return $('.ui-tooltip').remove();
  });

  return $('.toolbar-icon').tooltip({
    tooltipClass: 'ui-tooltip-arrow-top',
    position: {
      my: 'center+16px',
      at: 'bottom+30px',
    },
  });
});
