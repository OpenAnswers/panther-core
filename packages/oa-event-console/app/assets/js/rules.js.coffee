
$ ->


  ## Add rules magical form

  # This form builds as you submit

  # stop enter submitting the form
  $("#add_rule_parts .form-control[type='text']").keydown (ev) ->
    if ev.which == 13
      ev.preventDefault()

  # Make the enter key show the next bit
  $("#add_rule_parts_name_input").keyup (ev) ->
    if ev.keyCode == 13
      console.log 'showing!', ev.keyCode
      $('#add_rule_parts_selects').removeClass('hide')
      $('#add_rule_parts_selects_input').focus()

  # Make the enter key show the next bit
  $("#add_rule_parts_selects_input").keyup (ev) ->
    if ev.keyCode == 13
      console.log 'creating select!', $(ev.target).val()


  # The trash popover creator
  # Need to pass a rule ID around somehow
  popover_trash_content = $("#rule_trash_popover").html()
  $(".trash[data-toggle='popover']").popover
    html: true
    content: popover_trash_content

  popover_insert_content = $("#rule_insert_popover").html()
  $(".insert[data-toggle='popover']").popover
    html: true
    content: popover_insert_content


  # Attaching event to buttons is a bit wierd in
  # bootstrap due to the way they are triggered internally
  # To catch the event after bootstrap, attach the click
  # event to body
  # https://github.com/twbs/bootstrap/issues/2380
  $('body').on 'click', '#rule_trash_popover_delete', ->
    console.log 'rule baleeted!', $(this).parents('.rule').hide()

  $('body').on 'click', '#rule_insert_popover_before', ->
    rule = $(this).parents('.rule')
    console.log 'rule add insert before!', rule
    insert_rule = $("#add_rule_container").clone()
    insert_rule.attr "id","add_rule_container_44"
    insert_rule.insertBefore rule

  $('body').on 'click', '#rule_insert_popover_after', ->
    rule = $(this).parents('.rule')
    console.log 'rule add insert after!', rule
    insert_rule = $("#add_rule_container").clone()
    insert_rule.attr "id","add_rule_container_46"
    insert_rule.insertAfter rule


  # stop enter submitting the form
  $("#add_rule .form-control[type='text']").keydown (ev) ->
    if ev.which == 13
      ev.preventDefault()

  # stop enter submitting the form
  $("#trash_delete").click (ev) ->
    $(this).parents('.rule').hide()

  # Make the enter key go to next focus
  $("#add_rule .form-control[type='text']").keyup (ev) ->
    #if ev.keyCode == 13
      #inputs = $(this).closest('form').find ':input[type="text"][tabindex!="-1"]'
      #inputs.eq( inputs.index(this)+ 1 ).focus()

  # Select everything on focus. Makes retyping easier
  $("#add_rule .form-control[type='text']").focus ->
    $(this).select()

  # Select everything on click
  $("#add_rule .form-control[type='text']").click ->
    $(this).select()


  # Apply to all the select fields
  # This would need to be updated as fields are
  # added and removed. The event handlers would need
  # to be updated as well (maybe?)
  selects_selector = '#select1, #select2, #select2or,
    #select3, #select4, #select5, #select6,
    #select7, #select8, #select9, #select10,
    #select11, #select12'


  # Show - and or on focus
  $(selects_selector).find(':input').focus ->
    console.log 'focus mouseenter'
    $(this).parentsUntil('#add_rule').find('.btn.remove, .btn.add_or')
    .removeClass 'invisible'

  # Hide - and or on blur
  $(selects_selector).find(':input').blur ->
    console.log 'focus mouseenter'
    $(this).parentsUntil('#add_rule').find('.btn.remove, .btn.add_or')
    .addClass 'invisible'

  # Show - and or on mouseover
  $(selects_selector).mouseenter ->
    console.log 'select mouseleave', this.id
    $("##{this.id} .btn.remove, ##{this.id} .btn.add_or")
    .removeClass 'invisible'

  # Hide - and or on mouseout
  $(selects_selector).mouseleave ->
    console.log 'select mouseleave', this.id
    $("##{this.id} .btn.remove, ##{this.id} .btn.add_or")
    .addClass 'invisible'

  # Dropdown on focus
  $('#select_matches_dropdown').focus () ->
    console.log 'dropdown focus!'
    #$('#select1 .dropdown').dropdown()
    $('#select1 .dropdown').addClass 'open'

  # Dropdown on blur
  $('#select1 .dropdown').blur () ->
    console.log 'dropdown blue!'
    #$('#select1 .dropdown').dropdown()
    $('#select1 .dropdown').removeClass 'open'

  typeahead_defaults =
    minLength: 0
    showHintOnFocus: true
    autoSelect: true
    items: 'all'

  # Typeahead
  $('.selects_typeahead').typeahead _.defaults
    source: selects_list
    nextFocus: '#add_rule_selects_match_field_input'
    prevFocus: '#add_rule_name_input'
  , typeahead_defaults

  # Typeahead
  $('.actions_typeahead').typeahead _.defaults
    source: actions_list
    nextFocus: '#add_rule_actions_replace_input'
    prevFocus: '#add_rule_selects_match_input'
  , typeahead_defaults

  # Typeahead
  $('.option_typeahead').typeahead _.defaults
    source: options_list
    nextFocus: '#add_rule_create'
    prevFocus: '#add_rule_action_input'
  , typeahead_defaults


  # Keys on a bootstrap dropdown.
  # not quite working.
  $('#select_dropdown').on 'shown.bs.dropdown', ->
    console.log 'dropdown shown!'
    dropdown_el = $(this)
    
    $(document).keypress (e) ->
      key = String.fromCharCode e.which
      
      console.log 'selects_list', selects_list, key

      matches = for select,i in selects_list when select.charAt(0).toLowerCase() is key
        "#{select} #{i}"

      console.log 'matches', matches
      console.log 'active', dropdown_el.find "li.active"

      active = (i for el, i in all_li when $(el).hasClass 'active')

      all_li = dropdown_el.find "li"
      console.log 'selected', all_li

      for el in all_li
        if $(el).text().charAt(0).toLowerCase() == key
          console.log 'data', $(el).data 'name'
          console.log 'selected'
          if $(el).hasClass 'active'
            $(el).removeClass "active"
            continue
          $(el).addClass 'active'
          break
        else
          $(el).removeClass "active"


  # unbind key event when dropdown is hidden
  $('#select_dropdown').on 'hide.bs.dropdown', ->
    console.log 'dropdown hide!'
    $(document).unbind("keypress")