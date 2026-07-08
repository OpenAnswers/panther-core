// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Group

// Group rules are a little bit special as the RuleSet
// is housed in a group instead of directly in EventRules
// This means Group needs to implement a number of EventRulesy
// things. And they need to be treated a little bit special
// in some places

// ## Class Group

// A Group contains a select rule, for putting things in the
// group (and setting group: name)
// Then a RuleSet to be processed

class Group extends Rendered {
  static initClass() {
    this.logger = debug('oa:event:rules:group');

    this.dom_class = 'rule-group';
    this.dom_name = 'rule-group';

    this.template_id = '#template-group';
    this.template_setup();

    this.container_el = 'li';
  }

  // Generate an instance from the yaml model
  static generate(yaml_obj, options) {
    options ??= {};
    Group.logger('generating Group', yaml_obj, options);
    const select_rule = _.clone(yaml_obj.select || {});
    select_rule.name = `Events for the ${options.name} group`;
    select_rule.set = { group: options.name };

    const gen_options = _.omit(options, '$container');
    gen_options.group = options.name;

    // Rule for the select
    const select_opts = _.defaults({ index: 0 }, gen_options);
    const select = RuleGroupSelect.generate(select_rule, select_opts);

    // RuleSet as usual for the rules
    const rule_set = RuleSet.generate(yaml_obj.rules, gen_options);
    const group = new Group({
      rule_set,
      select,
      event_rules: options.event_rules,
      name: options.name,
      uuid: yaml_obj.uuid,
    });

    select.rule = group;
    return group;
  }

  constructor(options) {
    options ??= {};
    super();
    this.name = options.name || '';
    this.groups = options.groups;
    this.uuid = options.uuid;
    if (this.uuid) {
      this.uuid_short = _.head(this.uuid.split('-'));
      this.uuid_tally = _.get(Data.ruleMatches, this.uuid, 0);
    }
    this.event_rules = options.event_rules;
    this.select = options.select || new RuleSet(); //options
    this.rule_set = options.rule_set || new RuleSet(); //options
    this.ruleCount = this.rule_set.rules.length || 0;
    this.new = options.new || false;
    this.ruleMatches = this.ruleCount;

    this.rendered_init();
    this.logger('new Group created', this.name);
  }

  // Attach some extra steps inside the standard `render()` call
  render_custom(options) {
    options ??= {};
    this.select.set_container(this.$container.find('ul.rules-group-select'));
    this.select.render();
    this.rule_set.set_container(this.$container.find('ul.rules-group-ruleset'));
    return this.rule_set.render();
  }

  // Whenever we render...
  handlers(options) {
    options ??= {};
    super.handlers(options);
    const self = this;

    return this.$container
      .find('.rule-group-name-edit > input')
      .off('change')
      .on('change', () => self.validate_name());
  }

  initial_handlers(options) {
    options ??= {};
    super.initial_handlers(options);
    const self = this;

    // Create group rule
    this.$container.off('click.create').on('click.create', '.btn-rules-ruleset-createrule', function (ev) {
      self.logger('click btn-rules-ruleset-createrule');
      return self.rule_set.createNewRule();
    });

    // Edit Group
    this.$container.on('click', '.rule-group-toggle-edit', function (ev) {
      if (self.is_editmode()) {
        return self.disable_editmode();
      } else {
        return self.enable_editmode();
      }
    });

    // Delete group
    this.$container.on('click', '.rule-group-name-edit .button-delete', function (ev) {
      self.logger('delete clicked');

      const modal = $('#modal-delete-group');

      if (gitEnabled) {
        modal.find('#group-delete-reason').show();
      } else {
        modal.find('#group-delete-reason').hide();
      }

      modal.find('#group-name').text(self.name);
      modal.find('#group-rule-count').text(self.ruleCount);

      // Reset reason input
      modal.find('#group-delete-reason').val('');
      modal.find('#group-delete-reason').attr('style', '');
      modal.find('#group-delete-reason').attr('placeholder', 'Delete Reason');

      modal.find('#group-delete-confirm').off('click');
      modal.find('#group-delete-confirm').on('click', function () {
        if (gitEnabled && $('#group-delete-reason').val().length < 1) {
          modal.find('#group-delete-reason').attr('style', 'border-color: red !important');
          return modal.find('#group-delete-reason').attr('placeholder', 'Please enter a reason!');
        } else {
          modal.modal('hide');
          return self.delete_group_Async(modal.find('#group-delete-reason').val());
        }
      });

      return modal.modal('show');
    });

    // Save name edit
    this.$container.on('click', '.rule-group-name-edit .button-save', function (ev) {
      self.logger('save clicked');

      if (!self.is_new()) {
        self
          .update_select_Async()
          .catch({ name: 'ValidationError' }, err => Message.warn_label('Input Validation Failed', err.message))
          .catch(err => Message.exception(err.message, err));
      }

      const new_name = self.container_find('.rule-group-name-edit-input').val();

      if (!(new_name.trim().length > 0)) {
        return Message.error('Group name must set to something');
      }

      let group_promise;
      // create if its new
      if (self.is_new()) {
        group_promise = self.create_name_Async(new_name);
        // update if the name changed
      } else if (new_name !== self.name) {
        group_promise = self.update_name_Async(new_name).then(
          (
            res // and sync the select
          ) => self.update_select_Async()
        );
      } else {
        group_promise = self.update_select_Async();
      }

      return group_promise
        .then(res => self.disable_editmode())
        .catch({ name: 'ValidationError' }, function (err) {
          const $fg = $(self.$container).closest('.form-group').addClass('has-error');
          return Message.warn_label('Input Validation Failed', err.message);
        })
        .catch(function (err) {
          self.logger('Caught an exception after group promise');
          return Message.exception(err.message, err);
        })
        .finally(function () {});
    });
    // turn off the request spinner

    // Cancel name edit
    this.$container.on('click', '.rule-group-name-edit .button-cancel', function (ev) {
      self.logger('button cancel clicked');
      if (self.is_new()) {
        return self.$container.remove();
      } else {
        return self.disable_editmode();
      }
    });

    // Expand all and expands each rule
    this.$container.on('click', '.rule-group-icon > .glyphicon-arrow-down', function (ev) {
      self.logger('expand_all');
      self.expand_all();
      self.expand_group();
      self.rule_set.expand_all();
      const $arrowElem = self.$container.find('.collapse-all-toggle');
      $arrowElem.removeClass('glyphicon-arrow-down');
      $arrowElem.addClass('glyphicon-arrow-up');
    });

    // Collapse all and collapse each rule
    this.$container.on('click', '.rule-group-icon > .glyphicon-arrow-up', function (ev) {
      self.logger('collapse_all');
      self.collapse_all();
      self.collapse_group();
      self.rule_set.collapse_all();
      const $arrowElem = self.$container.find('.collapse-all-toggle');
      $arrowElem.removeClass('glyphicon-arrow-up');
      $arrowElem.addClass('glyphicon-arrow-down');
    });

    // Collapse group
    this.$container.on('click', '.rule-group-icon > .glyphicon-triangle-top', function (event) {
      self.collapse_all();
      self.collapse_group();
      // when collapsing the group, ensure that collapse_all is also updated
      const $arrowElem = self.$container.find('.collapse-all-toggle');
      $arrowElem.removeClass('glyphicon-arrow-up');
      $arrowElem.removeClass('glyphicon-arrow-down');
      $arrowElem.addClass('glyphicon-arrow-down');
    });

    // Expand group
    return this.$container.on('click', '.rule-group-icon > .glyphicon-triangle-bottom', function (event) {
      self.expand_all();
      self.select.expand_entry();
      self.expand_group();
    });
  }

  update_name($that) {
    const errors = self.validate_name();
    return errors.check_throw();
  }

  // Send a group name update to the server
  update_name_Async(new_name) {
    const self = this;
    return new Promise(function (resolve, reject) {
      const msg = {
        new_name,
        previous_name: self.name,
      };

      self.container_find('.button-save').prop('disabled', true);
      return self.event_rules
        .socketio_Async('event_rules::group::update_name', msg)
        .timeout(15000)
        .then(function (result) {
          self.name = new_name;
          self.render();
          return resolve(result);
        })
        .catch(reject)
        .finally(() => self.container_find('.button-save').prop('disabled', false));
    });
  }

  // Send the select to the server
  update_select_Async(select_obj) {
    const self = this;
    return new Promise(function (resolve, reject) {
      const msg = {
        index: self.select.index,
        rule: self.select.to_yaml_obj(),
      };

      const options = {};
      if (self.name !== undefined) {
        options.group = self.name;
      }

      self.container_find('.button-save').prop('disabled', true);
      return self.event_rules
        .socketio_Async('event_rules::group::update_select', msg, options)
        .timeout(15000)
        .then(function (result) {
          self.render();
          return resolve(result);
        })
        .catch(error => reject(error))
        .finally(() => self.container_find('.button-save').prop('disabled', false));
    });
  }

  // Send a group name update to the server
  create_name_Async(new_name) {
    const self = this;
    return new Promise(function (resolve, reject) {
      const msg = { new_name };

      self.container_find('.button-save').prop('disabled', true);
      return self.event_rules
        .socketio_Async('event_rules::group::create_name', msg)
        .timeout(15000)
        .then(function (result) {
          self.new = false;
          self.name = new_name;
          self.groups.add(self);
          return self.event_rules.refresh_Async();
        })
        .then(function (result) {
          // complete group rules
          self.event_rules.build_from_yaml();
          return self.event_rules.render();
        })
        .then(result => resolve(result))
        .catch(reject)
        .finally(() => self.container_find('.button-save').prop('disabled', false));
    });
  }

  // Send a group name update to the server
  delete_group_Async(reason) {
    const self = this;
    return new Promise(function (resolve, reject) {
      const msg = {
        name: self.name,
        reason,
      };

      if (self.name === undefined) {
        throw new Errors.ValidationError('No name', self.name);
      }
      const options = { group: self.name };

      self.container_find('.button-delete').prop('disabled', true);
      return self.event_rules
        .socketio_Async('event_rules::group::delete', msg, options)
        .timeout(15000)
        .then(result => self.event_rules.refresh_Async())
        .then(result => resolve(result))
        .catch(reject)
        .finally(() => self.container_find('.button-delete').prop('disabled', false));
    });
  }

  is_new() {
    return this.new;
  }

  validate(options) {
    let errors;
    options ??= {};
    return (errors = options.errors || new DomErrorSet());
  }

  validate_name(options) {
    options ??= {};
    const errors = options.errors || new DomErrorSet();
    $('.rule-group-name-edit > input').val();
    return errors;
  }

  dom_to_properties() {
    const errors = this.validate();
    errors.check_throw();
    return (this.name = $('.rule-group-name-edit > input').val());
  }

  to_yaml_obj() {
    const o = {};
    o.name = this.name;
    o.select = this.select.to_yaml_obj();
    o.rules = this.rule_set.to_yaml_obj();
    this.logger('to_yaml_obj created: ', o);
    return o;
  }

  enable_editmode() {
    this.$container.find('.rule-group-subtitle').addClass('hidden');
    this.$container.find('.rule-group-name').addClass('hidden');
    this.$container.find('.rule-group-name-edit').removeClass('hidden');
    this.$container.find('.rule-group-content-select').removeClass('hidden');
    // newly created Group rule should be saved before editing the selction rule
    if (!this.is_new()) {
      this.select.enable_editing();
    }
    return (this.editmode = true);
  }

  disable_editmode() {
    this.$container.find('.rule-group-subtitle').removeClass('hidden');
    this.$container.find('.rule-group-name').removeClass('hidden');
    this.$container.find('.rule-group-name-edit').addClass('hidden');
    this.$container.find('.rule-group-content-select').addClass('hidden');
    return (this.editmode = false);
  }

  is_editmode() {
    return this.editmode;
  }

  disable_delete() {
    return this.$container.find('.rule-group-delete').addClass('hidden');
  }

  enable_sortable() {
    return this.rule_set.enable_sortable();
  }
  disable_sortable() {
    return this.rule_set.disable_sortable();
  }
  collapse_all() {
    return this.select.collapse_entry();
  }
  expand_all() {
    return this.select.expand_entry();
  }

  collapse_group() {
    const $groupElem = this.$container.find('.rule-group-content');
    const $arrowElem = this.$container.find('.collapse-toggle');

    $arrowElem.removeClass('glyphicon-triangle-top');
    $arrowElem.addClass('glyphicon-triangle-bottom');

    this.$container.find('.rule-group-subtitle').removeClass('hidden');

    if (this.animation) {
      return $groupElem.slideUp('fast');
    } else {
      return $groupElem.hide();
    }
  }

  expand_group() {
    const $groupElem = this.$container.find('.rule-group-content');
    const $arrowElem = this.$container.find('.rule-group-icon > .collapse-toggle');

    $arrowElem.removeClass('glyphicon-triangle-bottom');
    $arrowElem.addClass('glyphicon-triangle-top');

    this.$container.find('.rule-group-subtitle').addClass('hidden');

    if (this.animation) {
      return $groupElem.slideDown('fast');
    } else {
      return $groupElem.show();
    }
  }

  // updating each groups counter for rules matching search term
  update_matches() {
    this.$container.removeClass('hidden');
    this.ruleMatches = this.ruleCount;
    let hidden = 0;

    // iterates over every rule in a group, counts and hides it if they have the class "no-match"
    this.$container
      .find('.card-global-rule-li')
      .not('.rules-group-select')
      .each(function (index, element) {
        if ($(element).hasClass('no-match')) {
          return hidden++;
        }
      });
    this.ruleMatches -= hidden;

    // if there is a search, calculates and displays the rules matched against the search term
    if ($('#sidebar-search-box').val() !== '' || ActionFilters.actionFilters.length > 0) {
      const $ruleMatchCounter = this.$container.find('.matches');
      const $totalRules = this.$container.find('.group-rules');

      this.$container.find('.rule-matches').text(this.ruleMatches + '/' + this.ruleCount);
      $ruleMatchCounter.removeClass('hidden');
      $totalRules.addClass('hidden');
    } else {
      this.$container.find('.matches').addClass('hidden');
      this.$container.find('.group-rules').removeClass('hidden');
    }

    if (this.ruleMatches === 0) {
      this.hide_group();
    }
    return true;
  }

  hide_group() {
    if ($('#sidebar-search-box').val() !== '') {
      return this.$container.addClass('hidden');
    }
  }

  // update to counters for rule selector matches and rule hits per group
  update_group_total_counters() {
    let rule_total_matches = 0;

    // iterates over every rule and counts the number of times they have been hit
    this.$container
      .find('.card-global-rule-li')
      .not('.rules-group-select')
      .not('.no-match')
      .each((index, element) =>
        $(element)
          .find('.rule-name-uuid-tally')
          .each(function (index, element) {
            const count = $(element).text().split(' ');
            return (rule_total_matches += Number(count[count.length - 1]));
          })
      );

    // set group counter for group selector hits
    this.$container.find('.group-hits').text(this.uuid_tally);

    // set counter for rule hits
    this.$container.find('.rule-uuid-tally').text(rule_total_matches);
    return rule_total_matches;
  }
}
Group.initClass();

window.Group = Group;
