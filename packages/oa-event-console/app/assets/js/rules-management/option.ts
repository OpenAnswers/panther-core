// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Option

// Options are verbs that modify behaviour but dont
// fit in the select/action grouping. So they apply
// no matter what selects you have setup
//
// - skip - enable or disable a rule, like commenting it out
// - debug - TBA but you get the drift

// ## Class OptionBase

class OptionBase extends RuleVerbBase {
  static initClass() {
    this.verb_type = 'option';
    this.dom_name = this.verb_type;
    this.dom_class = 'option-entry';

    this.template_id = '#template-option-boolean';
    this.generate_templates();
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger(`generate() the ${this.verb_type} '${this.verb}' from yaml`, yaml_def, options);
    if (yaml_def[this.verb] == null) {
      throw new Error(`No '${this.verb}' to generate`);
    }
    if (!yaml_def[this.verb]) {
      this.logger(`generate() found a false value for [${this.verb}], dumping out`);
      return false;
    }
    const opts = { value: yaml_def[this.verb] };
    return new this(_.defaults(opts, options));
  }

  constructor(options) {
    super(options);
    this.value = options.value;
  }

  remove() {
    return this.rule.options.remove(this);
  }

  dom_to_properties() {
    //@value = @get_dom_input 'value'
    // Existence means makes options true so there is no data to get.
    // Deletion means false
    return (this.value = true);
  }

  // Note the skipping of falsey values
  // And true/false only nature
  to_yaml_obj() {
    const o = {};
    if (this.value) {
      o[this.verb] = !!this.value;
    }
    return o;
  }
}
OptionBase.initClass();

// ## Class OptionDebug

class OptionDebug extends OptionBase {
  static initClass() {
    this.logger = debug('oa:event:rules:option_debug');

    this.verb = 'debug';
    this.label = 'Debug';
    this.verb_english = 'Enable debug';
    this.help = 'Create debug logging for this rule as events pass through';

    // This isn't active yet
    this.disabled = true;
  }
}
OptionDebug.initClass();

// ## Class OptionSkip

class OptionSkip extends OptionBase {
  static initClass() {
    this.logger = debug('oa:event:rules:option_skip');

    this.verb = 'skip';
    this.label = 'Skip';
    this.verb_english = 'Skip this rule';
    this.help = 'Skip processing of this rule but keep it in the list. Useful for debugging';
  }
}
OptionSkip.initClass();

// ------------------------------------------------------------
// ## Class OptionsTypes

class OptionTypes extends RuleVerbTypes {
  static initClass() {
    this.logger = debug('oa:event:rules:options');

    this.verb_type = 'option';

    this.types = {
      debug: OptionDebug,
      skip: OptionSkip,
    };
  }
}
OptionTypes.initClass();

// ------------------------------------------------------------
// ## Class Options

// Stores the types of options and the list of option instances
class Options extends RuleVerbSet {
  static initClass() {
    this.logger = debug('oa:event:rules:options');

    this.verb_type = 'option';
    this.verb_lookup_class = OptionTypes;
    this.verb_class = OptionBase;
  }

  static generate(yaml_def, options) {
    const option_list = super.generate(yaml_def, options);
    const option_reject_list = _.reject(option_list, { value: true });
    this.logger('generate() is rejecting these false gods:', option_reject_list);
    return option_list;
  }
}
Options.initClass();

window.OptionBase = OptionBase;
window.OptionDebug = OptionDebug;
window.OptionSkip = OptionSkip;
window.OptionTypes = OptionTypes;
window.Options = Options;
