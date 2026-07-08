// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// ## Message

// Generic interface to show messages to the user via
// Notification from the server

class Message {
  static initClass() {
    this.last_message = null;
  }

  static set_last_message(level, msg, data) {
    return (this.last_message = {
      level,
      msg,
      data,
    });
  }

  static log(level, msg, data) {
    const now = new Date();
    if (data !== undefined) {
      return console.log('%s %s %s', now.toISOString(), level, msg, data);
    } else if (msg !== undefined) {
      return console.log('%s %s', now.toISOString(), level, msg);
    } else {
      return console.log('%s %s', now.toISOString(), level);
    }
  }

  // Log a message with custom label
  static label(label, msg, data) {
    this.log(label, msg, data);
    return Notification.info(label, msg, data);
  }

  // Show a stronger error on exceptions. These have to be clicked to
  // be removed from the users viewport.
  static exception(msg, error) {
    console.error('Exception', msg, error.stack);
    return Notification.critical('Exception', msg);
  }

  // error
  static error(msg, data) {
    this.log('Error Message: %s', msg, data);
    return Notification.error('Error', msg, data);
  }

  // error
  static error_label(label, msg, data) {
    this.log('Error Message: %s: %s', label, msg, data);
    return Notification.error(label, msg, data);
  }

  // Warn
  static warn(msg, data) {
    this.log('Warning Message: %s', msg, data);
    return Notification.warn('Warning', msg, data);
  }

  // Warn style with a custom label
  static warn_label(label, msg, data) {
    this.log('Warn Message: %s: %s', label, msg, data);
    return Notification.warn(label, msg, data);
  }

  // Info
  static info(msg, data) {
    this.log('Info Message: %s', msg, data);
    return Notification.info('Information', msg, data);
  }

  // Info style with a custom label
  static info_label(label, msg, data) {
    this.log('Info Message: %s %s', label, msg, data);
    return Notification.info(label, msg, data);
  }

  // debug
  static debug(msg, data) {
    this.log('Debug: %s', msg, data);
    if (typeof development !== 'undefined' && development !== null && development === true) {
      return Notification.info('Debug', msg, data);
    }
  }

  // success
  static success(msg, data) {
    this.log('success', msg, data);
    return Notification.info('Success', msg, data);
  }

  // ### notify( type, message, data_object )
  // Notify a user with a type of message
  static notify(type, msg, data) {
    console.log('Message:', type, msg, data);
    return Notification.info(type, msg, data);
  }
}
Message.initClass();
//   style:          'panther'
//   className:      type
//   autoHide:       true
//   autoHideDelay:  @timeout
//   clickToHide:    true
//   globalPosition: 'bottom right'

window.Message = Message;
