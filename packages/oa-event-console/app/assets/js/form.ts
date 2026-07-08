// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// ## Form

// Form helper functions

class Form {
  // Take a jquery reference to a form and turn the fields into object
  // <input type="text" name="blah" value="test">
  // <input type="hidden" name="foo" value="bar">
  // data:
  //   blah: "test"
  //   foo: "bar"
  static form_to_object(form) {
    const data = {};
    debug_global('form arr', form, form.serializeArray());
    form.serializeArray().map(function (x) {
      debug_global('form name val', x.name, x.value);
      return (data[x.name] = x.value);
    });
    return data;
  }

  // retrieve an elements parent form
  static get_elements_form(that) {
    return $(that).parentsUntil('form').parent();
  }
}

window.Form = Form;

// Live "turn red while typing" validation for `form[data-toggle="validator"]`.
// Delegated so it works for templates rendered dynamically after DOM ready.
// Toggles `.has-error` on the closest `.form-group` based on HTML5
// `checkValidity()` for any descendant `[required]` input/textarea/select.
$(document).on('input change focusout', 'form[data-toggle="validator"] :input[required]', function () {
  const el = this as HTMLInputElement;
  const $fg = $(el).closest('.form-group');
  if (!$fg.length) return;
  $fg.toggleClass('has-error', !el.checkValidity());
});
