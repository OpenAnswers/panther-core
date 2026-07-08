// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Rule

// A JS and DOM instance of a Rule.
// Many make up a RuleSet.

// Extends Rendered for a lot of the standard rendere/template stuff.

// GroupRule is down the bottom

// ## Class Rule

class Rule extends Rendered {
  static initClass() {
    this.logger = debug('oa:event:rules:rule');

    // #### `Rendered` options
    this.dom_name = 'rule';
    this.dom_data_id = 'rule';
    this.dom_class = 'card-global-rule-li';
    this.dom_selector = '.' + this.dom_class;
    this.template_id = '#template-rule';
    this.template_html = $(this.template_id).html();

    // Rules live in an `<li>` so they are sortable. Rendered deals with this.
    this.container_el = 'li';
  }

  // ###### @generate( yaml_def, options_object )
  static generate(yaml_obj, options) {
    options ??= {};
    this.logger('generating', yaml_obj, options);
    options.yaml = yaml_obj;
    return new this(options.index, options);
  }

  // ###### `new Rule( rule_index_integer, options_object )`
  constructor(index, options) {
    options ??= {};
    super();
    this.index = index;
    this.logger = this.constructor.logger;

    // - `@index` the array index of the rule

    // - `@index_friendly` the human index
    if (parseInt(this.index) !== this.index) {
      throw new Error(`new Rule requires an integer index [${this.index}]`);
    }
    this.index_friendly = this.index + 1;

    // - `@group` Some rules have groups
    this.group = options.group != null ? options.group : undefined;

    // - `@rule_set` Store a reference to the RuleSet we are in
    this.rule_set = options.rule_set || { type: '_none' };
    if (!this.rule_set) {
      debug('warning, rule has no rule_set');
    }

    // - `@event_rules` store a reference to the overall EventRules we are in
    this.event_rules = options.event_rules || this.rule_set?.event_rules || { type: '_none' };
    if (!this.event_rules) {
      debug('warning, rule has no event_rules');
    }

    // - `@name` The name of the rule.
    this.name = options.name || '';

    // - `@uuid` The UUID for the rule
    this.uuid = options.uuid || '';

    // - `@animation` flag for enableing/disabling animation
    this.animation = !!options.animation;

    this.logger('@rule_set', this.rule_set, '@event_rules', this.event_rules);

    // - `@type` is for event_rules to identify us as server or agent
    this.type = options.type || this.rule_set.type || this.event_rules.type || '_none';

    // - `@sub_type` is for event_rules to identify us
    this.sub_type = options.sub_type || this.rule_set.sub_type || this.event_rules.sub_type || '_none';

    // - `@new` flag, for the create new rule interface
    this.new = options.new || false;
    this.disabled = options.disabled || false;

    // - `@yaml` the yaml object we are building from
    this.yaml =
      options.yaml ||
      (() => {
        throw new Error('no yaml');
      })();
    this.build_from_yaml();

    this.rendered_init(options);
  }

  // ###### @build_from_yaml( yaml_def )
  // Takes the yaml and turns it into object
  build_from_yaml(yaml_def) {
    yaml_def ??= this.yaml;
    this.name = yaml_def.name;
    this.uuid = yaml_def.uuid;
    if (this.uuid) {
      this.uuid_short = _.head(this.uuid.split('-'));
      this.uuid_tally = _.get(Data.ruleMatches, this.uuid, 0);
    }
    this.selects = Selects.generate(yaml_def, { rule: this });
    this.actions = Actions.generate(yaml_def, { rule: this });
    this.options = Options.generate(yaml_def, { rule: this });
    return this.logger('Options list is now set to', this.options);
  }

  // ###### @render_custom( options )
  // Renderer custom function. Called in the middle of render so it
  // can happen after the html is blanked and before `handlers` are run
  render_custom(options) {
    options ??= {};
    this.selects.set_container(this.$container.find('.selects'));
    this.selects.render();

    this.actions.set_container(this.$container.find('.actions'));
    this.actions.render();

    this.$tags_element = this.$container.find('.metadata-tags');
    //@actions.$tags_element = @.$tags_element
    this.$tags_element.append(this.actions.render_tag_html());

    this.$container.tooltip({
      tooltipClass: 'ui-tooltip-arrow-bottom',
      position: {
        my: 'center-10px',
        at: 'bottom-55px',
      },
      show: {
        delay: 500,
      },
    });

    if (this.is_new()) {
      this.$container.find('.card-global-rule').addClass('card-global-rule-new');
      this.$container.find('.selector-select-add, .selector-action-add').removeClass('collapse');
    }

    if (this.is_disabled()) {
      return this.$container.find('.card-global-rule').addClass('card-global-rule-disabled');
    }
  }

  // ###### @is_new()
  // New flag for rules that are created in the dom but not saved
  is_new() {
    return this.new;
  }

  // ###### @is_disabled( options )
  // disabled rules have the `skip` verb. They are covered in the UI
  is_disabled() {
    return this.disabled;
  }

  // ###### @initial_handlers( options )
  // initial_handlers are setup once, when the rule object is created and
  // rendered for the first time. You can also use initial_handlers if you
  // listen on a parent object for the bubbled event.
  initial_handlers(options) {
    options ??= {};
    super.initial_handlers(options);
    const self = this;

    // Add a new verb is in Rule, due to the link being rendered here
    // Change and Delete are in RuleSet
    this.$container.on('click.select-add', '.select-add', function (ev) {
      let verb;
      self.logger('click add');
      return (verb = self.selects.generate_verb());
    });

    this.$container.on('click.action-add', '.action-add', function (ev) {
      let verb;
      self.logger('click add');
      return (verb = self.actions.generate_verb());
    });

    return this.handler_context_menu();
  }

  handler_context_menu() {
    const timer = Timer.start();
    const $menu = $('#context-rule');
    const $menuList = $menu.find('ul.dropdown-menu');

    this.$container.off('contextmenu.rule').on('contextmenu.rule', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const rule = Rule.closest_check($(e.target));
      if (!rule) {
        return;
      }

      // Clear any open menu state before showing afresh
      $menuList.hide();
      $(document).off('click.rule-ctx keydown.rule-ctx contextmenu.rule-ctx');

      // Remember which rule was right-clicked so the menu-item click handler
      // can act on it (the old plugin passed the original target into onItem).
      $menu.data('rule', rule);

      // Update labels (the "before" hook in the old plugin)
      $menuList.find('#context-rule-edit a').html(rule.isEditMode() ? 'Stop Editing' : 'Edit');
      $menuList.find('#context-rule-disable a').html(rule.isDisabled() ? 'Enable' : 'Disable');

      // Position and show
      $menu.css({ position: 'absolute', left: e.pageX, top: e.pageY, zIndex: 1050 });
      $menuList.show();

      // Close on outside click or Escape
      const close = function () {
        $menuList.hide();
        $(document).off('click.rule-ctx keydown.rule-ctx contextmenu.rule-ctx');
      };
      setTimeout(function () {
        $(document).on('click.rule-ctx contextmenu.rule-ctx', close);
        $(document).on('keydown.rule-ctx', function (ev) {
          if (ev.key === 'Escape') {
            close();
          }
        });
      }, 0);
    });

    // Menu item clicks — delegated, rebound idempotently as each rule initialises
    $menuList.off('click.rule-ctx-item').on('click.rule-ctx-item', 'li', function () {
      const rule = $menu.data('rule');
      switch (this.id) {
        case 'context-rule-edit':
          if (rule) {
            rule.toggle_editing();
          }
          break;
        case 'context-rule-delete':
          // Reuse the in-rule Delete button flow, which opens the
          // delete-reason modal when gitEnabled.
          if (rule) {
            rule.$container.find('.edit-warning .button-delete').trigger('click.delete');
          }
          break;
        case 'context-rule-group':
          $('#modal-move-to-group').modal();
          break;
        case 'context-rule-disable':
          Message.warn(rule && rule.isDisabled() ? 'Enable toggle not implemented' : 'Disable toggle not implemented');
          break;
      }
      $menuList.hide();
    });

    return this.logger('Bound context menu in %s ms', timer.end());
  }

  // ###### @handlers( options )
  // handlers are run every time the page is rendered. To attach to the new
  // elements. You can also use initial_handlers if you listen on a parent
  // object for the bubbled event.
  handlers(options) {
    options ??= {};
    super.handlers(options);
    const self = this;

    this.$container.off('click.save').on('click.save', '.edit-warning .button-update', function () {
      self.logger('Rule update button clicked');
      return self.save_edits();
    });

    this.$container
      .find('.edit-warning .button-cancel')
      .off('click.cancel')
      .on('click.cancel', ev => self.disable_editing());

    this.$container
      .find('.edit-warning .button-delete')
      .off('click.delete')
      .on('click.delete', function (ev) {
        self.logger('delete button clicked', ev);

        const modal = $('#modal-delete-rule');

        if (gitEnabled) {
          modal.find('#rule-name').text(self.name);

          // Reset reason input
          modal.find('#rule-delete-reason').val('');
          modal.find('#rule-delete-reason').attr('style', '');
          modal.find('#rule-delete-reason').attr('placeholder', 'Delete Reason');

          modal.find('#rule-delete-confirm').off('click');
          modal.find('#rule-delete-confirm').on('click', function () {
            if (modal.find('#rule-delete-reason').val().length < 1) {
              modal.find('#rule-delete-reason').attr('style', 'border-color: red !important');
              return modal.find('#rule-delete-reason').attr('placeholder', 'Please enter a reason!');
            } else {
              modal.modal('hide');
              return self.rule_set.delete_rule(self, modal.find('#rule-delete-reason').val());
            }
          });

          return modal.modal('show');
        } else {
          return self.rule_set.delete_rule(self, $('#rule-delete-reason').val());
        }
      });

    this.$container.off('click.edit').on('click.edit', '.button-edit', function (ev) {
      self.logger('edit button clicked', ev);
      return self.toggle_editing();
    });

    return this.$container
      .find('.collapse-toggle')
      .off('click')
      .on('click', event => self.toggleCollapse());
  }

  // ###### @cancel_edits()
  // Cancel rule edit handler, changes the state of the UI
  // and does a data refresh to reset everything
  cancel_edits() {
    const timer_warn = Timer.start();
    this.logger('cancel_edits - Rule editing cancelled');
    this.build_from_yaml();
    this.render();
    return this.logger('cancel_edits - rule edit finally in %s ms', timer_warn.end());
  }

  // ###### @save_edits()
  // Save edit handler. Promise to send it to the server.
  save_edits() {
    const self = this;
    return this.update_Async()
      .then(result => self.refresh_Async())
      .then(result => Message.label('Rule OK', 'Your updates have been pushed to the server. You can deploy them now'))
      .catch({ name: 'DomError' }, function (error) {
        UI.showErrorDialog('Failed to update your rule', error.to_html());
        return error.highlight_elements();
      })
      .catch(function (error) {
        console.error('save_edits Failed updating rule', error, error.stack);
        const message = error.domerrors ? error.domerrors.to_html() : error.message;
        UI.showErrorDialog('Failed to update your rule', `${error}`);
        return self.setLoadingCoverFailed();
      });
  }

  // ###### @validate()
  // Validate to dom fields before doing anything.
  // Will attach a DomErrorSet with $element refs to issues
  // for highlighting
  validate(options) {
    options ??= {};
    const errors = options.errors || new DomErrorSet();
    this.actions.validate({ errors });
    this.selects.validate({ errors });
    this.options.validate({ errors });
    if (!_.isString(this.name) || !(this.name.length > 0)) {
      errors.add_new_error('Your rule must have a name', { $element: this.$container });
    }
    return errors;
  }

  // ###### @set_container( $jQueryElement )
  // Set_container is provided by Rendered so this add the edit enabling
  // on top of the standard stuff
  // Note the element must be an `<li>`s for sortable support!!
  set_container($ele) {
    super.set_container($ele);
    if (this.isEditMode()) {
      this.enable_editing();
    }
    return this.$container;
  }

  // ###### @set_container()
  // Run every time the container is setup. From `Rendered`
  set_container_data() {
    super.set_container_data();
    this.$container.attr('data-id', this.index).attr('data-new', this.new);
    return this;
  }

  // ###### @remove()
  // Remove an element from the dom.
  // Note it does nothing to the parent RuleSet.
  // Deletions should come up from there
  remove() {
    return this.$container.remove();
  }

  //
  delete_from_ruleset() {
    return this.rule_set.delete_rule(this);
  }

  // ###### @container()
  // Return the rule dom element for this rule
  container() {
    return this.$container;
  }

  // ###### @getRuleLiElement()
  // Return the rule dom element for this rule
  getRuleLiElement() {
    return this.$container;
  }

  // ###### @getRuleName()
  getRuleName() {
    return this.yaml.name;
  }

  // ###### @createSocketMsg( obj )
  // Create a typed socketio message for this rule
  createSocketMsg(data) {
    let message;
    return (message = {
      type: this.type,
      sub_type: this.sub_type,
      data,
    });
  }

  // ###### @updateAsync( collapse<Boolean> )
  // Trigger an update message to the server for a rule save
  update_Async(yaml_obj) {
    const self = this;
    return new Promise(function (resolve, reject) {
      const errors = new DomErrorSet();
      const yaml = self.dom_to_yaml_obj({ errors });
      if (!errors.ok()) {
        if (self.is_new()) {
          UI.showErrorDialog('Failed to Create Rule!', errors.to_html());
          return reject(errors.to_string());
        } else {
          UI.showErrorDialog('Failed to Update Rule!', errors.to_html());
          return reject(errors.to_string());
        }
      }

      const msg = {
        index: self.index, // FIXME this index can be incorrect
        rule: yaml,
      };

      const options = {};
      if (self.group !== undefined) {
        options.group = self.group;
      }
      self.logger('group options', options, self.group);
      self.toggleLoadingCover();

      if (self.is_new()) {
        return self.event_rules
          .socketio_Async('event_rules::rule::create', msg, options)
          .then(function (result) {
            self.new = true;
            self.yaml = result.data;
            self.build_from_yaml();
            self.render();
            return resolve(result);
          })
          .catch(error => reject(error));
      } else {
        return self.event_rules
          .socketio_Async('event_rules::rule::update', msg, options)
          .then(function (result) {
            self.new = false;
            self.disable_editing();
            self.yaml = result.data;
            self.build_from_yaml();
            self.render();
            return resolve(result);
          })
          .catch(error => reject(error));
      }
    });
  }

  // ###### @refresh_Async( collapse<Boolean> )
  // Trigger refresh up the chain until the data source is
  // refreshed. Single Rules can't be refreshed on their own
  // at the moment
  refresh_Async(collapse) {
    collapse ??= false;
    const self = this;
    return this.rule_set.refresh_Async().then(function (results) {
      self.render();
      if (collapse) {
        self.collapse_entry();
      } else {
        self.expand_entry();
      }
      if (!self.isEditMode()) {
        self.disable_editing();
        self.selects.disable_editing();
        self.actions.disable_editing();
      }
      return results;
    });
  }

  // ###### @dom_to_properties()
  // Retrive the dom elements and store them in this rule instance
  dom_to_properties(options) {
    options ??= {};
    this.name = this.$container.find('.rule-name-edit input').val();
    const errors = this.validate(options);
    errors.check_throw();
    return true;
  }

  // ###### @dom_to_yaml_obj( options )
  // This would normally take the dom into properties
  // Then call `to_yaml_obj`. But Rule is a bit special for the moment
  dom_to_yaml_obj(options) {
    options ??= {};
    this.dom_to_properties(options);
    const rule_yaml = {};

    rule_yaml.name = this.name;
    _.merge(rule_yaml, this.actions.dom_to_yaml_obj(options));
    _.merge(rule_yaml, this.selects.dom_to_yaml_obj(options));
    _.merge(rule_yaml, this.options.dom_to_yaml_obj(options));

    this.logger('dom_to_yaml_obj created: ', rule_yaml);
    return rule_yaml;
  }

  // ###### @to_yaml_obj()
  // Yaml serialisation of the Rule. Supports hash generation which
  // is not sent to file. Its for client checking
  to_yaml_obj(options) {
    const rule_yaml = {};

    rule_yaml.name = this.name;
    _.merge(rule_yaml, this.actions.to_yaml_obj());
    _.merge(rule_yaml, this.selects.to_yaml_obj());
    _.merge(rule_yaml, this.options.to_yaml_obj());

    this.logger('to_yaml_obj created: ', rule_yaml);
    return rule_yaml;
  }

  // ###### @toggle_editing()
  // This method will toggle the editing mode of the rule card
  // at the specified index.
  toggle_editing() {
    this.logger('toggle_editing edit_mode', this.edit_mode);
    if (this.isEditMode()) {
      return this.disable_editing();
    } else {
      return this.enable_editing();
    }
  }

  // ###### @isEditMode()
  // This method will return whether the rule is currently in edit mode.
  isEditMode() {
    return this.edit_mode;
  }

  // ###### @enable_editing()
  // This method will enable the editing mode of a rule.
  enable_editing() {
    const timer = Timer.start();

    // Make sure the rule is in expanded mode
    this.expand_entry();

    // Set the data value 'is-editing' to true so other methods can check it
    this.edit_mode = true;
    this.$container.attr('data-editing', true);

    // Hide the metadata so we can show the title edit box
    this.$container.find('.metadata-container').hide();

    if (this.rule_set && this.rule_set.disable_sortable) {
      this.rule_set.disable_sortable();
    }

    // bs_fade_collapse($el)
    // bs_uncollapse_fadein($el)

    // Hide the title and replace it with the editable version
    if (this.animation) {
      this.$container.find('.rule-name').fadeOut('fast', function () {
        return this.$container.find('.rule-name-edit').fadeIn('fast', function () {});
      });
      this.$container.find('.edit-warning').animate({ height: 'show', opacity: 'show' }, 'fast');
      const $els = this.$container.find('.select-action-add, .select-select-add');
      Helpers.bs_uncollapse_fadein($els);
    } else {
      this.$container.find('.rule-name').addClass('hidden');
      this.$container
        .find('.rule-name-edit, .edit-warning, .select-select-add, .select-action-add')
        .removeClass('collapse');
    }

    // Change the edit button colour
    this.$container.find('.button-edit').addClass('button-edit-active');
    this.$container.find('.button-edit').removeClass('button-edit-normal');

    this.selects.enable_editing();
    this.actions.enable_editing();

    this.$container.find('.selector-select-add, .selector-action-add').removeClass('collapse');

    const elapsed = timer.end();
    return this.logger(`enable_editing() Enabled editing on rule in %c${elapsed}ms`, 'font-weight: bold');
  }

  // ###### @disable_editing( collapsed<Boolean> )
  // This method will disable the editing mode of a rule.
  // It is significantly shorter than the method to enable editing,
  // as the rule simply is re-rendered from the template completely after
  // fetching fresh rule data, to ensure the rule remains up to date and no
  // un-saved user changes are left.
  disable_editing(collapsed) {
    collapsed ??= false;
    const self = this;
    const timer = Timer.start();

    this.cancel_edits();

    this.edit_mode = false;
    this.$container.attr('data-editing', false);

    this.$container.find('.rule-name').removeClass('hidden');
    this.$container.find('.rule-name-edit').addClass('collapse');
    this.$container.find('.edit-warning').addClass('collapse');

    this.selects.disable_editing();
    this.actions.disable_editing();

    this.$container.find('.selector-select-add, .selector-action-add').addClass('collapse');

    if (this.isNew()) {
      this.$container.closest('.card-global-rule-li').remove();
      this.logger('new element removed on edit disable');
      return;
    }

    if (this.rule_set && this.rule_set.enable_sortable) {
      return this.rule_set.enable_sortable();
    }
  }

  enable_rule_save() {
    return this.disable_rule_save(false);
  }

  disable_rule_save(disabled_opt) {
    disabled_opt ??= true;
    const $save_button = this.$container.find('.button-update');
    return $save_button.attr('disabled', disabled_opt);
  }

  // ###### @isNew()
  // Returns the new flag, set when a rule is generated in the UI
  isNew() {
    return !!this.new;
  }

  // ###### @isDisabled()
  // This method checks if the rule specified is disabled.
  isDisabled() {
    return this.$container.hasClass('card-global-rule-disabled');
  }

  // ###### @setLoadingCoverSuccess()
  // When a rule update succeeds
  setLoadingCoverSuccess() {
    const $coverText = this.$container.find('.cover-text');

    $coverText.find('.spinner').css('background-color', '#A6D785');
    $coverText.find('p').html('Saved!');

    const self = this;
    return Helpers.delay(1500, function () {
      self.toggleLoadingCover();
      return self.refresh_Async();
    });
  }

  // ###### @setLoadingCoverFailed()
  // When a rule update fails
  setLoadingCoverFailed() {
    const $coverText = this.$container.find('.cover-text');

    $coverText.find('.spinner').css('background-color', '#A6D785');
    $coverText.find('p').html('Failed!');

    const self = this;
    return Helpers.delay(3000, () => self.toggleLoadingCover());
  }

  // ###### @toggleLoadingCover()
  toggleLoadingCover() {
    this.$container.find('.cover').fadeToggle('fast');
    return this.$container.find('.cover-text').fadeToggle('fast');
  }

  // ###### @toggleCollapse()
  toggleCollapse() {
    const $toggle = this.$container.find('.collapse-toggle');
    if ($toggle.hasClass('glyphicon-triangle-bottom')) {
      this.logger('toggle collapse');
      return this.expand_entry();
    } else if ($toggle.hasClass('glyphicon-triangle-top')) {
      this.logger('toggle expand');
      return this.collapse_entry();
    } else {
      throw new Error('Unkown toggle state');
    }
  }

  // ###### @expand_entry()
  expand_entry() {
    const $innerElem = this.$container.find('.inner');
    const $arrowElem = this.$container.find('.collapse-toggle');
    //$contentElem = $(innerElem).find ".content"
    //metadataTagElem = entryElem.find(".metadata-tags")
    //metadataAuthorElem = entryElem.find(".metadata-author")

    this.logger('expand', $arrowElem, $innerElem);
    $arrowElem.removeClass('glyphicon-triangle-bottom');
    $arrowElem.addClass('glyphicon-triangle-top');
    if (this.animation) {
      $innerElem.slideDown('fast');
      //$(metadataTagElem).fadeOut "fast", ->
      //$(metadataAuthorElem).fadeIn "fast", ->
    } else {
      $innerElem.show();
    }

    //$(metadataTagElem).hide()
    //$(metadataAuthorElem).show()
    this.$container.find('.select-select-add, .select-action-add').removeClass('collapse');

    if (this.isNew()) {
      return this.$container.find('button.button-delete').addClass('collapse');
    }
  }

  // ###### @collapse_entry()
  collapse_entry() {
    // TODO: Replace add a Bootstrap notification/dialog
    if (this.isEditMode()) {
      this.disable_editing();
    }

    const $innerElem = this.$container.find('.inner');
    const $arrowElem = this.$container.find('.collapse-toggle');
    //contentElem = $(innerElem).find ".content"
    //metadataTagElem = entryElem.find(".metadata-tags")
    // metadataAuthorElem = entryElem.find(".metadata-author")

    this.logger('collapse', this.name, $arrowElem);
    $arrowElem.removeClass('glyphicon-triangle-top');
    $arrowElem.addClass('glyphicon-triangle-bottom');

    if (this.animation) {
      $innerElem.slideUp('fast');
      //$(metadataAuthorElem).fadeOut "fast", ->
      //$(metadataTagElem).fadeIn "fast"
    } else {
      $innerElem.hide();
    }
    //$(metadataAuthorElem).hide()
    //$(metadataTagElem).show()
    return this.$container.find('.select-action-add, .select-select-add').addClass('collapse');
  }

  // ###### @updateOrderNumber( index )
  // move this into Rule
  updateOrderNumber(index) {
    const ruleIndex = this.getRuleElement();
    const cardElem = $(element).find('.card-global-rule');
    cardElem.data('id', index);
    cardElem.attr('data-id', index);
    $(this).attr('data-id', index);
    const orderNo = $(element).find('.card-global-rule-orderno p');
    orderNo.html(index + 1);
    return $(element)
      .find('.selector-entry, .action-entry')
      .each(function (index, element) {
        $(element).data('rule-id', ruleIndex);
        return $(element).attr('data-rule-id', ruleIndex);
      });
  }
}
Rule.initClass();

// ------------------------------------------
// ## Class RuleGroup

// An instance of a Rule for groups
class RuleGroup extends Rule {
  static initClass() {
    this.dom_name = 'rule';
    this.dom_data_id = 'rule';
    this.dom_class = 'card-global-rule-li';
    this.dom_selector = '.' + this.dom_class;

    this.template_id = '#template-rule';
    this.template_html = $(this.template_id).html();
    this.container_el = 'li';
  }

  constructor(index, options) {
    super(index, options);
    this.index = index;
    this.group =
      options.group ||
      (() => {
        throw new Error('No group');
      })();
  }
}
RuleGroup.initClass();

// ------------------------------------------
// ## Class RuleGroupSelect

// An instance of a Rule used for a group select.
// Doesn't have configurable actions
class RuleGroupSelect extends Rule {
  static initClass() {
    this.dom_name = 'group-rule-select';
    this.dom_data_id = 'rule';
    this.dom_class = 'card-global-rule-li';
    this.dom_selector = '.' + this.dom_class;

    this.template_id = '#template-group-rule-select';
    this.template_html = $(this.template_id).html();
    this.container_el = 'li';
  }

  constructor(index, options) {
    super(index, options);
    this.index = index;
    this.group = options.group;
  }

  // ###### @refresh_Async( collapse<Boolean> )
  // We don't have a rule set in the group so duplicate refresh_Async
  // Should probably move the selects into their own ruleset. Then
  // there could also be multiple rules
  refresh_Async(collapse) {
    collapse ??= false;
    const self = this;
    const { index } = this;
    return self.event_rules.refresh_Async().then(function (results) {
      self.event_rules.render();
      if (collapse) {
        self.collapse_entry();
      } else {
        self.expand_entry();
      }
      if (!self.isEditMode()) {
        //self.$container.find('.selector-select-add,.selector-action-add')
        //.addClass('collapse')
        self.disable_editing();
        self.selects.disable_editing();
        self.actions.disable_editing();
      }
      return results;
    });
  }

  // ###### @updateAsync( collapse<Boolean> )
  // Trigger an update message to the server for a group rule.
  // This overrides the default `update_Async` for the gorup specifics
  update_Async(yaml_obj) {
    const self = this;
    return new Promise(function (resolve, reject) {
      const errors = new DomErrorSet();
      const yaml = self.dom_to_yaml_obj({ errors });
      if (!errors.ok()) {
        UI.showErrorDialog('Failed to Update Rule!', errors.to_html());
        return reject(errors.to_string());
      }

      const msg = {
        index: self.index,
        rule: yaml,
      };

      const options = {};
      if (self.group !== undefined) {
        options.group = self.group;
      }
      self.logger('group options', options, self.group);
      self.toggleLoadingCover();

      return self.event_rules
        .socketio_Async('event_rules::group::update_select', msg, options)
        .timeout(20000)
        .then(function (result) {
          self.new = false;
          self.disable_editing();
          return resolve(result);
        })
        .catch(error => reject(error));
    });
  }
}
RuleGroupSelect.initClass();

window.Rule = Rule;
window.RuleGroup = RuleGroup;
window.RuleGroupSelect = RuleGroupSelect;
