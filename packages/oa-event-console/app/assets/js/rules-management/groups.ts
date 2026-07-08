// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Groups

// For storing many Group of rules

// Group rules are a little bit special as the RuleSet
// is housed in a group instead of directly in EventRules
// This means Group needs to implement a number of EventRulesy
// things. And they need to be treated a little bit special
// in some places

// --------------------------------------
// ## Class Groups

// Groups is the collection of Group
class Groups extends Rendered {
  static initClass() {
    this.logger = debug('oa:event:rules:groups');

    this.dom_class = 'rule-groups';
    this.dom_name = 'rule-groups';
    //  @template_id = '#template-groups'

    this.container_el = 'ul';
  }

  //  @template_setup()

  // Generate an instance from the yaml model
  static generate(yaml_def, options) {
    options ??= {};
    this.logger('generating', yaml_def, options);

    options.yaml = yaml_def;
    return new this(options);
  }

  // Create a store for Group
  constructor(options) {
    options ??= {};
    super();
    this.logger = this.constructor.logger;
    this.store = {};
    this.store_order = [];
    this.template_none = true;
    this.event_rules = options.event_rules;
    this.yaml = options.yaml;
    if (this.yaml) {
      this.build_from_yaml();
    }
    // Set the standard Rendered element
    this.rendered_init(options);
    this.logger('new Groups created', this.store);
  }

  build_from_yaml(yaml) {
    // Deal with the possible store `_order` first
    if (yaml == null) {
      ({ yaml } = this);
    }
    this.store_order = (() => {
      if (!_.isArray(yaml._order)) {
        console.error('No _order array in groups yaml, defaulting to keys');
        return _.remove(_.keys(yaml), '_order');
      } else {
        return yaml._order;
      }
    })();

    // Then build the groups
    for (var name of this.store_order) {
      if (!yaml[name]) {
        throw new Error('Group in _order is not in groups');
      }

      var options = {
        name,
        groups: this,
        event_rules: this.event_rules,
      };
      this.logger('Generating group with group options', options);
      this.add(name, Group.generate(this.yaml[name], options));
    }

    return true;
  }

  count() {
    return _.keys(this.store).length;
  }

  add(name, group) {
    this.logger('groups', this.store);
    return (this.store[name] = group);
  }

  del(name) {
    get_group(name);
    return delete this.store[name];
  }

  get_group(name) {
    if (!this.store[name]) {
      throw new Errors.ValidationError(`No group [${this.store}]`);
    }
    return this.store[name];
  }

  // Create a new dom group element for later saving to the mode
  // This will disppear on `render()` unless saved
  create_new_group(options) {
    options ??= {};
    const group = new Group({
      event_rules: this.event_rules,
      groups: this,
      name: options.name,
      new: true,
    });
    this.$container.append(group.render());
    group.enable_editmode();
    return group.disable_delete();
  }

  // Run a function for every group
  // Passes in the `group` object and `index`
  each_group(fn) {
    return this.store_order.map((group, i) => fn(this.store[group], i));
  }

  collapse_all(flag) {
    return this.each_group(group => group.collapse_all());
  }

  // No template here
  render_custom(options) {
    options ??= {};
    const groups = (() => {
      const result = [];
      for (var group_name of this.store_order) {
        this.logger('render() group', this.store[group_name].name);
        result.push(this.store[group_name].render());
      }
      return result;
    })();

    return this.$container.append(groups);
  }

  initial_handlers() {
    super.initial_handlers();
    const self = this;

    return $(document).on('click', '.btn-rules-group-create-group', function (ev) {
      self.logger('click .btn-rules-group-create-group');
      self.create_new_group();
      return window.scrollTo(0, document.body.scrollHeight);
    });
  }

  enable_extra_sortable() {
    const $groups = $(`#${this.euid}`);
    const self = this;

    //    $groups.sortable "enable"
    return $groups.sortable({
      placeholder: 'card-global-group-placeholder',
      handle: '.title',
      axis: 'y',
      start(event, ui) {
        self.logger('START');
        return (ui.item.start_position = ui.item.index());
      },
      stop(event, ui) {
        const msg = {
          old_position: ui.item.start_position,
          new_position: ui.item.index(),
        };
        self.logger('STOP', msg);
        return self.event_rules
          .socketio_Async('event_rules::group::move', msg, {})
          .then(res => self.logger('group moved', res))
          .catch(error => Message.error('Failed to reorder groups', error));
      },
    });
  }

  // ###### @enable_sortable()
  enable_sortable() {
    //@.$container.sortable "enable"
    return this.store_order.map(group => this.store[group].enable_sortable());
  }

  // ###### @disable_sortable()
  disable_sortable() {
    return this.store_order.map(group => this.store[group].disable_sortable());
  }
}
Groups.initClass();

window.Groups = Groups;
