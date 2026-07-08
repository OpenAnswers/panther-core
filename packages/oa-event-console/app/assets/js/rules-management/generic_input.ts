// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Some methods cross over class tree boundaries
// So if class tree runs vertically, sometimes you want to apply
// a method to a horizontal selection of classes. For this we have
// Mixins (from Ruby). Apply a function to many classes without
// inheriting something. Requires `Module` which provices `@include` for
// class instance properties and `@extend` for class properties

class MixinMustacheSelect {
  // Takes a key/value object and turns it into a Mustache renderable array
  // This includes generating a select/option array for each element
  // Require `this.options_list` to function

  object_to_array(values_object) {
    let index = -1;
    const arr = (() => {
      const result = [];
      for (var name in values_object) {
        var val = values_object[name];
        index++;
        // Build an options list for this name/value, setting selected if needed
        var options_list = (() => {
          const result1 = [];
          for (var select_option of this.options_list) {
            var new_option = _.defaults({}, select_option);
            if (new_option.value === val) {
              new_option.selected = true;
            }
            if (!new_option.label) {
              new_option.label = value;
            }
            result1.push(new_option);
          }
          return result1;
        })();

        // Now we have a mustache renderable blob, add it to the array
        result.push({ name, options_list, index });
      }
      return result;
    })();
    this.max_index = index;
    return arr;
  }
}

class GenericGroup extends Module {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_group');

    this.class = 'generic-group-entry';
    this.template_id = '#template-generic-group';
    this.template_grouped_id = '#generic-grouping-replace-me';
    this.template_setup();
  }

  static template_setup() {
    this.template_html = $(`${this.template_id}`).html();
    if (!this.template_html || !(this.template_html.length > 0)) {
      const err = new Error(`Input template was not found [${this.template_id}]`);
      console.error(err);
      return err;
    }
    return Mustache.parse(this.template_html);
  }

  constructor(options) {
    options ??= {};
    super();
    this.logger = options.logger || this.constructor.logger;
    this.name = options.name || '_noname';
    this.label = options.label || this.name;
    this.label_detail = options.label_detail || undefined;
    this.class = options.class || this.constructor.class;
    this.euid = 'gg' + Helpers.random_string(6);

    // Collapse grouping
    this.collapsable = options.collapsable;

    // Function to add new entries
    this.addable = options.addable || false;

    // Help text
    this.help = options.help || false;

    this.grouped =
      options.grouped ||
      (() => {
        throw new Error("Groups don't work without something to group");
      })();

    this.$container = options.$container || $('<div/>');
    this.template_id = options.template_id || this.constructor.template_id;
    this.template_html = options.template_html || this.constructor.template_html;
    this.template_grouped_id = options.template_grouped_id || this.constructor.template_grouped_id;

    this.set_container_data();
  }

  set_container($ele, options) {
    this.logger('set_container Setting container to new element', $ele);
    this.$container = $ele;
    this.set_container_data();
    this.render();
    //@initial_handlers()
    return this;
  }

  // Set the data for the container
  set_container_data() {
    this.$container.addClass(this.class);
    this.$container.addClass('generic-input-handler');
    this.$container.data('group', this);
    this.$container.data('handler', this);
    this.$container.attr('id', this.euid);
    return this;
  }

  render_html(options) {
    if (!this.template_html || !(this.template_html.length > 0)) {
      const tid = this.template_id || this.constructor.template_id;
      if (tid) this.template_html = $(tid).html();
    }
    if (!this.template_html || !(this.template_html.length > 0)) {
      console.error('No template html to render - template_html');
    }
    return Mustache.render(this.template_html, { data: this });
  }

  render(options) {
    this.$container.html(this.render_html());
    const $group_inner = this.$container.find(this.template_grouped_id);
    if (!$group_inner || $group_inner.length !== 1) {
      return console.error('No $group_inner to append', this.template_grouped_id, $group_inner);
    }
    this.grouped.set_container($group_inner);
    this.grouped.render();
    this.handlers();
    return this.$container;
  }

  handlers() {
    return true;
  }
}
GenericGroup.initClass();

// Difficult
//groupify: ( gen )->
//@render()
//gen.set_container @.$container.find('')
//gen.render()
//@

// ## GenericInput

// Base class for other to customise
// Input Fields, groups, bootstrappy
class GenericInput extends Module {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_input');
  }

  static template_setup() {
    this.template_edit_html = $(`${this.template_id}-edit`).html();
    if (!this.template_edit_html || !(this.template_edit_html.length > 0)) {
      return console.error(new Error(`Input template was not found [${this.template_id}-edit]`));
    }
    return Mustache.parse(this.template_edit_html);
  }

  constructor(options) {
    options ??= {};
    super();
    this.logger = options.logger || this.constructor.logger;
    this.logger(`new GenericInput-${this.constructor.name} generating input with `, options);

    this.name = options.name || '_noname';
    this.label = options.label || undefined;
    this.class = options.class || this.constructor.class;

    this.euid = 'gi' + Helpers.random_string(6);

    this.$container = options.$container || $('<div/>');
    this.template_id = options.template_id || this.constructor.template_id;
    this.template_edit_html = options.template_edit_html || this.constructor.template_edit_html;

    // Allow for custom save/cancel interfaces
    this.save_cancel_selector = options.save_cancel_selector || '.generic-value-save-interface';

    // Selector to apply the new handler to, look in `$(document)`
    this.new_handler = options.new_handler || false;

    // Validation is done via external functions
    this.validate_fn = options.validate_fn;
    this.validate_field_fn = options.validate_field_fn;
    this.validate_value_fn = options.validate_value_fn;

    // Saving is done via external function
    //@save_fn = options.save_fn
    //throw new Error if @save_fn and !_.isFunction @save_fn
    this.save_Async = options.save_Async;
    if (!this.save_Async && !!_.isFunction(this.save_Async)) {
      throw new Error();
    }

    this.refresh_Async = options.refresh_Async;
    if (!this.save_Async && !!_.isFunction(this.save_Async)) {
      throw new Error();
    }

    // Size/layout options. Bootstrap `col` values mostly
    this.size_value = options.size_value || 5;
    this.size_field = options.size_field || 5;
    this.size_delete = options.size_delete || 1;
    this.size_join = options.size_join || 1;
    this.join_text = options.join_text || false;
    //heading.field heading.value will be used as the headings
    this.heading = options.heading || false;
  }

  set_container($ele, options) {
    this.logger('set_container Setting container to new element', $ele);
    this.$container = $ele;
    this.set_container_data();
    this.render();
    this.initial_handlers();
    return this;
  }

  // Set the data for the container
  set_container_data() {
    this.$container.addClass(this.class);
    this.$container.data('input', this);
    this.$container.attr('id', this.euid);
    return this;
  }

  render(options) {
    options ??= {};
    if (!this.template_edit_html) {
      const tid = this.template_id || this.constructor.template_id;
      if (tid) this.template_edit_html = $(`${tid}-edit`).html();
    }
    this.$container.html('');
    this.$container.append($(Mustache.render(this.template_edit_html, { data: this })));
    this.handlers();
    return this.$container;
  }

  handlers() {
    const self = this;

    const $new = this.container_find('.generic-newentry');
    $new.on('click', function (ev) {
      self.logger('adding new entry event', ev);
      self.add_new_entry();
      const novalue = self.container_find('.generic-novalue');
      novalue.remove();
      return $('html,body').animate({ scrollTop: self.$container.offset().top });
    });

    const $cancel = this.container_find('.button-cancel');
    this.logger('Adding cancel event on [%s] $inputs', $cancel.length);
    $cancel.on('click', function (ev) {
      self.save_cancel = false;
      self.logger('cancel click', ev);
      return self.render();
    });

    const $save = this.container_find('.button-save');
    this.logger('Adding save event on [%s] $inputs', $cancel.length);
    $save.on('click', function (ev) {
      self.logger('save click', ev);
      return self.save(ev);
    });

    let inputs = this.value_selector;
    if (this.field_selector) {
      inputs += ', ' + this.field_selector;
    }
    const $inputs = this.container_find(inputs);
    this.logger('Adding change event on [%s] $inputs', $inputs.length, inputs, $inputs);
    // bootstrap-3-typeahead 4.x fires `change` on select; native inputs fire `input`
    $inputs.on('input change', function (ev) {
      self.logger('on change fired');
      self.validate_one(this);
      return self.show_save_cancel(this);
    });

    return (this.save_cancel = false);
  }

  initial_handlers() {
    const self = this;

    if (this.new_handler) {
      return $(this.new_handler).on('click', function (ev) {
        self.logger('adding new entry event', ev);
        self.add_new_entry();
        const novalue = self.container_find('.generic-novalue');
        novalue.remove();
        return $('html,body').animate({ scrollTop: self.$container.offset().top });
      });
    }
  }

  // Save the data back to wherever it came from
  save(that) {
    this.logger('Save triggered by', that);
    const self = this;
    const errors = this.validate();
    if (!errors.ok()) {
      return Message.error('Validation' + errors.to_string());
    }
    this.container_find('.button-save').prop('disabled', true);
    return this.save_Async(this.dom_to_yaml_obj())
      .timeout(15000)
      .then(function (res) {
        self.logger('Inputs saved. got res: ', res);
        Message.label('Updates saved', 'Your updates have been saved to the server, ready to be deployed');
        self.save_cancel = false;
        return self.refresh_Async(res);
      })
      .then(res => self.render())
      .catch(Promise.TimeoutError, function (error) {
        console.error(error);
        return Message.exception('Your save timed out, try again', error);
      })
      .catch(function (error) {
        console.error('There was a problem saving your data', error);
        return Message.exception('There was a problem saving your data', error);
      })
      .finally(() => self.container_find('.button-save').prop('disabled', false));
  }

  container_find(selector, single) {
    single ??= false;
    const $ref = this.$container.find(selector);
    if (!$ref || $ref.length < 1) {
      console.error('Selector returned no results [%s]', selector, this.$container);
    }
    //throw new Error 'Selector returned no results - '+selector
    if (single && $ref.length > 1) {
      console.error('Selector returned [%s] results', $ref.length, selector, this.$container);
    }
    //throw new Error 'Selector returned more than 1 result - '+selector
    return $ref;
  }

  validate_one(el, errors) {
    this.logger('validating', el);
    const val = $(el).val();
    const $fg = $(el).closest('.form-group');
    errors = new DomErrorSet();

    if (val === '') {
      errors.add_new_error('Field names must have a value');
    }

    if (val.match(/\s/)) {
      errors.add_new_error("Field names can't contain white space");
    }

    if (this.validate_fn) {
      const result = this.validate_fn(val);
      if (result === false) {
        errors.add_new_error('Validation Failed');
      }
      if (_.isObject(result)) {
        if (!result.ok) {
          errors.add_new_error(result.message);
        }
      }
    }

    if (!errors.ok()) {
      if (!$fg.hasClass('has-error')) {
        $fg.addClass('has-error');
        return Message.label('Input error', errors.to_string());
      }
    } else {
      this.logger('remove error');
      return $fg.removeClass('has-error');
    }
  }

  validate(errors) {
    const self = this;
    errors ??= new DomErrorSet();

    if (this.field_values && _.keys(this.field_values).length === 0) {
      const $values = this.container_find(this.value_selector);
      const $fields = this.container_find(this.field_selector);

      $values.each((i, e) => self.validate_one(e, errors));
      $fields.each((i, e) => self.validate_one(e, errors));
    }

    return errors;
  }

  show_save_cancel(ev, generic_input) {
    if (!this.save_cancel) {
      this.$container.find(this.save_cancel_selector).removeClass('hidden');
    }
    if (!this.save_Async) {
      this.$container.find(this.save_cancel_selector + ' .btn-save').addClass('hidden');
    }
    return (this.save_cancel = true);
  }

  add_new() {
    throw new Error('add_new must be overridden');
  }

  set_value(value) {
    this.value = value;
    return this.value;
  }

  dom_to_properties() {
    throw new Error('dom_to_properties must be overridden');
  }

  dom_to_yaml_obj() {
    this.dom_to_properties();
    return this.to_yaml_obj();
  }

  to_yaml_obj() {
    throw new Error('to_yaml_obj must be overridden');
  }

  object_to_array(values_object) {
    let index = -1;
    return (() => {
      const result = [];
      for (var name in values_object) {
        var val = values_object[name];
        index++;
        result.push({ name, value: val, index });
      }
      return result;
    })();
  }
}
GenericInput.initClass();

// One value (field static)
class GenericInputLabelValue extends GenericInput {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_input_value');

    this.template_id = '#template-generic-value';
    this.template_setup();
  }

  constructor(options) {
    options ??= {};
    super(options);
    this.field_selector = '';
    this.value_selector = '.generic-value-value > input';
    this.value = options.value;
  }

  dom_to_properties() {
    const $el = this.container_find('.generic-value-value > input');
    if ($el.length !== 1) {
      throw new Error("Couldn't locate form data");
    }
    return (this.value = $el.val());
  }

  to_yaml_obj() {
    const o = {};
    o[this.name] = this.value;
    return o;
  }
}
GenericInputLabelValue.initClass();

// One value (field static)
class GenericInputLabelEnum extends GenericInput {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_input_enum');

    this.template_id = '#template-generic-labelenum';
    this.template_setup();
  }

  constructor(options) {
    options ??= {};
    super(options);
    this.field_selector = '';
    this.value_selector = '.generic-labelenum-value > input';
    this.value = options.value;
    this.options_list = options.options_list;
  }

  dom_to_properties() {
    const $el = $('.generic-labelenum-value > input');
    if ($el.length !== 1) {
      throw new Error("Couldn't locate form data");
    }
    return (this.value = $el.val());
  }

  set_value(value) {
    this.value = value;
    return this.value;
  }

  validate() {
    return this.validate_fn(this.value);
  }

  to_yaml_obj() {
    const o = {};
    o[name] = this.value;
    return o;
  }
}
GenericInputLabelEnum.initClass();

// ## Class GenericInputValues

// Many values (field static)
class GenericInputLabelValues extends GenericInput {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_input_values');
    this.template_id = '#template-generic-values';
    this.template_setup();
  }

  constructor(options) {
    options ??= {};
    super(options);
    this.field_selector = '';
    this.value_selector = '.generic-values-value > input';
    this.field_values = options.field_values;
    this.field_values_array = this.object_to_array(this.field_values);
  }

  dom_to_properties() {
    for (var field in this.field_values) {
      //$el = $(@value_selector+"[data-field[\"#{@field}\"]")
      var value = this.field_values[field];
      var selector = this.value_selector + `[data-field=\"${field}\"]`;
      var $el = this.$container.find(selector);
      if (!$el || !($el.length > 0)) {
        throw new Error(`Couldn't locate form data - ${selector}`);
      }
      if ($el.length > 1) {
        throw new Error(`Found too many inputs [${$el.length}]`);
      }
      this.field_values[field] = $el.val();
    }
    return this;
  }

  set_field_values(field_values) {
    this.field_values = field_values;
    this.field_values_array = this.object_to_array(this.field_values);
    return this.field_values;
  }

  to_yaml_obj() {
    const o = {};
    o[this.name] = _.cloneDeep(this.field_values);
    return o;
  }
}
GenericInputLabelValues.initClass();

// ## Class GenericInputEnums

// Many enums (field static)
class GenericInputLabelEnums extends GenericInput {
  static initClass() {
    // Mixin from `Module`
    this.include(MixinMustacheSelect.prototype);

    this.logger = debug('oa:event:rules:generic_input_enums');
    this.template_id = '#template-generic-labelenums';
    this.template_setup();
  }

  constructor(options) {
    options ??= {};
    super(options);
    this.field_selector = false;
    this.value_selector = '.generic-labelenums-value > select';
    this.options_list = options.options_list;
    if (!_.isArray(this.options_list)) {
      throw new Error('InputEnums need an options_list array');
    }
    this.field_values = options.field_values;
    this.field_values_array = this.object_to_array(this.field_values);
  }

  dom_to_properties() {
    return (() => {
      const result = [];
      for (var field in this.field_values) {
        var value = this.field_values[field];
        var $el = $(this.value_selector + '[data-field["@field"]');
        if (!$el || !($el.length > 0)) {
          throw new Error("Couldn't locate form data");
        }
        if ($el.length > 1) {
          throw new Error(`Found too many inputs [${$el.length}]`);
        }
        result.push((value = $(el).val()));
      }
      return result;
    })();
  }

  set_field_values(field_values) {
    this.field_values = field_values;
    this.field_values_array = this.object_to_array(this.field_values);
    return this.field_values;
  }

  to_yaml_obj() {
    const o = {};
    o[this.name] = _.cloneDeep(this.field_values);
    return o;
  }
}
GenericInputLabelEnums.initClass();

// ## Class GenericInputFieldValue

// One field and value
class GenericInputFieldValue extends GenericInput {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_input_field_value');
    this.template_id = '#template-generic-fieldvalue';
    this.template_setup();
  }

  constructor(options) {
    options ??= {};
    super(options);
    this.field_selector = '.generic-fieldvalue-field > input';
    this.value_selector = '.generic-fieldvalue-value > input';
    this.field = options.field;
    this.value = options.value;
  }
}
GenericInputFieldValue.initClass();

// ## Class GenericInputFieldValuesBase

// For any time thats allow a list of field/value edits
// Can be of multiple types but the same concept
class GenericInputFieldValuesBase extends GenericInput {
  set_field_values(field_values) {
    this.field_values = field_values;
    this.field_values_array = this.object_to_array(this.field_values);
    return this.field_values;
  }

  to_yaml_obj() {
    const o = {};
    o[this.name] = _.cloneDeep(this.field_values);
    return o;
  }

  dom_to_properties() {
    const $els = this.container_find('.generic-fieldvalues-entry');
    const o = {};
    for (var el of $els.toArray()) {
      var field = $(el).find(this.field_selector).val();
      var value = $(el).find(this.value_selector).val();
      o[field] = value;
    }
    return this.set_field_values(o);
  }

  handlers() {
    const self = this;
    const $delete = this.container_find('.generic-delete-button');
    $delete.on('click', function (ev) {
      self.logger('delete click', ev);
      $(this).closest('tr').remove();
      return self.show_save_cancel(this);
    });
    return super.handlers();
  }

  add_new() {
    return true;
  }
}

// ## Class GenericInputFieldValues

// Many fields and values
class GenericInputFieldValues extends GenericInputFieldValuesBase {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_input_field_values');
    this.template_id = '#template-generic-fieldvalues';
    this.template_setup();
  }

  constructor(options) {
    options ??= {};
    super(options);
    this.field_selector = '.generic-fieldvalues-field > input';
    this.value_selector = '.generic-fieldvalues-value > input';
    this.entry_selector = '.generic-fieldvalues-entry';

    // Seperate row template for adding a new field easily
    this.entry_template_id = '#template-generic-fieldvaluesrow-edit';
    this.entry_template_html = $(this.entry_template_id).html();
    Mustache.parse(this.entry_template_html);

    this.set_field_values(options.field_values);
  }

  add_new_entry() {
    const blank_entry_obj = { name: '', value: '', index: this.max_index + 1, data: this };
    const $html = $(Mustache.render(this.entry_template_html, blank_entry_obj));
    this.logger('add new entry html', $html, this.entry_template_html);
    this.container_find('.generic-fieldvalues-entries').append($html);
    this.show_save_cancel();
    return $html;
  }
}
GenericInputFieldValues.initClass();

// ## Class GenericInputFieldValues

// Many fields and values
// Supports munging multiple fields of the same name into
// a `values` array.  field_transform needs this
class GenericInputFieldValuesArray extends GenericInputFieldValuesBase {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_input_values_array');
  }

  dom_to_properties() {
    const $els = this.container_find(this.entry_selector);
    const o = {};
    for (var el of $els.toArray()) {
      var field = $(el).find(this.field_selector).val();
      var value = $(el).find(this.value_selector).val();
      if (o[field] != null) {
        if (!_.isArray(o[field])) {
          o[field] = [o[field]];
        }
        o[field].push(value);
      } else {
        o[field] = value;
      }
    }
    return this.set_field_values(o);
  }

  object_to_array(values_object) {
    let index = -1;
    const arr = (() => {
      const result = [];
      for (var name in values_object) {
        var val = values_object[name];
        if (!_.isArray(val)) {
          val = [val];
        }
        result.push(
          (() => {
            const result1 = [];
            for (var value of val) {
              index++;
              result1.push({ name, value: val, index });
            }
            return result1;
          })()
        );
      }
      return result;
    })();
    this.max_index = index;
    return arr;
  }
}
GenericInputFieldValuesArray.initClass();

// ## Class GenericInputFieldEnums

// Many enums (field static)
class GenericInputFieldEnums extends GenericInputFieldValuesBase {
  static initClass() {
    // Mixin via `Module`
    this.include(MixinMustacheSelect.prototype);

    this.logger = debug('oa:event:rules:generic_input_enums');
    this.template_id = '#template-generic-fieldenums';
    this.template_setup();
  }

  constructor(options) {
    options ??= {};
    super(options);
    this.field_selector = '.generic-fieldenums-field > input';
    this.value_selector = '.generic-fieldenums-value > select';
    this.options_list = options.options_list;
    if (!_.isArray(this.options_list)) {
      throw new Error('InputEnums need an options_list array');
    }
    this.set_field_values(options.field_values);
  }

  add_new_field() {
    return true;
  }
}
GenericInputFieldEnums.initClass();

// ## Class GenericInputFieldEnums

// Many enums (field static)
class GenericInputFieldEnumsArray extends GenericInputFieldValuesArray {
  static initClass() {
    this.logger = debug('oa:event:rules:generic_input_enums_array');
    this.template_id = '#template-generic-fieldenums';
    this.template_setup();
  }

  constructor(options) {
    options ??= {};
    super(options);
    this.field_selector = '.generic-fieldenums-field > input';
    this.value_selector = '.generic-fieldenums-value > select';
    this.entry_selector = '.generic-fieldenums-entry';

    // Seperate row template for adding a new field easily
    this.entry_template_id = '#template-generic-fieldenumsrow-edit';
    this.entry_template_html = $(this.entry_template_id).html();
    Mustache.parse(this.entry_template_html);

    this.options_list = options.options_list;
    if (!_.isArray(this.options_list)) {
      throw new Error('InputEnumsArray need an options_list array');
    }
    this.set_field_values(options.field_values);
  }

  // Takes a key/value object and turns it into a Mustache renderable array
  // This includes generating the select/option array for each element
  // It also supports the array munging of multiple values
  //
  //    afield: 'whatever'
  //    bfield: [ 'whatever' ]
  //    cfield: [ 'whatever', 'otherever' ]
  //
  // into
  //
  //    {
  //      name: afield,
  //      options_list: [
  //        { value: 'whatever', selected: true, label: "Whatever" },
  //        { value: 'otherever', label: "Otherever" }
  //      ],
  //      index: 0
  //    }
  //
  object_to_array(values_object) {
    let index = -1;
    const arr = [];
    for (var name in values_object) {
      var val = values_object[name];
      if (!_.isArray(val)) {
        val = [val];
      }
      for (var value of val) {
        index++;
        // Build an options list for this name/value, setting selected if needed
        var options_list = this.generate_select_option_array(value);
        // Now we have a mustache renderable blob, add it to the array
        arr.push({ name, options_list, index });
      }
    }
    this.max_index = index;
    return arr;
  }

  generate_select_option_array(value, check_selected) {
    // Build an options list for this name/value, setting selected if needed
    let option_selected;
    check_selected ??= true;
    option_selected = false;

    // Now loop over the options list and create a `{ value: 'a', label: 'A', selected: true }` list
    const list = (() => {
      const result = [];
      for (var select_option of this.options_list) {
        var new_option = _.defaults({}, select_option);
        if (new_option.value === value) {
          new_option.selected = true;
          option_selected = true;
        }
        if (!new_option.label) {
          new_option.label = value;
        }
        result.push(new_option);
      }
      return result;
    })();

    if (check_selected && !option_selected) {
      Message.exception(
        'Invalid select value',
        `The Field [${name}] has a value that is not available [${value}]. Saving the rule will reset the value to one of the allowed values`
      );
    }

    return list;
  }

  add_new_entry() {
    const options_list = this.generate_select_option_array('', false);
    const blank_entry_obj = { name: '', options_list, index: this.max_index + 1, data: this };
    const $html = $(Mustache.render(this.entry_template_html, blank_entry_obj));
    this.logger('add new entry html', $html, this.entry_template_html);
    this.container_find('.generic-fieldenum-entries').append($html);
    this.show_save_cancel();
    return $html;
  }
}
GenericInputFieldEnumsArray.initClass();

window.MixinMustacheSelect = MixinMustacheSelect;
window.GenericGroup = GenericGroup;
window.GenericInput = GenericInput;
window.GenericInputLabelValue = GenericInputLabelValue;
window.GenericInputLabelEnum = GenericInputLabelEnum;
window.GenericInputLabelValues = GenericInputLabelValues;
window.GenericInputLabelEnums = GenericInputLabelEnums;
window.GenericInputFieldValue = GenericInputFieldValue;
window.GenericInputFieldValuesBase = GenericInputFieldValuesBase;
window.GenericInputFieldValues = GenericInputFieldValues;
window.GenericInputFieldValuesArray = GenericInputFieldValuesArray;
window.GenericInputFieldEnums = GenericInputFieldEnums;
window.GenericInputFieldEnumsArray = GenericInputFieldEnumsArray;
