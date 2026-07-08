// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const Cls = (window.ActionFilters = class ActionFilters {
  static initClass() {
    this.actionFilters = [];
  }

  static resetActionFilter() {
    return (ActionFilters.actionFilters = []);
  }

  static addActionFilter(action) {
    return ActionFilters.actionFilters.push(action);
  }

  static removeActionFilter(action) {
    const index = ActionFilters.actionFilters.indexOf(action);
    ActionFilters.actionFilters.splice(index, 1);
    if (ActionFilters.actionFilters.length === 0) {
      return this.showAll();
    }
  }

  static removeAllActionFilters() {
    this.actionFilters = [];
    $('.tags .entry').each((index, element) => $(element).removeClass('entry-selected'));
    return this.showAll();
  }

  static renderActionFilter() {
    const searchWarning = $('#search-warning').show();
    let disableDragging = false;

    const cardsCount = $('.card-global-rule-li').length;
    let hiddenCount = 0;

    $('#rules-empty').hide();
    // cards not already marked by no-match from strings searches
    $('.card-global-rule-li')
      .not('.no-match')
      .each(function () {
        return (() => {
          const result = [];
          for (var filter of ActionFilters.actionFilters) {
            if ($(this).find(`.tag-${filter}`).length === 0) {
              disableDragging = true;
              hiddenCount++;

              $(this).hide();
              // add class to mark being hidden from filter matches
              result.push($(this).addClass('no-match'));
            } else {
              result.push(undefined);
            }
          }
          return result;
        })();
      });

    //    hide the group if all rules don't match
    $('.rule-group').each(function (rgi, rge) {
      $(this).show();
      //
      const ruleCounter = $(this).find('.card-global-rule-li').length;
      const noMatchCounter = $(this).find('.no-match').length;
      //console.log "ruleCounter = " + ruleCounter + " noMatchCounter = " + noMatchCounter, rgi, rge
      if (ruleCounter === noMatchCounter) {
        return $(this).hide();
      }
    });

    if (cardsCount - hiddenCount === 0) {
      $('#rules-empty').show();
    }

    if (disableDragging) {
      Data.event_rules.disable_sortable();
      return $(searchWarning).show();
    }
  }

  static toggleTag(elem) {
    if ($(elem).hasClass('entry-selected')) {
      $(elem).removeClass('entry-selected');
      return ActionFilters.removeActionFilter($(elem).data('action'));
    } else {
      $(elem).addClass('entry-selected');
      return ActionFilters.addActionFilter($(elem).data('action'));
    }
  }

  static showAll() {
    if (sub_type === 'globals') {
      $('.card-global-rule-li').each(function (rgi, rge) {
        $(this).show();
        return $(this).removeClass('no-match');
      });
    } else {
      $('.rule-group').each(function (rgi, rge) {
        return $(this).show();
      });
    }
    return $('#rules-empty').hide();
  }
});
Cls.initClass();
