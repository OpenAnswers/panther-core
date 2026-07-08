// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// ----------------------------------------------------------------

const Cls = (window.SummaryStream = class SummaryStream {
  static initClass() {
    this.logger = debug('oa:event:console:summary-stream');
  }

  static joinSummaryRoom() {
    return socket.emit('summary::join_room');
  }
});
Cls.initClass();

// On DOM ready — must be after class definition because module scripts
// are deferred, so $(function(){}) fires immediately.
$(() => SummaryStream.joinSummaryRoom());
