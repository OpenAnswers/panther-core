// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
class UI {
  static showConfirmDeleteDialog(rule) {
    const rule_name = rule.getRuleName();
    const $el = rule.getRuleElement();

    //$("#modal-delete-confirm .metadata-tags").html(ruleTagsHtml)
    const $modal = $('#modal-delete-confirm');
    $.data($modal, 'rule', rule);
    $modal.find('rule-name').html(name_name);
    return $modal.modal();
  }

  // ### Save Rules Dialog
  static toggleSaveRulesDialog() {
    if ($('.nav-quick-deploy').hasClass('hidden')) {
      return $('.nav-quick-deploy').removeClass('hidden');
    } else {
      return $('.nav-quick-deploy').addClass('hidden');
    }
  }

  static showSaveRulesDialog() {
    return $('.nav-quick-deploy').removeClass('hidden');
  }

  static hideSaveRulesDialog() {
    return $('.nav-quick-deploy').addClass('hidden');
  }

  // Reload rules dialog
  static showReloadRulesDialog() {
    return $('.card-rules-reload').removeClass('hidden');
  }

  static hideReloadRulesDialog() {
    return $('.card-rules-reload').addClass('hidden');
  }

  //@setSidebarAffix = ->
  //$(".sidebar").affix { offset : { top: 245 } }

  static populateGroupSelects() {
    return $.each(Data.groupNames, (key, value) =>
      $('#modal-move-to-group-select').append($('<option></option>').attr('value', key).text(value))
    );
  }

  static showErrorDialog(title, message) {
    $('#modal-error .modal-title').html(title);
    $('#modal-error-message').html(message);
    return $('#modal-error').modal();
  }

  static showSuccessDialog(title, message) {
    $('#modal-success .modal-title').html(title);
    $('#modal-success-message').html(message);
    return $('#modal-success').modal();
  }

  static hideRulesLoader() {
    return $('#rules-loader').hide();
  }

  static updateRulesLoaderStatus(index) {
    return $('#rules-loader .text').html(`Loading rule ${index}`);
  }
}

window.UI = UI;
