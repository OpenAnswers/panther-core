# ## Form

# Form helper functions

class Form

  # Take a jquery reference to a form and turn the fields into object
  # <input type="text" name="blah" value="test">
  # <input type="hidden" name="foo" value="bar">
  # data:
  #   blah: "test"
  #   foo: "bar"
  @form_to_object: ( form )->
    data = {}
    debug_global 'form arr', form, form.serializeArray()
    form.serializeArray().map ( x )->
      debug_global 'form name val', x.name, x.value
      data[x.name] = x.value
    data

  # retrieve an elements parent form
  @get_elements_form: ( that )->
    $(that).parentsUntil('form').parent()