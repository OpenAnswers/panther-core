// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
window.TemplatesNo = class TemplatesNo {
  // Action Tags
  // -----------
  static getTagSet() {
    return $('#template-tag-set').html();
  }

  static getTagReplace() {
    return $('#template-tag-replace').html();
  }

  static getTagStop() {
    return $('#template-tag-stop').html();
  }

  static getTagStopRuleSet() {
    return $('#template-tag-stop-rule-set').html();
  }

  static getTagDiscard() {
    return $('#template-tag-discard').html();
  }

  static getTagSkip() {
    return $('#template-tag-skip').html();
  }
};
