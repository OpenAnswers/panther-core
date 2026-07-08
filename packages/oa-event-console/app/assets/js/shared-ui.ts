// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
class UI {
  static toggleSaveRulesDialog() {
    if (Config.enableAnimation) {
      return $('#card-rules-not-saved').animate({ height: 'toggle', opacity: 'toggle' }, 'fast');
    } else {
      return $('#card-rules-not-saved').toggle();
    }
  }
  static showSaveRulesDialog() {
    if (Config.enableAnimation) {
      return $('#card-rules-not-saved').animate({ height: 'show', opacity: 'show' }, 'fast');
    } else {
      return $('#card-rules-not-saved').show();
    }
  }
  static hideSaveRulesDialog() {
    if (Config.enableAnimation) {
      return $('#card-rules-not-saved').animate({ height: 'hide', opacity: 'hide' }, 'fast');
    } else {
      return $('#card-rules-not-saved').hide();
    }
  }
  static configureEllipsis() {
    return $('.rule-name').dotdotdot({
      watch: 'window',
    });
  }
}

window.UI = UI;
