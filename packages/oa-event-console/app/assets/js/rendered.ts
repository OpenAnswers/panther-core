// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
class Rendered extends Module {
  static initClass() {
    this.logger = debug('oa:event:rendered');

    this.template_id = '#template-rendered';
  }

  // `@template_id`
  // The css id of the template to use for this render

  // `@dom_selector`
  // `The selector to find the parent rendered element for this class

  // `@dom_class`
  // The css class to apply to the rendered parent element

  // `@dom_name`
  // The name use to refernce this class. `data` will be stored under this

  // Initial template setup, call it on instantiation when you set
  // a @template_id... `@template_setup()`
  // Sets properties on the class that `constructor` looks up
  static template_setup() {
    this.template_html = $(this.template_id).html();
    if (!this.template_html || !(this.template_html.length > 0)) {
      const idStr = this.template_id ? this.template_id.replace(/^#/, '') : '';
      const nativeEl = idStr ? document.getElementById(idStr) : null;
      console.error(`[template_setup] template not found for '${this.template_id}'`, {
        jqueryLength: $(this.template_id).length,
        nativeEl: nativeEl ? `found, innerHTML.length=${nativeEl.innerHTML.length}` : 'NOT FOUND via getElementById',
        dollarIsjQuery: typeof $ !== 'undefined' && typeof $.fn !== 'undefined',
      });
      const err = new Error(`Input template was not found [${this.template_id}]`);
      console.error(err);
      return err;
    }
    return Mustache.parse(this.template_html);
  }
  //@template_setup()

  // `closest( $jQueryElement )`
  // Lookup the jquery `data` object named `@dom_data_id` that is attached to the
  // `@dom_selector` element, from any child element. Throws and logs an error on failure
  static closest($that) {
    let err;
    if (!this.dom_selector) {
      if (!this.dom_class) {
        this.dom_class = this.dom_name;
      }
      this.dom_selector = '.' + this.dom_class;
    }

    if (!$that) {
      err = new Error(`No DOM element to start search from [${$that}]`);
      console.error(err, $that, $el);
      throw err;
    }

    var $el = $that.closest(this.dom_selector);

    if (!$el) {
      err = new Error(`Couldn't get a closest element from [${this.dom_selector}]`);
      console.error(err, $that, $el);
      throw err;
    }

    if ($el.length !== 1) {
      err = new Error(`Couldn't find any close elements named [${this.dom_selector}]`);
      console.error(err, $that, $el);
      throw err;
    }

    const required_object = $el.data(this.dom_data_id);
    if (!required_object) {
      err = new Error(
        `Couldn't find [${this.dom_data_id}] in data for [${this.dom_selector}]. Had [${_.keys($el.data())}]`
      );
      console.error(err, $.data($el), $el.data(), $el);
      throw err;
    }

    return required_object;
  }

  // `check `closest_check( $jQueryElement )`
  // Lookup the `@dom_data_id` object on `@dom_selector` from any child element
  // Returns false on failure.
  static closest_check($that) {
    const $el = $that.closest(this.dom_selector);
    if ($el.length !== 1) {
      return false;
    }
    const object = $el.data(Rule.dom_data_id);
    if (!object) {
      return false;
    }
    return object;
  }

  // Setup all the default Rendered options
  // Super this in your `constructor`
  // Most will default from the same properties in your class definition
  constructor() {
    super();
  }

  rendered_init(options) {
    options ??= {};
    this._init_logger(options);
    this._init_dom(options);
    this._init_euid(options);
    this._init_templates(options);
    this._init_container(options);
    this.set_container_data();
    this.initial_handlers();
    this._init_callbacks(options);
    if (options.render) {
      return this.render();
    }
  }

  // `@logger` debug log instance for this class
  _init_logger(options) {
    if (this.logger == null) {
      this.logger = options.logger || this.constructor.logger;
    }
  }

  // `@dom_name`, `@dom_data_id`, `@dom_class`, `@dom_selector`
  _init_dom(options) {
    if (this.dom_name == null) {
      this.dom_name = options.dom_name || this.constructor.dom_name;
    }
    if (!this.dom_name) {
      throw new Error('A `dom_name` option is required for a rendered element');
    }
    if (this.dom_data_id == null) {
      this.dom_data_id = options.dom_data_id || this.constructor.dom_data_id || this.dom_name;
    }
    if (this.dom_class == null) {
      this.dom_class = options.dom_class || this.constructor.dom_class || this.dom_name;
    }
    if (this.dom_selector == null) {
      this.dom_selector = options.dom_selector || `.${this.dom_class}`;
    }
  }

  // `@euid` and components — element unique id (base62) for use as a dom id
  _init_euid(options) {
    if (this.euid_prefix == null) {
      this.euid_prefix = options.euid_prefix || this.constructor.euid_prefix || '';
    }
    if (this.euid_suffix == null) {
      this.euid_suffix = options.euid_suffix || this.constructor.euid_suffix || '';
    }
    if (this.euid_length == null) {
      this.euid_length = options.euid_length || this.constructor.euid_length || 8;
    }
    if (this.euid == null) {
      this.euid = this.euid_prefix + Helpers.random_string(this.euid_length + this.euid_suffix);
    }
  }

  // Mustache template config: `@template_none`, `@template_id`, `@template_html`
  _init_templates(options) {
    if (this.template_none == null) {
      this.template_none = options.template_none || this.constructor.template_none || false;
    }
    if (this.template_id == null) {
      this.template_id = options.template_id || this.constructor.template_id;
    }
    if (this.template_html == null) {
      this.template_html = options.template_html || this.constructor.template_html || $(this.template_id).html();
    }
  }

  // HTML container element and jQuery reference
  _init_container(options) {
    this.logger('container el', this.container_el, options.container_el, this.constructor.container_el);
    if (this.container_el == null) {
      this.container_el = options.container_el || this.constructor.container_el || 'div';
    }
    if (this.$container == null) {
      this.$container = options.$container || $(`<${this.container_el}/>`);
    }
  }

  // `@on_render` after render, `@on_dataupdate` after data changes
  _init_callbacks(options) {
    if (this.on_render == null) {
      this.on_render = options.on_render || this.constructor.on_render;
    }
    if (this.on_dataupdate == null) {
      this.on_dataupdate = options.on_dataupdate || this.constructor.on_dataupdate;
    }
  }

  // The the container for this object to something new
  set_container($ele, options) {
    options ??= {};
    const { remove, replace, render } = options;
    this.logger('set_container Setting container to new element', $ele, options);
    if (remove) {
      this.logger('set_container removing current element', this.$container);
      this.$container.remove();
    }
    if (replace) {
      this.logger('set_container replacing current element', this.$container);
      this.$container.replaceWith($ele);
    }
    this.$container = $ele;
    this.set_container_data();
    if (render) {
      this.render();
    }
    this.initial_handlers();
    return this;
  }

  // Set the data for the container
  set_container_data() {
    this.logger(
      'setting container dom info c[%s] d[%s] u[%s]',
      this.dom_class,
      this.dom_data_id,
      this.euid,
      this.$container
    );
    this.$container.addClass(this.dom_class);
    this.$container.attr('id', this.euid);
    //$.data @.$container, @dom_data_id, @
    this.$container.data(this.dom_data_id, this);
    return this;
  }

  // Render the html data with the object
  render_html(custom_data) {
    // Lazy-load template from DOM if initClass() ran before DOM was ready
    if (!this.template_html || !(this.template_html.length > 0)) {
      const tid = this.template_id || this.constructor.template_id;
      if (tid) {
        this.template_html = $(tid).html();
      }
    }
    if (!this.template_html || !(this.template_html.length > 0)) {
      const tid2 = this.template_id || this.constructor.template_id;
      const idStr2 = tid2 ? tid2.replace(/^#/, '') : '';
      const nativeEl2 = idStr2 ? document.getElementById(idStr2) : null;
      console.error(`[render_html] template still missing for '${tid2}'`, {
        jqueryLength: tid2 ? $(tid2).length : 'no-tid',
        nativeEl: nativeEl2 ? `found, innerHTML.length=${nativeEl2.innerHTML.length}` : 'NOT FOUND via getElementById',
        dollarIsjQuery: typeof $ !== 'undefined' && typeof $.fn !== 'undefined',
        constructorName: this.constructor && this.constructor.name,
      });
    }

    const variables = { data: this };

    if (custom_data) {
      variables.custom_data = custom_data;
    }

    return Mustache.render(this.template_html, variables);
  }

  // Render the data to the jquery $container
  // Many places will override this. It's not in a useful format
  // to use `super` due to the the `.html('')`.
  //
  // The `render_custom()` function will be called if defined
  //
  render(options) {
    options ??= {};
    let html_string = '';

    // We might not have a mustache template
    if (!this.template_none) {
      html_string += this.render_html();
    }

    // Classes can insert custom html strings
    // This is a bit quicker than appending all the time
    if (_.isFunction(this.render_custom_html)) {
      html_string += this.render_custom_html(options);
    }

    this.$container.html(html_string);

    // Classes can insert custom data, most do
    if (_.isFunction(this.render_custom)) {
      this.render_custom(options);
    }

    this.handlers();

    return this.$container;
  }

  // Handlers setup event watchers that live on rendered elements
  // Don't put too much in here as it will run on every render()
  handlers() {
    return true;
  }

  // Initial handlers setup event watcher that listen to anything.
  // Generally you can't attach to rendered elements as they come and go
  // But you can listen for bubbled events on the $container, which may
  // be more performant anyway as there's no setup/teardown on every render.
  // These will be setup on any `set_container()`
  initial_handlers() {
    return true;
  }

  // Find something in our container. Optionally throw an error
  container_find(selector, options) {
    const $el = this.$container.find(selector);
    if (!($el.length > 0)) {
      const err = new Error(`No element found [${selector}] in ${this.dom_class} - ${this.euid}`);
      if (options && options.error) {
        console.error(err, selector, this.$container, $el);
      }
      if (options && options.throw) {
        throw err;
      }
    }
    return $el;
  }

  // Find something in our container or false
  container_check(selector) {
    const $els = this.$container.find(selector);
    if ($els.length > 0) {
      return $els;
    } else {
      return false;
    }
  }

  container_find_throw(selector) {
    return this.container_find(selector, { throw: true });
  }
}
Rendered.initClass();

class RenderedSave extends Rendered {
  constructor(options) {
    options ??= {};
    super();
    this.rendered_init(options);
    this.save_Async = options.save_Async;
    this.validate_fn = options.validate_fn;
  }

  // Validate all properties, include childrens properties (i.e. those that
  // also implement the `validate()` function.
  validate(options) {
    options ??= {};
    const errors = options.errors || new DomErrorSet();
    return validate_local({ errors });
  }
  // provide simple validate_fn
  // `'input'` runs `()-> whatever`
  // provide selector > validate_fn or regex mapping
  // `{ '.fields': ()-> whatever }`
  // provide some default types.
  // character sets, whitespace, null, blah blah blah

  // Only validate the local properties, rather than traversing
  // a whole tree for nested objects
  validate_local(options) {
    let errors;
    options ??= {};
    return (errors = options.errors || new DomErrorSet());
  }

  // Save the data back to wherever it came from
  save() {
    const self = this;
    const errors = self.validate();
    if (!errors.ok()) {
      return Message.label('Validation: ' + errors.to_string(), errors);
    }

    return self
      .save_Async()
      .then(function (res) {
        self.save_cancel = false;
        return self.render();
      })
      .catch(function (error) {
        console.error('There was a problem saving your data', error);
        return Message.exception('There was a problem saving your data', error);
      });
  }

  save_Async() {
    return new Promise((resolve, reject) => reject(new Error('Override with you custom save logic')));
  }
}

window.Rendered = Rendered;
window.RenderedSave = RenderedSave;
