// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Globals AND Groups and Agent Rules
// ===============================

// This file provides the entry point for JavaScript
// on both the global and grouped rule management pages.

class Config {
  static initClass() {
    this.prototype.enableAnimation = true;
  }
}
Config.initClass();

// jQuery On Document Load
// -----------------------
// Kick off data acquisition and rendering.

$(function () {
  // Call Bootstrap's affix method to keep the sidebar in the viewport on scrolling.
  //UI.setSidebarAffix()

  // This bundle is also loaded on /rules/new, which has no list container and
  // no server-injected `type`/`sub_type` globals. Skip list-page init there.
  if (!document.getElementById('event-rules-generic-container')) {
    return;
  }

  // Jade passes in two simple string variables from `render`
  if (!_.isString(type)) {
    Message.error('No rules type available');
  }
  if (!_.isString(sub_type)) {
    Message.error('No rules sub type is available');
  }

  // Start page specific code.
  Data.type = type;
  Data.sub_type = sub_type;

  // The Promise library lets us specify a series of asynchronous calls, and
  // register code to be executed once they are all completed. We can continue
  // rendering once all our API calls to fetch data have been completed.
  return Promise.props({
    selectors: Data.getSelectorOperators(),
    actions: Data.getActions(),
    fields: Data.getFields(),
    ruleMatches: Data.getRuleMatches(),
    event_rules: Data.getRules(type, sub_type),
    groupNames: Data.getGroupNames(),
    scheduleNames: Data.getScheduleNames(),
  })
    .then(function (results) {
      const $evr = $('#event-rules-generic-container');

      Data.event_rules = EventRules.generate(results.event_rules, { $container: $evr });

      // Create and render our rule elements.
      Data.event_rules.render();

      // Collapse all rules, extra parameter is false to disable animation.
      Data.event_rules.collapse_all(false);

      // Allow the user to re-arrange the rules.
      Data.event_rules.enable_sortable();

      // Populate the 'Move to Group' drop-down with group names.
      UI.populateGroupSelects();

      //Loaded
      UI.hideRulesLoader();

      // Ask the server if the current rule set has changes awaiting deployment, and display a dialog
      // box if that is the case to prompt the user to save.
      return Data.isRuleSetEdited();
    })
    .catch(function (error) {
      console.error('Failed to load rules data', error);
      return Message.exception('Failed to load rules data', error);
    });
});

window.Config = Config;
