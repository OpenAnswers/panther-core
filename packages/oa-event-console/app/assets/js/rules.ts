// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
$(function () {
  //# Add rules magical form

  // This form builds as you submit

  // stop enter submitting the form
  $("#add_rule_parts .form-control[type='text']").keydown(function (ev) {
    if (ev.which === 13) {
      return ev.preventDefault();
    }
  });

  // Make the enter key show the next bit
  $('#add_rule_parts_name_input').keyup(function (ev) {
    if (ev.keyCode === 13) {
      console.log('showing!', ev.keyCode);
      $('#add_rule_parts_selects').removeClass('hide');
      return $('#add_rule_parts_selects_input').focus();
    }
  });

  // Make the enter key show the next bit
  $('#add_rule_parts_selects_input').keyup(function (ev) {
    if (ev.keyCode === 13) {
      return console.log('creating select!', $(ev.target).val());
    }
  });

  // The trash popover creator
  // Need to pass a rule ID around somehow
  const popover_trash_content = $('#rule_trash_popover').html();
  $(".trash[data-toggle='popover']").popover({
    html: true,
    content: popover_trash_content,
  });

  const popover_insert_content = $('#rule_insert_popover').html();
  $(".insert[data-toggle='popover']").popover({
    html: true,
    content: popover_insert_content,
  });

  // Attaching event to buttons is a bit wierd in
  // bootstrap due to the way they are triggered internally
  // To catch the event after bootstrap, attach the click
  // event to body
  // https://github.com/twbs/bootstrap/issues/2380
  $('body').on('click', '#rule_trash_popover_delete', function () {
    return console.log('rule baleeted!', $(this).parents('.rule').hide());
  });

  $('body').on('click', '#rule_insert_popover_before', function () {
    const rule = $(this).parents('.rule');
    console.log('rule add insert before!', rule);
    const insert_rule = $('#add_rule_container').clone();
    insert_rule.attr('id', 'add_rule_container_44');
    return insert_rule.insertBefore(rule);
  });

  $('body').on('click', '#rule_insert_popover_after', function () {
    const rule = $(this).parents('.rule');
    console.log('rule add insert after!', rule);
    const insert_rule = $('#add_rule_container').clone();
    insert_rule.attr('id', 'add_rule_container_46');
    return insert_rule.insertAfter(rule);
  });

  // stop enter submitting the form
  $("#add_rule .form-control[type='text']").keydown(function (ev) {
    if (ev.which === 13) {
      return ev.preventDefault();
    }
  });

  // stop enter submitting the form
  $('#trash_delete').click(function (ev) {
    return $(this).parents('.rule').hide();
  });

  // Make the enter key go to next focus
  $("#add_rule .form-control[type='text']").keyup(function (ev) {});
  //if ev.keyCode == 13
  //inputs = $(this).closest('form').find ':input[type="text"][tabindex!="-1"]'
  //inputs.eq( inputs.index(this)+ 1 ).focus()

  // Select everything on focus. Makes retyping easier
  $("#add_rule .form-control[type='text']").focus(function () {
    return $(this).select();
  });

  // Select everything on click
  $("#add_rule .form-control[type='text']").click(function () {
    return $(this).select();
  });

  // Apply to all the select fields
  // This would need to be updated as fields are
  // added and removed. The event handlers would need
  // to be updated as well (maybe?)
  const selects_selector = `#select1, #select2, #select2or, \
#select3, #select4, #select5, #select6, \
#select7, #select8, #select9, #select10, \
#select11, #select12`;

  // Show - and or on focus
  $(selects_selector)
    .find(':input')
    .focus(function () {
      console.log('focus mouseenter');
      return $(this).parentsUntil('#add_rule').find('.btn.remove, .btn.add_or').removeClass('invisible');
    });

  // Hide - and or on blur
  $(selects_selector)
    .find(':input')
    .blur(function () {
      console.log('focus mouseenter');
      return $(this).parentsUntil('#add_rule').find('.btn.remove, .btn.add_or').addClass('invisible');
    });

  // Show - and or on mouseover
  $(selects_selector).mouseenter(function () {
    console.log('select mouseleave', this.id);
    return $(`#${this.id} .btn.remove, #${this.id} .btn.add_or`).removeClass('invisible');
  });

  // Hide - and or on mouseout
  $(selects_selector).mouseleave(function () {
    console.log('select mouseleave', this.id);
    return $(`#${this.id} .btn.remove, #${this.id} .btn.add_or`).addClass('invisible');
  });

  // Dropdown on focus
  $('#select_matches_dropdown').focus(function () {
    console.log('dropdown focus!');
    //$('#select1 .dropdown').dropdown()
    return $('#select1 .dropdown').addClass('open');
  });

  // Dropdown on blur
  $('#select1 .dropdown').blur(function () {
    console.log('dropdown blue!');
    //$('#select1 .dropdown').dropdown()
    return $('#select1 .dropdown').removeClass('open');
  });

  const typeahead_defaults = {
    minLength: 0,
    showHintOnFocus: true,
    autoSelect: true,
    items: 'all',
  };

  // Typeahead
  $('.selects_typeahead').typeahead(
    _.defaults(
      {
        source: selects_list,
        nextFocus: '#add_rule_selects_match_field_input',
        prevFocus: '#add_rule_name_input',
      },
      typeahead_defaults
    )
  );

  // Typeahead
  $('.actions_typeahead').typeahead(
    _.defaults(
      {
        source: actions_list,
        nextFocus: '#add_rule_actions_replace_input',
        prevFocus: '#add_rule_selects_match_input',
      },
      typeahead_defaults
    )
  );

  // Typeahead
  $('.option_typeahead').typeahead(
    _.defaults(
      {
        source: options_list,
        nextFocus: '#add_rule_create',
        prevFocus: '#add_rule_action_input',
      },
      typeahead_defaults
    )
  );

  // Keys on a bootstrap dropdown.
  // not quite working.
  $('#select_dropdown').on('shown.bs.dropdown', function () {
    console.log('dropdown shown!');
    const dropdown_el = $(this);

    return $(document).keypress(function (e) {
      let i, el;
      const key = String.fromCharCode(e.which);

      console.log('selects_list', selects_list, key);

      const matches = (() => {
        const result = [];
        for (i = 0; i < selects_list.length; i++) {
          var select = selects_list[i];
          if (select.charAt(0).toLowerCase() === key) {
            result.push(`${select} ${i}`);
          }
        }
        return result;
      })();

      console.log('matches', matches);
      console.log('active', dropdown_el.find('li.active'));

      const active = (() => {
        const result1 = [];
        for (i = 0; i < all_li.length; i++) {
          el = all_li[i];
          if ($(el).hasClass('active')) {
            result1.push(i);
          }
        }
        return result1;
      })();

      var all_li = dropdown_el.find('li');
      console.log('selected', all_li);

      return (() => {
        const result2 = [];
        for (el of all_li) {
          if ($(el).text().charAt(0).toLowerCase() === key) {
            console.log('data', $(el).data('name'));
            console.log('selected');
            if ($(el).hasClass('active')) {
              $(el).removeClass('active');
              continue;
            }
            $(el).addClass('active');
            break;
          } else {
            result2.push($(el).removeClass('active'));
          }
        }
        return result2;
      })();
    });
  });

  // unbind key event when dropdown is hidden
  return $('#select_dropdown').on('hide.bs.dropdown', function () {
    console.log('dropdown hide!');
    return $(document).unbind('keypress');
  });
});
