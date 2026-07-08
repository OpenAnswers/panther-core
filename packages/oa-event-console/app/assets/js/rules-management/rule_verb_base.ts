// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # RuleVerbBase

// An interface for all the rule verbs to implement

class RuleVerbBase extends Rendered {
  static initClass() {
    //@include classProperties
    //@extend instanceProperties

    // Add a logger, other classes should override
    this.logger = debug('oa:event:rules:rule_verb_base');

    // The verb. `skip`, `match`, `discard`
    this.verb ??= '_basse_';

    // The type for the verb. `action`, `option`, `select`
    this.verb_type = '_basetype_';

    // Class for the container the edit/view live in
    this.dom_class = 'verb-entry';
    this.dom_name = 'verb';
    this.dom_data_id = this.dom_name;
    this.dom_selector = '.' + this.dom_class;

    // All verbs need a plain html mustache template to lookup
    // `-view` and `-edit` will be appended to the id.
    this.template_id ??= '#template-_base_';

    // Due to the two template setup we are not relying on
    // `Renderers` template setup, disable it
    this.template_none = true;
  }

  // Generate all the standard mustache templates.
  // You class will need to call `@generate_templates()` at load.
  // If you need to add more templates in a specific class
  // override `@generate_templates` and `super` this copy of
  // the function.
  // The view and edit templates are build from `@template_id` unless
  // you manually set them in a class
  static generate_templates() {
    this.template_view_id ??= `${this.template_id}-view`;
    this.template_edit_id ??= `${this.template_id}-edit`;
    this.logger('generate() template from ids', this.template_view_id, this.template_edit_id);
    this.template_view = this.generate_template(this.template_view_id);
    return (this.template_edit = this.generate_template(this.template_edit_id));
  }

  // Generate a single mustache template for `generate_templates()`
  static generate_template(element_id) {
    const html = $(element_id).html();
    if (!html || !(html.length > 0)) {
      const idStr = element_id ? element_id.replace(/^#/, '') : '';
      const nativeEl = idStr ? document.getElementById(idStr) : null;
      console.error(`${this.name} No template found for '${element_id}'`, {
        jqueryLength: $(element_id).length,
        nativeEl: nativeEl ? `found, innerHTML.length=${nativeEl.innerHTML.length}` : 'NOT FOUND via getElementById',
        dollarIsjQuery: typeof $ !== 'undefined' && typeof $.fn !== 'undefined',
      });
    }
    Mustache.parse(html);
    return html;
  }

  // Generate a class instance from yaml def
  // You extended verb types should now how to do this
  static generate(yaml_def, options) {
    options ??= {};
    throw new Error('implement generate');
  }

  // --------------------------------------------------------------
  // `new RuleVerbBase { rule: Rule }`
  //
  // #### Properties
  constructor(options) {
    options ??= {};
    super();
    this.logger ??= this.constructor.logger;
    this.logger('new %s rule verb has options', this.constructor.name, options);

    // - `@verb` verb string for this object
    // - `@verb_type` the class of this verb
    this.verb ??= options.verb_type || this.constructor.verb;
    this.verb_type ??= options.verb_type || this.constructor.verb_type;

    // - `@template_view` the html of the raw view template
    this.template_view_selector = `.${this.verb_type}-entry-view`;
    this.template_view = options.template_view || this.constructor.template_view;

    // - `@template_edit` the html of the raw edit template
    this.template_edit_selector = `.${this.verb_type}-entry-edit`;
    this.template_edit = options.template_edit || this.constructor.template_edit;

    // - `@template_tag` the html of the verbs tag (or gem)
    this.template_tag = options.template_tag || this.constructor.template_tag;

    // - `@template_none` due to Rules two template setup we are not
    // relying on `Renderers` single template setup, disable it
    this.template_none = true;

    // - `@label` for this verb (Ucase, spaces etc)
    this.label = options.label || this.constructor.label || this.verb;

    // - `@verb_english` The english written verb for use in sentences
    this.verb_english = options.verb_english || this.constructor.verb_english || this.verb;

    // - `@help` snippit for users
    this.help = options.help || this.constructor.help || this.verb;

    // - `@animate` should we animate transitions
    this.animate = !!options.animate || false;

    // - `@typeaheads` Should we enable typeheads (mainly for testing)
    this.typeaheads = options.typeaheads != null ? !!options.typeaheads : true;

    // - `@rule` the parent RuleVerbBase object of this action
    this.rule =
      options.rule ||
      (() => {
        throw new Error(`${this.constructor.name} requires a rule`);
      })();

    // - `@verb_set` is the parent verb set housing the verb
    this.verb_set = options.verb_set;

    this.rendered_init(options);
  }

  // ------------------------------------------------------------------
  // #### Edit mode

  // What are we?
  is_edit_mode() {
    return this.edit_mode;
  }

  // Enable editing
  enable_editing(animate) {
    animate ??= this.animate;
    if (animate) {
      const self = this;
      $(this.$template_view_el).fadeOut('fast', function () {
        return $(self.$template_edit_el).fadeIn('fast');
      });
    } else {
      if (this.$template_view_el != null) {
        this.$template_view_el.addClass('collapse');
      }
      if (this.$template_edit_el != null) {
        this.$template_edit_el.removeClass('collapse');
      }
    }
    //if @typeaheads
    //Typeaheads.setTypeaheads(@verb_type)
    return (this.edit_mode = true);
  }

  // Disable editing
  disable_editing(animate) {
    animate ??= this.animate;
    if (animate) {
      const self = this;
      $(this.$template_edit_el).fadeOut('fast', function () {
        return $(self.$template_view_el).fadeIn('fast');
      });
    } else {
      if (this.$template_edit_el != null) {
        this.$template_edit_el.addClass('collapse');
      }
      if (this.$template_view_el != null) {
        this.$template_view_el.removeClass('collapse');
      }
    }
    return (this.edit_mode = false);
  }

  // Toggle the current verbs edit state
  toggle_editing(animate) {
    animate ??= this.animate;
    if (this.is_edit_mode()) {
      return this.disable_editing();
    } else {
      return this.enable_editing();
    }
  }

  // Remove the tracked elements.
  // Would need render after this to work again
  remove_elements() {
    if (this.$template_view_el != null) {
      this.$template_view_el.remove();
    }
    if (this.$template_edit_el != null) {
      this.$template_edit_el.remove();
    }
    return this.$template_tags?.remove();
  }

  // Remove downwards. Delete the instance from Types
  // and remove the dom elements.
  // Do we need a remove the other way?? Types up?
  remove() {
    //@rule[@verb_type].remove_instance @
    this.remove_elements();
    return this.$container?.remove();
  }

  // Replace this verb object with a new object
  // See `.replace()` in `RuleVerbSet`
  replace(new_verb) {
    this.$container.replaceWith(new_verb.$container);
    return new_verb.set_container_data();
  }

  // # Set a new jquery container for the verb
  // set_container: ( $container )->
  //   if @.$container
  //     @logger 'removing current container', @.$container
  //     @.$container.remove()
  //   @.$container = $container
  //   @set_container_data()
  //   @render()

  // # Apply this verbs data set to the jquery container
  // set_container_data: ->
  //   @.$container.addClass "#{@verb_type}-entry"
  //   $.data @.$container, 'verb', @
  //   $.attr @.$container, 'id', @uvid

  // selector for you dom input fields
  get_dom_input_class(label) {
    return `input-verb-${this.verb_type}-${this.verb}-${label}`;
  }

  // selector for you dom input fields
  get_dom_input_selector(label) {
    return `input.${this.get_dom_input_class(label)}`;
  }

  // Get an input field from the dom
  get_dom_input(label) {
    const sel = this.get_dom_input_selector(label);
    const $input_el = this.$template_edit_el.find(sel);
    if (!$input_el || $input_el.length !== 1) {
      throw new Error(`No input element for ${sel}`);
    }
    const input = $input_el.val();
    this.logger(`Got input ${sel} from dom [%s]`, input);
    return input;
  }

  // Get many input fields from the dom
  get_dom_inputs(label) {
    let input;
    const sel = this.get_dom_input_selector(label);
    const $input_el = this.$template_edit_el.find(sel);
    if (!$input_el || !($input_el.length > 0)) {
      throw new Error(`No input element for ${sel}`);
    }
    input =
      $input_el.length === 1
        ? $input_el.val()
        : (() => {
            const result = [];
            for (input of $input_el.toArray()) {
              result.push($(input).val());
            }
            return result;
          })();

    this.logger(`Got input ${sel} from dom [%s]`, input);
    return input;
  }

  render_html_view() {
    if (!this.template_view) {
      const id = this.constructor.template_view_id;
      if (id) this.template_view = $(id).html();
    }
    this.logger('render_html_view', this);
    return Mustache.render(this.template_view, { data: this });
  }

  render_html_edit() {
    if (!this.template_edit) {
      const id = this.constructor.template_edit_id;
      if (id) this.template_edit = $(id).html();
    }
    this.logger('render_html_edit', this);
    return Mustache.render(this.template_edit, { data: this });
  }

  // The main `render` function has been overridden here. This is due to the
  // multi template setup for edit/view from the original rule UI. This doesn't
  // gel with the `Rendered` template setup.
  render(options) {
    let data;
    options ??= {};
    if (options.data) {
      data = { data: options.data };
      this.logger('Rendering the view and edit templates with options data', data);
    } else {
      data = { data: this };
      this.logger('Rendering the view and edit templates with `this`');
    }

    this.$container.html(this.render_html_view() + this.render_html_edit());

    this.$template_view_el = this.container_find_throw(this.template_view_selector);
    //@.$template_view_el.data 'verb', @

    this.$template_edit_el = this.container_find_throw(this.template_edit_selector);
    //@.$template_edit_el.data 'verb', @

    if (this.is_edit_mode()) {
      this.enable_editing();
    }

    this.set_container_data();
    this.handlers();

    return this.$container;
  }

  handlers(options) {
    options ??= {};
    return this.handle_input_change();
  }

  // Handle an input change
  handle_input_change() {
    const self = this;
    // bootstrap-3-typeahead 4.x fires `change` on select; native inputs fire `input`
    return this.$container.on('input change', 'input', ev => self.dom_to_properties());
  }

  // Add the tag template to the screen. I'm not sure about this.
  // Could just to it with jquery as it's not a template
  render_tag_html() {
    if (this.verb === '_initial') {
      return;
    }
    const el = $(`#template-tag-${this.verb}`);
    if (el.length !== 1) {
      throw new Error(`Couldn't find tag el for #template-tag-${this.verb}`);
    }
    this.logger('tag render el', el);
    return el.html();
  }

  // Get the dom properies into this instance
  // Input should maybe happen automatically, on `change` or somesuch
  dom_to_properties() {
    throw new Error('Override dom_to_properties for each type');
  }

  // Retrive the dom values and produce the yaml
  dom_to_yaml_obj() {
    this.dom_to_properties();
    return this.to_yaml_obj();
  }

  // Return the yaml def from the dom fields
  to_yaml_obj() {
    throw new Error('implement to_yaml_obj');
  }

  // Default to returning an ok or existing error set
  validate(options) {
    let errors;
    return (errors = options.errors || new DomErrorSet());
  }
}
RuleVerbBase.initClass();

window.RuleVerbBase = RuleVerbBase;
