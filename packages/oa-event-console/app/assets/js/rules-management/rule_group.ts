// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// An instance of a Rule
// Many make up a RuleSet

class GroupRule extends Rule {
  constructor(index, options) {
    super(index, options);
    this.index = index;
    this.group = options.group;
    this.dom_id = `.card-global-rule[data-id=${this.index}][data-group=${this.group}]`;
  }
}

window.GroupRule = GroupRule;
