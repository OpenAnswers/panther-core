// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const Cls = (window.Validation = class Validation {
  static initClass() {
    this.errors = [];
    this.logger = debug('oa:event:rules:validation');
  }

  static populateErrorList() {
    const errorMessage = $('#modal-error-message');
    $(errorMessage).append('<ul>');
    for (var error of this.errors) {
      $(errorMessage).append(`<li>${error}</li>`);
    }
    return $(errorMessage).append('</ul>');
  }

  //-----------------------------------------------------------------

  static validateRule($ruleElem) {
    Validation.errors = [];
    let isInvalid = false;

    // Validate selectors
    let selectorCount = 0;
    $ruleElem.find('.select-entry-edit').each(function (index, element) {
      selectorCount++;
      const data = $(element).data('select-id');
      Validation.logger('validate', $ruleElem, data);
      if (!Validation.validateSelector($ruleElem, data)) {
        this.logger(`Validation on rule uid ${$ruleElem.data('uid')} failed on selectors`);
        return (isInvalid = true);
      }
    });

    if (selectorCount === 0) {
      Validation.errors.push('You must specify at least one selector!');
      isInvalid = true;
    }

    if (!Validation.validateName($ruleElem)) {
      isInvalid = true;
    }

    Validation.populateErrorList();

    return !isInvalid;
  }

  //-----------------------------------------------------------------

  static validateName($ruleElem) {
    let isInvalid = false;

    const nameElem = $ruleElem.find('.rule-name-edit input');
    const nameVal = $(nameElem).val().trim();

    if (nameVal === '' || nameVal.length === 0) {
      isInvalid = true;
      DOM.invalidInput(nameElem);
    }

    return !isInvalid;
  }

  //-----------------------------------------------------------------

  static validateAction($ruleElem, actionId) {
    let isInvalid = false;

    const $actionElem = $ruleElem.find(`.action-entry-edit[data-action-id=${actionId}]`);

    const $operatorElem = $actionElem.find('.action-operator input');
    const operatorVal = $operatorElem.val();
    const $fieldElem = $actionElem.find('.action-field input');
    const fieldVal = $fieldElem.val();

    if ($fieldElem && fieldElem.length === 1) {
      if (fieldVal.length === 0) {
        DOM.invalidInput($fieldElem);
        isInvalid = true;
      } else {
        DOM.validInput($fieldElem);
      }
    }

    if ($operatorElem) {
      if (operatorVal.length === 0) {
        DOM.invalidInput($operatorElem);
        isInvalid = true;
      } else {
        DOM.validInput($operatorElem);
      }
    }

    // Ensure the operator is valid
    if (!this.isValidActionOperator(operatorVal)) {
      DOM.invalidInput($operatorElem);
      isInvalid = true;
    } else {
      DOM.validInput($operatorElem);
    }

    this.logger(`Operator: ${operatorVal} | Field: ${fieldVal}`);

    return !isInvalid;
  }

  //-----------------------------------------------------------------

  static isValidActionOperator(operatorName) {
    return Data.actionNames.includes(operatorName);
  }

  static isValidSelectorOperator(operatorName) {
    return Data.selectorOperatorNames.includes(operatorName);
  }

  //-----------------------------------------------------------------
  // These methods apply to EDIT selectors only!

  static validateSelector($ruleElem, selectorId) {
    const logger = debug(`${this.debug_namespace}.validateSelector()`);
    let isInvalid = false;

    const $selectorElem = Selector.getSelectorEdit($ruleElem, selectorId);
    logger('validateSlector', $selectorElem);

    const $fieldElem = $selectorElem.find('.selector-field input');
    const $operatorElem = $selectorElem.find('.selector-operator input');
    const $valueElems = $selectorElem.find('.selector-value input');

    const fieldVal = $fieldElem.val().trim();
    const operatorVal = $operatorElem.val().trim();

    // Check fieldVals are populated
    if (fieldVal.length === 0) {
      DOM.invalidInput($fieldElem);
      Validation.errors.push('The field box must not be empty.');
      isInvalid = true;
    } else {
      DOM.validInput($fieldElem);
    }

    if (operatorVal.length === 0) {
      DOM.invalidInput($operatorElem);
      Validation.errors.push('The operator box must not be empty.');
      isInvalid = true;
    } else {
      DOM.validInput($operatorElem);
    }

    // Ensure the operator is valid
    if (!Selector.isSelectorValid(operatorVal)) {
      DOM.invalidInput($operatorElem);
      Validation.errors.push('The operator specified is invalid.');
      isInvalid = true;
    } else {
      DOM.validInput($operatorElem);
    }

    for (var valueElem of $valueElems.toArray()) {
      var value = $(valueElem).val().trim();
      if (value.length === 0) {
        DOM.invalidInput(valueElem);
        isInvalid = true;
      } else {
        DOM.validInput(valueElem);
      }
    }

    return !isInvalid;
  }
});
Cls.initClass();

//-----------------------------------------------------------------
