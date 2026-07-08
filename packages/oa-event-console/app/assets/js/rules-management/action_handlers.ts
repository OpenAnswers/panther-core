// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # ActionHandlers

// An interface for all the rule verbs to implement

class ActionHandlers extends RuleVerbHandlers {
  static initClass() {
    // Add a logger, other classes should override
    this.logger = debug('oa:event:rules:action_handlers');

    // The type for the verb. `action`, `option`, `select`
    this.verb_type = 'action';
    this.set_vars_from_verb_type();

    this.logger('ActionHandlers', this.dump());
  }

  static dump() {
    return [
      this.verb_type,
      this.verb_set_class,
      this.verb_set_selector,
      this.verb_instance_class,
      this.verb_instance_selector,
    ];
  }

  // ----------------------------------------------
  handleActionDelete($object, selector) {
    selector ??= '.action-delete-button';
    return $object.on('click', selector, function () {
      const $actionElem = ActionHandlers.closest(this, '.actions');
      const $setElem = ActionHandlers.closest(this, '.action-entry');
      if (!$actionElem.data('verb_set')) {
        return console.error('Missing verb_set object', $actionElem);
      }
      if (!$actionElem.data('verb')) {
        return console.error('Missing verb object', $actionElem);
      }
      return $actionElem.data('verb_set').remove();
    });
  }
}
ActionHandlers.initClass();

window.ActionHandlers = ActionHandlers;
