// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Logging Class
// =============
// Provides some basic logging methods for timing and so on

const Cls = (window.Logging = class Logging {
  static initClass() {
    this.timerStack = [];
  }

  // Group Logic
  // -----------------------------------------
  static startGroup(groupName, collapsed) {
    collapsed ??= false;
    if (collapsed) {
      console.groupCollapsed(`%c${groupName}`, 'font-weight: normal');
    } else {
      console.group(groupName);
    }
    return this.timerStack.push(performance.now());
  }

  static endGroup() {
    const startTime = this.timerStack.pop();
    const groupElapsed = performance.now() - startTime;
    console.log(`%cFinished in: ${groupElapsed.toFixed(2)}ms`, 'font-weight: bold; color: #3F51B5');
    return console.groupEnd();
  }
  // ------------------------------------------

  static title(message) {
    return console.log(`%c${message}`, 'font-size: 2em; font-weight: bold;');
  }

  static subtitle(message) {
    return console.log(`%c${message}`, 'font-size: 1.3em;');
  }

  static divider() {
    return Logging.blank();
  }

  static blank() {
    return console.log('');
  }

  static info(message) {
    return console.log(message);
  }

  static infoTime(message) {
    return console.log(message);
  }

  static success(message) {
    return console.log(`%c    ${message}    `, 'background: #CCFFCC; font-weight: bold;');
  }

  static failure(message) {
    return console.log(`%c    ${message}    `, 'background: #FF6962; color:white; font-weight: bold;');
  }

  static error(message) {
    return console.error(message);
  }
});
Cls.initClass();
