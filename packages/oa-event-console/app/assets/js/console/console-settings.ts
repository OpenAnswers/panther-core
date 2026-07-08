// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_settings = debug('oa:event:settings');

// onload
$(function () {
  console.log('SETTINGS ONLOAD');

  $(ConsoleSettings.id).on('hidden.bs.modal', ev => (ConsoleSettings.modal = false));

  $(ConsoleSettings.id).on('shown.bs.modal', ev => (ConsoleSettings.modal = true));

  // Stop key presses from bubbling past the modal to the console
  $(ConsoleSettings.id).on('keydown keyup keypress', ev => ev.stopPropagation());

  $(ConsoleSettings.id).on('click', function (ev) {
    debug_settings('modal click ev', ev, $(ev.target));
    switch ($(ev.target).data('action')) {
      case 'tracking':
        debug_settings('tracking clicked');
        return socket.emit('settings::server::write', { tracking: 1 });
      case 'tracking-on':
        debug_settings('tracking-on clicked');
        return ConsoleSettings.setTrackingOn();
      case 'tracking-off':
        debug_settings('tracking-off clicked');
        return ConsoleSettings.setTrackingOff();
    }
  });

  $('#console-settings-tracking').click(function () {
    console.log('CLICKED');
    return ConsoleSettings.setTrackingToggle();
  });
  //socket.emit 'settings::server::write', {tracking: "toggle"}

  return socket.on('settings::server', settings => ConsoleSettings.processSettings(settings));
});

class ConsoleSettings {
  static initClass() {
    this.id = '#console-settings-modal';
    this.modal = false;
    this.tracking = 0;

    this.console_settings_template = $('#console-settings-template').html();
    Mustache.parse(this.console_settings_template);
  }

  static open() {
    return this.show();
  }

  static show() {
    debug_settings('showing');
    $(this.id).modal('show');
    this.modal = true;
    return socket.emit('settings::server::read', {}, function (error, data) {
      debug_settings('got data', data);
      ConsoleSettings.tracking = data.tracking;
      ConsoleSettings.displayTracking();
      return data;
    });
  }

  static hide() {
    $(this.id).modal('hide');
    return (this.modal = false);
  }

  static processSettings(settings) {
    return debug_settings(settings);
  }

  static setTracking(value) {
    const settings = { tracking: value };

    return socket.emit('settings::server::write', settings, function (error, data) {
      debug_settings('setting set', data);
      if (data.tracking === null) {
        ConsoleSettings.displayTrackingUnknown();
      }
      return data;
    });
  }

  static displayTracking() {
    if (this.tracking === '1') {
      return this.displayTrackingOn();
    } else {
      return this.displayTrackingOff();
    }
  }

  static displayTrackingUnknown() {
    $('#console-settings-button-tracking-on').removeClass('btn-success');
    return $('#console-settings-button-tracking-off').removeClass('btn-warning');
  }

  static displayTrackingOn() {
    $('#console-settings-button-tracking-on').addClass('btn-success');
    return $('#console-settings-button-tracking-off').removeClass('btn-warning');
  }

  static displayTrackingOff() {
    $('#console-settings-button-tracking-on').removeClass('btn-success');
    return $('#console-settings-button-tracking-off').addClass('btn-warning');
  }

  static setTrackingOn() {
    debug_settings('TRACKING ON');
    this.displayTrackingOn();
    return this.setTracking(1);
  }

  static setTrackingOff() {
    debug_settings('TRACKING OFF');
    this.displayTrackingOff();
    return this.setTracking(0);
  }

  static setTrackingToggle() {
    debug_settings('tracking ' + this.tracking);
    const settings = { tracking: 0 };
    if (this.tracking === 0) {
      settings.tracking = 1;
    }

    this.tracking = settings.tracking;
    return socket.emit('settings::server::write', settings, function (error, data) {
      debug_settings('toggled', data);
      return data;
    });
  }
}
ConsoleSettings.initClass();

window.ConsoleSettings = ConsoleSettings;
