// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// ## Notification

// Generic interface to show notifications to the user

// Styles are mainly controlled in global.css. Some defaults are included here

class Notification {
  static initClass() {
    this.timeout = 10000;

    this.style = 'panther';

    $.notify.addStyle('info', {
      html: `\
<div>
<div class='notification'>
  <div class='notification-colour'></div>
  <div class='notification-content'>
    <div class='notification-title' data-notify-html='title'></div>
    <div class='notification-message' data-notify-text='message'></div>
  </div>
</div>
</div>\
`,

      classes: {
        base: {
          position: 'relative',
          width: '350px',
          overflow: 'hidden',
          'background-color': 'white',
          'border-radius': '2px',
          color: '#616161',
        },
      },
    });

    // title:message = data
    this.current = {};
  }

  static notification(type, title, message, data) {
    data ??= {};
    const timeout = data.timeout ? data.timeout : this.timeout;
    return $.notify(
      { title, message },
      {
        style: 'info',
        autoHide: true,
        autoHideDelay: timeout,
        clickToHide: true,
        globalPosition: 'bottom right',
        className: type,
      }
    );
  }

  static info(title, message, data) {
    data ??= {};
    return this.notification('info', title, message, data);
  }

  static warn(title, message, data) {
    return this.notification('warn', title, message, data);
  }

  static error(title, message, data) {
    return this.notification('error', title, message, data);
  }

  static critical(title, message, data) {
    return $.notify(
      { title, message },
      {
        style: 'info',
        autoHide: false,
        clickToHide: true,
        globalPosition: 'bottom right',
        className: 'critical',
      }
    );
  }
  static info_dedupe(title, message, data) {
    data ??= {};
    data._notifications_nid = Helpers.random_string(7);
    data._notifications_timeout_ts = Date.now() + this.timeout;
    const key = `${title}:${message}`;
    if (this.current[key] && this.current[key]._notifications_timeout_ts < Date.now()) {
      return this.notification('info', title, message + 'duplicate', data);
    } else {
      this.current[key] = data;
      data._notifications_count = 1;
      return this.notification('info', title, message, data);
    }
  }
}
Notification.initClass();

window.Notification = Notification;
