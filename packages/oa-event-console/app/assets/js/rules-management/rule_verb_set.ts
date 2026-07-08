// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # RuleVerbSet

// Configure and hold a set of RuleVerbs
class RuleVerbSet extends Rendered {
  static initClass() {
    this.verb_type = '_verbtype_';

    // Id of the verb type to override
    this.id = 'Type';

    // What RuleVerbBase class we are a set of?
    this.verb_class = RuleVerbBase;

    // What RuleVerbTypes class should be use to lookup
    this.verb_lookup_class = RuleVerbTypes;

    // Dom properties to apply
    this.dom_class = 'verb-entry';
    this.dom_name = 'verb_set';
    this.dom_data_id = 'verb_set';

    // Debug logger to override
    this.logger = debug('oa:event:rules:rule_verb_set');
  }

  // Expect we have a correct class type
  static expect_class_type(obj, type) {
    type ??= this.verb_class;
    if (!(obj instanceof type)) {
      throw new Error(`Object ${typeof obj} is not of type ${type.name}`);
    }
  }

  // Check we have the local class type
  static check_class_type(obj) {
    return obj instanceof this.verb_class;
  }

  // Generate all the types in the yaml defintion
  // Stores all the instance in an array
  // Has to deal with arrays of instances as well
  static generate(yaml_def, options) {
    options ??= {};
    const verbs_in_def = this.verb_lookup_class.find_types_in(yaml_def);

    const verb_set = new this(options);
    this.logger('options are', options);
    const verb_options = _.omit(options, '$container');
    this.logger('options are now', options);
    // Render a view warning that no rules exist and the add/edit
    // interface only.
    if (verbs_in_def.length === 0) {
      if (this.verb_type !== 'option') {
        console.error(`No ${this.verb_type} verbs in yaml_def`, yaml_def);
      }
      return verb_set;
    }

    // Now process the verbs
    for (var verb_name of verbs_in_def) {
      this.logger('Generate found a verb `%s`', verb_name);
      var verb_opts = _.defaults({ verb_set }, verb_options);
      var verb_class = this.verb_lookup_class.get_type(verb_name);
      var generated = verb_class.generate(yaml_def, verb_opts);

      if (generated instanceof Array) {
        verb_set.add_instances(generated, { render: false });
      } else if (!generated) {
        this.logger('Discarding a falsey value for [%s]', verb_name);
      } else {
        verb_set.add_instance(generated, { render: false });
      }

      this.logger('Generate %s `verbs` now contains %s items', this.id, verb_set.length);
    }

    return verb_set;
  }

  // new RuleVerbSet
  // Not meant to be called directly, you should be extending the
  // class with your own verbs and verb type
  constructor(options) {
    options ??= {};
    super();
    this.verb_instances = [];
    this.verb_type = options.verb_type || this.constructor.verb_type;

    // Attach the parent rule
    this.rule =
      options.rule ||
      (() => {
        throw new Error('No rule');
      })();

    // Due to the two template setup we are not relying on
    // `Renderers` template setup, disable it
    this.template_none = true;

    // What RuleVerbBase class we are a set of?
    this.verb_class =
      options.verb_class ||
      this.constructor.verb_class ||
      (() => {
        throw new Error('verb_class');
      })();

    // What RuleVerbTypes class should be use to lookup
    this.verb_lookup_class =
      options.verb_lookup_class ||
      this.constructor.verb_lookup_class ||
      (() => {
        throw new Error('verb_class');
      })();

    this.rendered_init(options);
    this.logger(`new ${this.constructor.name} building the rule verb container`, options);

    // Check we have been passed verbs
    if (options.verbs) {
      this.add_instances(options.verbs, { render: false });
    }
  }

  // Run a function for every verb instance
  // Passes in the `verb` object, `index`, and `this`
  each_instance(fn) {
    return this.verb_instances.map((verb_instance, i) => fn(verb_instance, i, this));
  }

  // Add a new VerbType instance
  add_instance(new_verb, options) {
    this.constructor.expect_class_type(new_verb);
    this.verb_instances.push(new_verb);
    new_verb.verb_set = this;
    const $instance_container = $('<div/>');
    this.$container.append($instance_container);
    new_verb.set_container($instance_container);
    if (!options || options.render !== false) {
      new_verb.render();
    }
    return new_verb;
  }

  // Adds an array of VerbType instances
  add_instances(new_verbs, options) {
    return new_verbs.map(verb => this.add_instance(verb, options));
  }

  // Return a single verb instance
  get_instance(lookup) {
    this.logger('get_instance lookup', lookup, _.isString(lookup), _.isNumber(lookup), _.isObject(lookup));
    const res = _.isString(lookup)
      ? _.find(this.verb_instances, { euid: lookup })
      : _.isNumber(lookup)
        ? this.verb_instances[lookup]
        : _.isObject(lookup)
          ? _.find(this.verb_instances, lookup)
          : false;
    this.logger('get_instance lookup', lookup, !!this.verb_instances[lookup]);
    return res;
  }

  // Return the array
  get_instances() {
    return this.verb_instances;
  }

  // Return the index of an Verb object in the set
  get_index(lookup) {
    const query = _.isString(lookup) ? { euid: lookup } : lookup;
    return _.findIndex(this.verb_instances, query);
  }

  // Removing from array, check the ref is the same
  // could use auid too?
  remove_instance(lookup) {
    const verb_instance = this.get_instance(lookup);
    if (!verb_instance) {
      return false;
    }
    const verb_removes = _.remove(this.verb_instances, verb_instance);
    debug('removed %s %s verb instances', verb_removes.length, this.verb_type, verb_removes);
    if (verb_removes.length > 1) {
      throw new Error(`Removed more than one verb instance ${verb_removes.length}`);
    }
    verb_removes[0].remove();
    return verb_removes;
  }

  // Generates a new blank verb for this set and adds it to the instance
  generate_verb(verb, options) {
    verb ??= '_initial';
    options ??= {};
    options.render ??= true;
    const verbi = this.add_instance(this.create_verb(verb), options);
    this.logger('create_new blank verb instance', verb, this.verb_type);
    verbi.enable_editing();
    return verbi;
  }

  // Creates a new verb ready for this instance
  create_verb(verb, options) {
    let verbi;
    verb ??= '_initial';
    options ??= {};
    const type = this.verb_lookup_class.get_type(verb);
    const verb_opts = {
      yaml: {},
      rule: this.rule,
      verb_set: this,
    };
    return (verbi = new type(_.defaults(verb_opts, options)));
  }

  // Replace an existing Verb in the set with a new Verb
  // can pass in a verb types string to generate or an already
  // built RuleVerbBase
  replace_verb(verb_to_replace, new_verb) {
    const old_verb = this.get_instance(verb_to_replace);
    if (!old_verb) {
      throw new Error('No existing verb could be found');
    }
    if (_.isString(new_verb)) {
      this.logger('generating new Verb for [%s]', new_verb);
      new_verb = this.create_verb(new_verb);
    }
    this.constructor.expect_class_type(new_verb);
    this.constructor.expect_class_type(verb_to_replace);

    const verb_index = this.get_index(verb_to_replace);
    old_verb.replace(new_verb);
    this.verb_instances[verb_index] = new_verb;
    new_verb.render();
    return new_verb;
  }

  // Find the closest(parent) verb object via jquery `data()`.
  // Relies on the class `@verb_class` property being set.
  closest_verb($element) {
    $element ??= this.$container;
    return this.verb_class.closest($element);
  }

  // Find the class for a verb string.
  // Relies on the class `@verb_lookup_class` property being set.
  verb_class_from_string(verb_string) {
    return this.verb_lookup_class.lookup_type(verb_string);
  }

  // --------------------------------------------------------------------
  // #### View management

  // # Render all the verb elements
  // render_custom_html: ( options = {} ) ->
  //   @logger 'render() verb_instances', @verb_instances
  //   html = for verb_instance in @verb_instances
  //     @logger 'render() verb_instance', verb_instance
  //     verb_instance.render( options ).html()
  //   html.join('')

  // Render all the verb elements
  render_custom(options) {
    options ??= {};
    this.logger('render() verb_instances', this.verb_instances);
    const html = (() => {
      const result = [];
      for (var verb_instance of this.verb_instances) {
        this.logger('render() verb_instance', verb_instance);
        result.push(verb_instance.render(options));
      }
      return result;
    })();
    return this.$container.append(html);
  }

  // Render the tags whereever they go
  render_tag_html() {
    return (() => {
      const result = [];
      for (var verb_instance of this.verb_instances) {
        this.logger('tag_render() verb_instance', verb_instance);
        result.push(verb_instance.render_tag_html());
      }
      return result;
    })();
  }

  initial_handlers(options) {
    const self = this;
    super.initial_handlers(options);

    // Delete a verb
    let css_selector = ['.action-delete-button', '.select-delete-button', '.verb-delete-button'];
    this.$container.on('click.verb-delete', `${css_selector}`, function (ev) {
      const verb = self.verb_class.closest($(this));
      return self.remove_instance(verb);
    });

    // Add a new verb is in Rule, due to the link being rendered there

    // Change an existing verb
    // SELECT AND ACTION specific handlers are in their own class
    css_selector = ['.verb-operator input', '.action-operator input', '.select-operator input'];
    // Listen for both `input` and `change`: bootstrap-3-typeahead 4.x fires
    // `change` (not `input`) when the user picks a suggestion from the menu.
    return this.$container.on('input.verb-change change.verb-change', `${css_selector}`, function (ev) {
      const verb = self.verb_class.closest($(this));
      const new_verb_name = $(this).val();
      self.logger('Verb change current[%s] new[%s]', verb.verb, new_verb_name);
      if (verb.verb === new_verb_name) {
        self.logger('Verb already set current[%s] new[%s]', verb.verb, new_verb_name);
        return true;
      }
      if (!self.verb_class_from_string(new_verb_name)) {
        const err = new ValidationError('Unknown verb [#{new_verb_name}]', { $element: $(this) });
        return console.log(err);
      }
      const new_verb = self.replace_verb(verb, new_verb_name);
      return new_verb.enable_editing();
    });
  }

  // Get all the dom properties in the objects and render it
  // Could become obsolete with proper `on 'change'` data handing
  dom_to_properties(custom_fn) {
    for (var verb_instance of this.verb_instances) {
      verb_instance.dom_to_properties();
    }
    return this.to_yaml_obj();
  }

  // Get all the dom properties in the objects and render it
  // Could become obsolete with proper `on 'change'` data handing
  dom_to_yaml_obj(custom_fn) {
    for (var verb_instance of this.verb_instances) {
      verb_instance.dom_to_properties();
    }
    return this.to_yaml_obj();
  }

  // Dump the yaml object for all the verb instances and
  // munge them together
  to_yaml_obj(custom_fn) {
    const o = {};
    for (var verb_instance of this.verb_instances) {
      this.logger('to_yaml() verb_instance', verb_instance);
      _.merge(o, verb_instance.to_yaml_obj(), custom_fn);
    }
    return o;
  }

  // What are we doing?
  is_edit_mode() {
    return this.edit_mode;
  }

  // Enable editing
  enable_editing(animate) {
    animate ??= this.animate;
    for (var verb_instance of this.verb_instances) {
      verb_instance.enable_editing();
    }
    return (this.edit_mode = true);
  }

  // Disable editing
  disable_editing(animate) {
    animate ??= this.animate;
    for (let i = 0; i < this.verb_instances.length; i++) {
      var verb_instance = this.verb_instances[i];
      verb_instance.disable_editing();
    }
    this.remove_initials();
    return (this.edit_mode = false);
  }

  // Toggle the current verbs edit state
  toggle_editing(animate) {
    animate ??= this.animate;
    if (is_edit_mode()) {
      return disable_editing();
    } else {
      return enable_editing();
    }
  }

  // Remove any `_initial` verbs
  remove_initials() {
    return _.remove(this.verb_instances, { verb: '_initial' });
  }

  // Validate all the whole set, and report on it all
  validate(options) {
    options ??= {};
    const error_set = options.errors || new DomErrorSet();

    for (var verb_instance of this.verb_instances) {
      verb_instance.validate({ errors: error_set });
    }

    return error_set;
  }

  // Run a mock test against an event.
  // This is duplicating the server side event rules.
  // Maybe make this into a service.
  test_event(event) {
    this.logger('RuleVerbBase test_event ran');
    return true;
  }

  // These are really test helpers, app lookups should all go via the
  // `data` object `$container.find()` or one of the `closest` functions
  gen_euid_selector(euid, name) {
    return `#${euid} .${this.verb_type}-${name} > input`;
  }

  // These are really test helpers
  // Again, don't use these
  find_input_el(euid, name) {
    const selector = this.gen_euid_selector(euid, name);
    const $res = this.$container.find(selector);
    if ($res.length !== 1) {
      throw new Error(`Input not found [${selector}]`);
    }
    return $res;
  }
}
RuleVerbSet.initClass();

window.RuleVerbSet = RuleVerbSet;
