// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Allows you to easily track the time things take

class Timer {
  // Generate and start a timer
  static start() {
    return new Timer({ start: true });
  }

  constructor(options) {
    options ??= {};
    this.startTime = undefined;
    this.endTime = 0;
    this.elapsedTime = undefined;
    this.logger = options.logger || console.log;
    this.name = options.name;
    if (options.start === true) {
      this.start();
    }
  }

  start() {
    return (this.startTime = Date.now());
  }

  end() {
    this.endTime = Date.now();
    return (this.elapsedTime = this.endTime - this.startTime);
  }

  elapsed() {
    /*
    colour = "black"
    if @elapsedTime <= 50
      colour = "green"
    if @elapsedTime > 50 && @elapsedTime < 100
      colour = "orange"
    if @elapsedTime => 100
      colour = "red"
    */

    return this.elapsedTime;
  }

  end_log(msg, data, logger) {
    logger ??= this.logger;
    this.end();
    return this.log(msg, data, logger);
  }

  log(msg, data, logger) {
    logger ??= this.logger;
    return logger.call(`${msg} took ${this.elapsedTime} ms`, data);
  }
}

window.Timer = Timer;
