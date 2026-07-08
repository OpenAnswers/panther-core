// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// RulesSet Management
// =====================

// This class handles the rendering of rule 'cards' for anything that
// holds a set of rules. Implements `Rendered` for the UI setup

// Global rules is a rule set.
//
// Groups have many rule sets.
//
// Agents each have a rule set.

class RuleSet extends Rendered {
  static initClass() {
    this.logger = debug('oa:event:rules:rule_set');

    this.dom_name = 'rule-set';
    this.dom_data_id = 'rule_set';
    //@dom_selector = '.' + @dom_class

    this.template_blank = true;

    // Rules live in an `<li>` so they are sortable. Rendered deals with this.
    this.container_el = 'ul';
  }

  // Rule set is generated from an array of rule definitions
  //
  //     [
  //       { name: 'one', match: summary: 'test', set: whatever: 'yes' },
  //       { name: 'two', all: true, set: other: 'yes' },
  //     ]
  //
  static generate(yaml_def, options) {
    options ??= {};
    RuleSet.logger('generating RuleSet', yaml_def, options);
    if (!(yaml_def instanceof Array)) {
      throw new Error('The yaml rule set object must be an array of ' + `rule definitions [${typeof yaml_def}]`);
    }

    return new RuleSet(_.defaults({ yaml: yaml_def }, options));
  }

  // ###### `new RuleSet {}`
  constructor(options) {
    options ??= {};
    super();
    this.rules = [];

    // - `@label` Human label
    this.label = options.label;

    // - `@type` Different event_rules parents of rulset - server,agent
    this.type = options.type;

    // - `@sub_type` Different types of ruleset - group/global/agent-name
    this.sub_type = options.sub_type;

    // - `@event_rules` Store a reference to the parent for traversal
    this.event_rules = options.event_rules;

    // - `@group` If we hav multiple RuleSets in EventRules, they need
    // to have group.
    this.group = options.group;

    // - `@animation` Animation control for the ruleset
    this.animation = options.animation || false;

    // - `@template_none` Disable `Rendered` templates for this
    this.template_none = true;

    // - `@container_el` Set our default container to a ul (for sortable)
    this.container_el = 'ul';

    // - `@_editing` Set the editing flag
    this._editing = false;

    // - `@yaml` We build from the yaml represenstion
    this.yaml = options.yaml;
    if (this.yaml) {
      this.build_from_yaml();
    }

    this.rendered_init(options);
  }

  // ###### @build_from_yaml( yaml_Object )
  build_from_yaml(yaml_def) {
    yaml_def ??= this.yaml;
    return (this.rules = yaml_def.map((yaml_rule, index) => this.build_ruleset_rule(index, yaml_rule)));
  }

  // ###### @build_ruleset_rule( index<Integer> )
  // Generic way to add a rule with an index
  build_ruleset_rule(index, yaml_rule) {
    const rule_opts = {
      index,
      rule_set: this,
      event_rules: this.event_rules,
      group: this.group,
    };
    return Rule.generate(yaml_rule, _.defaults(rule_opts));
  }

  // ###### @getRule( index<Integer> )
  // Get a rule by index, throw if it doesn't exist
  getRule(index) {
    if (!this.rules[index]) {
      throw new Error(`No rule number [${index + 1}]`);
    }
    return this.rules[index];
  }

  // ###### @add_rule( yaml_Object )
  // Build, add a rule and append to the dom
  add_rule(yaml_rule) {
    const index = this.getNextRuleId();
    this.build_ruleset_rule(index, yaml_rule);
    this.rules.push(new_rule);
    return this.$container.append(new_rule.container);
  }

  // ###### @getContainerElement()
  getContainerElement() {
    return this.$container;
  }

  getLastRuleId() {
    return this.rules.length - 1;
  }

  getNextRuleId() {
    return this.rules.length;
  }

  // ###### @render_custom()
  render_custom() {
    this.logger('render() rule_set', this.rules.length);
    const rules = this.rules.map(rule => rule.render());
    return this.$container.append(rules);
  }

  // ###### @handlers()
  handlers(options) {
    const self = this;
    return super.handlers(options);
  }

  // ###### @initial_handlers()
  initial_handlers(options) {
    const self = this;
    return super.initial_handlers(options);
  }

  // ###### @.refresh_Async()
  // Trigger refresh up the chain until the data source is
  // refreshed. Single Rules can't be refreshed on their own
  // at the moment
  refresh_Async(options) {
    options ??= {};
    const self = this;

    options.redraw ??= false;

    return new Promise(function (resolve, reject) {
      if (!self.event_rules) {
        reject(new Error('No parent to refresh'));
      }

      return self.event_rules
        .refresh_Async()
        .then(function (data) {
          if (options.redraw) {
            // Do some redrawing??
            Message.info('not implemented');
          }

          return resolve(data);
        })
        .catch(function (error) {
          Message.exception(`Problem refreshing rule set - ${error}`, error);
          return reject(error);
        });
    });
  }

  // ###### @toggle_editing( index<Integer> )
  // This method will toggle the editing mode of the rule card
  // at the specified index.
  toggle_editing(ruleIndex) {
    return this.getRule(ruleIndex).toggle_editing();
  }

  // ###### @isEditMode( index<Integer> )
  // Is Rule In Edit Mode
  // This method will return whether the rule is currently in edit mode.
  isEditMode(ruleIndex) {
    return this.getRule(ruleIndex).idEditMode();
  }

  // ###### @enable_editing( index<Integer> )
  // Enable Editing Mode
  // This method will enable the editing mode of a rule.
  enable_editing(ruleIndex) {
    return this.getRule(ruleIndex).enable_editing();
  }

  // ###### disable_editing( index<Integer> )
  // This method will disable the editing mode of a rule.
  disable_editing(ruleIndex) {
    return this.getRule(ruleIndex).disable_editing();
  }

  // ###### @enable_rule_save( index<Integer> )
  enable_rule_save(ruleIndex) {
    return this.getRule(ruleIndex).enable_rule_save();
  }

  // ###### @disable_rule_save( index<Integer> )
  disable_rule_save(ruleIndex) {
    return this.getRule(ruleIndex).disable_rule_save();
  }

  // ###### @isNew( index<Integer> )
  isNew(ruleIndex) {
    return this.getRule(ruleIndex).isNew();
  }

  // ###### @isDisabled( index<Integer> )
  isDisabled(ruleIndex) {
    return this.getRule(ruleIndex).isDisabled();
  }

  // ###### @collapse_entry( index<Integer> )
  collapse_entry(ruleIndex) {
    return this.getRule(ruleIndex).collapse_entry();
  }

  // ###### @expand_entry( index<Integer> )
  expand_entry(ruleIndex) {
    return this.getRule(ruleIndex).expand_entry();
  }

  // ###### @collapse_all()
  // rules
  collapse_all() {
    return this.rules.map((rule, index) => rule.collapse_entry());
  }

  // ###### @expandAll()
  // rules
  expand_all() {
    return this.rules.map((rule, index) => rule.expand_entry());
  }

  // ###### @appendRule()
  // to a RuleSet
  appendRule($ruleElem, initialLoad) {
    initialLoad ??= false;
    return this.$container.append($ruleElem);
  }

  // ###### @appendAllRules()
  // to a RuleSet
  appendAllRules() {
    for (let index = 0; index < this.rules.length; index++) {
      var rule = this.rules[index];
      this.appendRule(rule.render());
    }

    return true;
  }

  // ###### @doSearchAndFilter()
  doSearchAndFilter() {
    const query = $('#sidebar-search-box').val().toLowerCase();
    let disableDragging = false;

    // First, establish whether we should enable or disable sorting.
    let rulesMatched = 0;

    // only find within this RuleSet
    this.$container.find('.card-global-rule-li').each(function (index, element) {
      let ruleMatches = false;
      $(element).show();
      const titleElem = $(element).find('.rule-name');
      let titleVal = $(titleElem).html();
      //titleVal = $(titleElem).html().toLowerCase()
      if (titleVal !== undefined) {
        titleVal = titleVal.toLowerCase();
        if (titleVal.indexOf(query) !== -1) {
          ruleMatches = true;
          rulesMatched++;
        }

        if (ruleMatches) {
          $(element).removeClass('no-match');
          return $(element).show();
        } else {
          $(element).addClass('no-match');
          $(element).hide();
          return (disableDragging = true);
        }
      }
    });

    if (disableDragging) {
      this.event_rules.searchWarning();
      this.disable_sortable();
    } else {
      this.enable_sortable();
    }

    return rulesMatched;
  }

  // ###### @enable_sortable()
  enable_sortable() {
    const self = this;
    const $rule_set = $(`#${this.euid}`);
    //$(".button-grab").removeClass("button-grab-disabled")
    //$(".button-grab").css("opacity", 1.0)
    $('.card-global-rule .title').css('cursor', 'move');

    // Check if sortable has already been setup here
    if ($rule_set.hasClass('ui-sortable')) {
      return $rule_set.sortable('enable');
    }

    const mygroup = this.group;
    // Setup the sortables
    return $rule_set.sortable({
      placeholder: 'card-global-rule-placeholder',
      handle: '.title',
      cancel: '.rule-name, .rule-name-uuid-short, .rule-name-uuid-tally, .button-edit, .button-collapse, input',
      axis: 'y',
      start(event, ui) {
        return (ui.item.start_position = ui.item.index());
      },
      stop(event, ui) {
        const msg = {
          old_position: ui.item.start_position,
          new_position: ui.item.index(),
        };
        const options = { group: self.group };
        // self.event_rules.socketio_Async 'event_rules::rule::move', msg, options, (err, res) ->
        return self.event_rules
          .socketio_Async('event_rules::rule::move', msg, options)
          .then(function (res) {
            self.logger('rule moved', res);
            return self.refresh_Async();
          })
          .catch(error => Message.error('Failed to reorder message', error));
      },
      // refresh_Async?
    });
  }

  // ###### @disable_sortable()
  //
  disable_sortable() {
    //$(".button-grab").addClass "button-grab-disabled"
    //$(".button-grab").css "opacity", 0.5
    const $rule_set = $(`.${this.dom_name}`);
    if ($rule_set.hasClass('ui-sortable')) {
      $rule_set.sortable('disable');
    }
    return $('.card-global-rule .title').css('cursor', 'pointer');
  }

  // Check if any of the rules are in a edit state
  currently_editing() {
    // Check for a new dom rule
    this.logger('looking for', `.${Rule.dom_class}[data-editing=\"true\"]`);
    const $dom_editing = this.container_check(`.${Rule.dom_class}[data-editing=\"true\"]`);
    if ($dom_editing) {
      this.logger('dom rule is editing', $dom_editing);
      return true;
    }

    // Check the current rules
    for (var rule of this.rules) {
      if (rule.is_new() || rule.isEditMode()) {
        this.logger('rule %s is editing [%s] [%s]', rule.name, rule.is_new(), rule.isEditMode());
        return true;
      }
    }

    return false;
  }

  // ###### @createNewRule(

  // Creates a new blank rule in the dom to be edited and
  // then submitted to the server rule_set
  // TODO FIXME maybe this should be appended to the rule_set array
  //            then render called on the array like norml??
  createNewRule() {
    if (this.currently_editing()) {
      return Message.label(
        'Pending edits...',
        'Please complete or cancel other rule edits before creating a new rule',
        {}
      );
    }

    const new_index = this.getNextRuleId();
    const rule = Rule.generate(
      { _initial: true },
      {
        index: new_index,
        rule_set: this,
        event_rules: this.event_rules,
        new: true,
        render: true,
        group: this.group,
      }
    );

    this.disable_sortable();
    this.appendRule(rule.$container);

    rule.enable_editing();
    rule.expand_entry();
    rule.new = true;
    return rule;
  }

  // ###### @deleteRule( rule_Rule )
  delete_rule(rule, reason) {
    const self = this;

    const index = this.rules.indexOf(rule);
    if (!(index > -1)) {
      throw new Error(`No local rule to delete [${rule.name}]`);
    }

    const delete_msg = {
      index,
      reason,
      hash: rule.loaded_hash,
    };

    const options = {};
    if (self.group !== undefined) {
      options.group = self.group;
    }
    self.logger('delete. group options', options, self.group);

    return this.event_rules
      .socketio_Async('event_rules::rule::delete', delete_msg, options)
      .then(function (data) {
        $('#modal-delete-confirm').modal('hide');

        Message.label('Deleted Rule', `Successfully deleted rule '${rule.name}'!`);

        return self.refresh_Async();
      })
      .then(function (res) {
        //rule.remove()
        //self.render()
        self.collapse_all();
        return true;
      })
      .catch(error => Message.exception('Failed to Delete Rule', error));
  }
}
RuleSet.initClass();

class RuleSetGroupSelect extends RuleSet {
  static initClass() {
    this.dom_name = 'rule-set';
    this.dom_data_id = 'rule_set';
    //@dom_selector = '.' + @dom_class

    this.template_blank = true;

    // Rules live in an <li> so they are sortable. Rendered deals with this.
    this.container_el = 'ul';
  }
}
RuleSetGroupSelect.initClass();

window.RuleSet = RuleSet;
window.RuleSetGroupSelect = RuleSetGroupSelect;
