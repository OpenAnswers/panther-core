// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Typeaheads
// =====================

// This class handles the drop-down 'typeaheads' that are used
// on input fields to provide suggested values. These are most
// commonly used on selectors and actions to recommend operators
// and fields. It is worth noting that Typeaheads don't appear
// to be particularly quick and constitute a great deal of the
// time spent loading.

const Cls = (window.Typeaheads = class Typeaheads {
  static initClass() {
    this.debugNamespace = 'oa:event:rules:typeaheads';
    this.logger = debug(`${this.debugNamespace}`);

    // Configuration defaults for Typeaheads
    this.default_options = {
      minLength: 0,
      showHintOnFocus: true,
      autoSelect: true,
      items: 'all',
      scrollHeight: 0,
      afterSelect(data) {
        return Typeaheads.logger('typeahead after select', data);
      },
      updater(item) {
        Typeaheads.logger('typeahead updated', item);
        return item;
      },
    };
  }

  // Set Selector Typeaheads
  // -------------------
  // Apply the appropriate Typeaheads to selector fields and operators.
  static NOPEsetSelectTypeaheads($elem) {
    const timer = new Timer();
    timer.start();

    // If this method was called with a specific selector in mind, only apply to
    // that selector, otherwise apply to all selectors that we can find in the
    // document (SLOW!)
    const $field_els = $elem ? $elem.find(selector_string) : $('.select-field input[type=text]');

    const elemsAffected = 0;

    this.logger('Adding the select typeaheads..', $elem);
    // Destroy any existing Typeaheads on this selector as it causes a lot of
    // problems if you apply a Typeahead twice to the same element
    $field_els.typeahead('destroy');

    // Apply the Typeahead to the element
    $field_els.typeahead(_.defaults({ source: Data.fields }, this.typeahead_defaults));

    // Same as previously seen in this method
    const $operator_els = $elem
      ? $elem.find('.select-operator input[type=text]')
      : $('.select-operator input[type=text]');

    $operator_els.typeahead('destroy');
    const opts = _.defaults({ source: SelectTypes.active_types() }, this.default_options);
    $operator_els.typeahead(opts);

    return this.logger(
      'Done adding the select typeaheads op[%s] field[%s] [%s]ms',
      $operator_els.length,
      $field_els.length,
      timer.end()
    );
  }

  static add_typeahead_to_select($container) {
    const css_select_selector = '.select-field input[type=text]';
    const $fields = $container.find(css_select_selector);
    this.add_fields_typeahead($fields);

    const $verbs = $container.find('.select-operator input[type=text]');
    return this.add_selects_typeahead($verbs);
  }

  static add_typeahead_to_action($container) {
    const css_action_selector = '.action-field input[type=text]';
    const $fields = $container.find(css_action_selector);
    this.add_fields_typeahead($fields);

    const $verbs = $container.find('.action-operator input[type=text]');
    return this.add_actions_typeahead($verbs);
  }

  static add_typeahead_to_schedule($container) {
    const css_schedule_selector = '.schedule-field input[type=text]';
    const $schedules = $container.find(css_schedule_selector);
    return this.add_schedules_typeahead($schedules);
  }

  // Fields

  static add_fields_typeahead($els) {
    if ($els.length == null || !($els.length > 0)) {
      return;
    }
    $els.typeahead('destroy');
    return $els.typeahead(this.fields_typeahead_opts());
  }

  static fields_typeahead_opts() {
    //_.defaults source: Fields.all(), @default_options
    return _.defaults({ source: this.get_fields() }, this.default_options);
  }

  static get_fields() {
    if (this.fields) {
      return this.fields;
    }
    return (this.fields = typeof Data !== 'undefined' && Data !== null ? Data.fields : undefined); //or $.get('/api/fields').then (r)->
  }

  // Actions

  static add_actions_typeahead($els) {
    $els.typeahead('destroy');
    return $els.typeahead(this.actions_typeahead_opts());
  }

  static actions_typeahead_opts() {
    return _.defaults({ source: ActionTypes.active_types() }, this.default_options);
  }

  // Schedules

  static add_schedules_typeahead($els) {
    $els.typeahead('destroy');
    return $els.typeahead(this.schedules_typeahead_opts());
  }

  static schedules_typeahead_opts() {
    return _.defaults({ source: this.get_schedules() }, this.default_options);
  }

  static get_schedules() {
    this.logger('get_schedules 1 ', this.schedules);
    if (this.schedules) {
      return this.schedules;
    }
    this.schedules = typeof Data !== 'undefined' && Data !== null ? Data.scheduleNames : undefined;
    this.logger('get_schedules 2 ', this.schedules);
    return this.schedules;
  }

  // Selects

  static add_selects_typeahead($els) {
    $els.typeahead('destroy');
    return $els.typeahead(this.selects_typeahead_opts());
  }

  static selects_typeahead_opts() {
    return _.defaults({ source: SelectTypes.active_types() }, this.default_options);
  }

  static add_groups_typeahead($els) {
    $els.typeahead('destroy');
    return $els.typeahead(this.groups_opts());
  }

  static group_opts() {
    return _.defaults({ source: Groups.names() }, this.default_options);
  }

  // Set Action Typeaheads
  // -------------------
  // Apply the appropriate Typeaheads to action fields and operators.
  static NOPEsetActionTypeaheads($elem) {
    this.logger('Adding the action typeaheads', $elem);

    const selector_string = '.action-operator > input[type=text]';
    // If this method was called with a specific action in mind, only apply to
    // that action, otherwise apply to all actions that we can find in the
    // document (SLOW!)
    const $operator_els = $elem ? $elem.find(selector_string) : $(selector_string);

    $operator_els.typeahead('destroy');
    const opts = _.defaults({ source: ActionTypes.active_types() }, this.default_options);
    $operator_els.typeahead(opts);

    const field_selector_string = '.action-field > input';
    const $field_els = $elem ? $elem.find(field_selector_string) : $(field_selector_string);

    $field_els.typeahead('destroy');
    $field_els.typeahead(_.defaults({ source: Data.fields }, this.typeahead_defaults));

    return this.logger('Done adding the action typeaheads op[%s] field[%s]', $operator_els.length, $field_els.length);
  }
});
Cls.initClass();
