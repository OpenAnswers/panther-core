// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// ----------------------------------------------------------------

class NewRule {
  static initClass() {
    this.logger = debug('oa:event:rules:new');

    // Store for server groups and fields response
    this.groups = null;
    this.fields = null;

    // TODO consider allowing tally to be displayed
    this.fields_to_hide = [
      'tally',
      'autoincr_id',
      'history',
      'notes',
      'matches',
      '__v',
      '_id',
      'identifier',
      'occurrences',
    ];
    this.fields_manual_layout = ['summary', 'tag', 'severity', 'node'];

    this.$event_highlight = $('#template-event-highlight').html();
    Mustache.parse(this.$event_highlight);

    this.$rule_view = $('#template-rule-view').html();
    Mustache.parse(this.$rule_view);

    // ### matches tab
    this.matches_global_template = $('#event-details-matches-global-row-template').html();
    this.matches_group_template = $('#event-details-matches-group-row-template').html();
    this.matches_rule_template = $('#event-details-matches-rule-row-template').html();
    Mustache.parse(this.matches_global_template);
    Mustache.parse(this.matches_group_template);
    Mustache.parse(this.matches_rule_template);

    this.highlight_match_class = 'reference-event-entry-match';
    this.highlight_no_match_class = 'reference-event-entry-no-match';
  }

  static populate_group_select() {
    $('.new-rule-select-groups').html('');
    return this.groups.map(group => $('.new-rule-select-groups').append($('<option>', { value: group, text: group })));
  }

  static setup_rule() {
    this.rule = Rule.generate(
      { _initial: true },
      {
        index: 0,
        //rule_set: @
        //event_rules: @event_rules
        new: true,
        render: true,
      }
    );

    $('#new-rule').append(this.rule.$container);

    this.rule.enable_editing();

    // Remove the Rule title buttons
    this.rule.$container.find('.title > .right').addClass('hidden');

    // Fix the rule padding for removed buttons
    $('.rule-name-edit').css('padding-right', '15px');

    // Add our special buttons create/cancel buttons
    const template_create_buttons = $('#template-new-rule-buttons').html();
    $('.edit-warning .right').html(template_create_buttons);
    return $('.edit-warning').removeClass('collapse');
  }

  static setup() {
    const self = this;

    const retrieve = {
      fields: Data.getFields(),
      groups: Data.getGroupNames(),
    };

    return Promise.props(retrieve).then(function (results) {
      self.logger('Got groupsfields', results.groups);
      self.groups = results.groups;
      self.populate_group_select();

      self.logger('Got fields', results.fields);
      self.fields = results.fields;

      self.setup_rule();

      self.handle_rule_type_select();
      self.handle_rule_create();
      self.handle_rule_cancel();

      // Have we been passed an existing event to compare
      // against? If so, fetch the data and show the relevant UI.
      self.handleEventContext();
      return self.showServerRules();
    });
  }

  static handle_rule_type_select() {
    // Add a handler for the _Rule Type_ selection
    return $('.new-rule-type').on('input, change', function (ev) {
      const type = $(ev.target).val();
      switch (type) {
        case 'globals':
          $('.new-rule-select-agent').addClass('hidden');
          $('.new-rule-select-groups').addClass('hidden');
          this.type = 'server';
          return (this.sub_type = 'globals');
        case 'groups':
          $('.new-rule-select-agent').addClass('hidden');
          $('.new-rule-select-groups').removeClass('hidden');
          this.type = 'server';
          this.sub_type = 'groups';
          return (this.group = '');
        case 'agent':
          $('.new-rule-select-agent').removeClass('hidden');
          $('.new-rule-select-groups').addClass('hidden');
          this.type = 'agent';
          return (this.sub_type = '');
        default:
          return console.error('Unknown rule type', type);
      }
    });
  }

  static handle_rule_create() {
    const self = this;
    return $('.new-rule-create-btn').on('click', ev =>
      self
        .submit_rule()
        .then(result => (window.location.href = self.selected_type_url()))
        .catch(error => Message.error(error))
    );
  }

  static handle_rule_cancel() {
    const self = this;
    return $('.new-rule-cancel-btn').on('click', ev => history.go(-1));
  }

  static onSelectsChange() {
    const self = this;
    let verdict = true;
    self.highlight_match_reset();
    self.highlight_regex_reset();
    self.rule.selects.each_instance(function (select) {
      const res = select.test_event(self.event);
      if (!res) {
        verdict = false;
      }
      self.logger('Check select [%s] results [%s]', select.verb, res);
      if (select.field != null) {
        self.highlight_match(select.field, res);
        return self.highlight_regex(select.field, select.value, res);
      }
    });
    return self.highlight_verdict(verdict);
  }

  static handleEventContext() {
    const self = this;
    const event_id = window.location.hash.replace(/#/g, '');
    if (event_id === '') {
      return;
    }

    // fetch the event from the server using the id
    this.logger(`New event with event context. id[${event_id}]`);
    socket.emit('event::details', { id: event_id }, function (error, data) {
      if (error) {
        return Message.error(JSON.stringify(error));
      }
      $('#reference-event').removeClass('collapse');
      self.logger('Received event data', data);
      self.event = data;
      //for k,v of data when v != "" and k not in fieldsToHide
      const rows = [];
      for (var first of self.fields_manual_layout) {
        rows.push({ key: first, value: data[first] });
      }
      for (var key in data) {
        var value = data[key];
        if (!self.fields_to_hide.includes(key) && !self.fields_manual_layout.includes(key)) {
          rows.push({ key, value });
        }
      }

      const html_str = Mustache.render(self.$event_highlight, { rows });
      return $('#reference-event-container').append(html_str);
    });

    this.clearMatchVerdict();

    $('.selects').on('click', '.select-delete-button', function (ev) {
      self.logger('select deleted', ev);
      return self.onSelectsChange();
    });

    // Add event handler so highlighting happens for any selects that
    // specify a field.
    // Note this is bound to the `.selects` container, so will fire after
    // the event to retrieve cata attached to the the select `input` itself,
    // as the event bubbles up.
    // @ev: JQuery event
    // bootstrap-3-typeahead 4.x fires `change` on select; native inputs fire `input`
    return $('.selects').on('input change', 'input', function (ev) {
      self.logger('select change', ev);
      return self.onSelectsChange();
    });
  }

  // query the server for other rules that would match the event
  static showServerRules() {
    const self = this;
    this.matches_global = $('#event-details-modal-global-matches-table tbody');
    this.matches_group = $('#event-details-modal-group-matches-table tbody');

    const event_id = window.location.hash.replace(/#/g, '');
    if (event_id === '') {
      return;
    }

    return socket.emit('event_rules::query::id', { id: event_id }, function (error, data) {
      let render_data;
      self.logger('query::id', data);
      if (error) {
        return Message.error(JSON.stringify(error));
      }

      $('#also-rules').removeClass('collapse');
      // build template data

      const global_matches = data.global ?? [];
      const group_matches = data.group ?? [];

      const total_matches = global_matches.length + group_matches.length;
      let also_str = 'Also matched ' + total_matches + ' other rules (';
      if (global_matches.length > 0) {
        also_str += 'global: ' + global_matches.length;
      }
      if (group_matches.length > 0) {
        also_str += ' group: ' + group_matches.length;
      }
      also_str += ')';

      $('#also-rules > .title > p').html(also_str);
      self.logger(also_str);

      self.matches_global.html('');
      self.matches_group.html('');

      if (global_matches.length === 0) {
        self.matches_global.append('<tr><td>No matches</td></tr>');
      }

      if (group_matches.length === 0) {
        self.matches_group.append('<tr><td>No matches</td></tr>');
      }

      for (var glmatch of global_matches) {
        render_data = {
          name: glmatch.name,
          uuid: glmatch.uuid.split('-')[0],
          uuid_full: glmatch.uuid,
        };
        console.log(render_data);
        self.matches_global.append(Mustache.render(self.matches_global_template, render_data));
      }
      return (() => {
        const result = [];
        for (var grmatch of group_matches) {
          render_data = {
            group_name: grmatch.group_name,
            group_uuid: grmatch.group_uuid.split('-')[0],
            group_uuid_full: grmatch.group_uuid,
          };
          self.matches_group.append(Mustache.render(self.matches_group_template, render_data));
          result.push(
            (() => {
              const result1 = [];
              for (var rumatch of grmatch.matches) {
                var rule_data = {
                  name: rumatch.name,
                  uuid: rumatch.uuid.split('-')[0],
                  uuid_full: rumatch.uuid,
                };
                result1.push(self.matches_group.append(Mustache.render(self.matches_rule_template, rule_data)));
              }
              return result1;
            })()
          );
        }
        return result;
      })();
    });
  }
  //self.logger "MATCHES", self.matches_el
  //true

  static hideServerRules() {
    $('#also-matched-rules').html('');
    return $('#also-rules').addClass('collapse');
  }

  static highlight_verdict(result) {
    const $verdict = $('#reference-event-verdict');
    if (result) {
      $verdict.removeClass('reference-event-verdict-red');
      $verdict.addClass('reference-event-verdict-green');
      return $verdict.find('.inner').html('Your rule would select the reference event');
      // TODO emit the "event"" to API for checking what other rules match
    } else {
      $verdict.removeClass('reference-event-verdict-green');
      $verdict.addClass('reference-event-verdict-red');
      return $verdict.find('.inner').html('Your rule would NOT match the reference event.');
    }
  }

  static highlight_match_reset() {
    $('.reference-event-entry').removeClass(this.highlight_match_class);
    return $('.reference-event-entry').removeClass(this.highlight_no_match_class);
  }

  static highlight_match(field, result) {
    const selector = `.reference-event-entry[data-field=\"${field}\"]`;
    const $elem = $(selector);
    this.logger('Highlight $elem', selector, $elem, field, result);
    if (result) {
      $elem.removeClass(this.highlight_no_match_class);
      return $elem.addClass(this.highlight_match_class);
    } else {
      $elem.removeClass(this.highlight_match_class);
      return $elem.addClass(this.highlight_no_match_class);
    }
  }

  static highlight_regex_reset() {
    const self = this;
    const selector = '.reference-event-entry td.reference-event-highlight-value';
    return $(selector).each(function (index, element) {
      self.logger('Reset index [%s] elem [%s] ', index, element);
      const reference_value = $(element).attr('data-value');
      return $(element).html(reference_value);
    });
  }

  static highlight_regex(field, regex_value, result) {
    const selector = `.reference-event-entry[data-field=\"${field}\"] .reference-event-highlight-value`;
    const $elem = $(selector);

    const regexes = Helpers.regex_from_array(regex_value);
    this.logger('Highlight regex on $elem', selector, regexes);
    return $elem.highlightRegex(regexes);
  }

  // ###### `@refEntryMatches()`
  static refEntryMatches(elem, yn) {
    if (yn) {
      $(elem).removeClass('entry-nomatch');
      return $(elem).addClass('entry-match');
    } else {
      $(elem).removeClass('entry-match');
      return $(elem).addClass('entry-nomatch');
    }
  }

  // ###### `@setMatchVerdict()`
  static setMatchVerdict(yn) {
    const verdictElem = $('#reference-event-verdict');
    const verdictInnerElem = $(verdictElem).find('#inner');
    if (yn) {
      $(verdictElem).removeClass('reference-event-verdict-red');
      $(verdictElem).addClass('reference-event-verdict-green');
      return $(verdictInnerElem).html('This reference event would be matched by your rule.');
    } else {
      $(verdictElem).removeClass('reference-event-verdict-green');
      $(verdictElem).addClass('reference-event-verdict-red');
      return $(verdictInnerElem).html('This reference event would <strong>NOT</strong> be matched by your rule.');
    }
  }

  static clearMatchVerdict() {
    const verdictElem = $('#reference-event-verdict');
    const verdictInnerElem = $(verdictElem).find('.inner');
    $(verdictElem).removeClass('reference-event-verdict-green');
    $(verdictElem).removeClass('reference-event-verdict-red');
    return $(verdictInnerElem).html('No selectors have been added yet.');
  }

  // ----------------------------------------------------------------
  // Reset all state highlighting for a reference field entry.

  static reset_reference_entry(field) {
    const $elem = `tr[data-field=\"${field}\"`;
    $elem.removeClass('reference-event-entry-match');
    return $elem.removeClass('reference-event-entry-nomatch');
  }

  // ----------------------------------------------------------------
  // Reset all state highlighting for a reference field entry.

  static resetRefMouseState(elem) {
    // Clear green/red background colour
    return $(elem).removeClass('selector-reference-mouseover');
  }

  // ----------------------------------------------------------------
  //

  static resetAllRefEntries(resetMouseOverState) {
    resetMouseOverState ??= false;
    return $('#reference-event-container .entry').each(function (index, element) {
      resetRefEntry(element);
      if (resetMouseOverState) {
        return resetRefMouseState(element);
      }
    });
  }

  // ----------------------------------------------------------------
  // Iterate through all reference fields, check whether they have
  // a selector, then compare the selector against the reference
  // field.

  static evalAllSelectorsAgainstRef() {
    resetAllRefEntries(true);
    const failCount = -1;
    const result = this.rule.selects.test_event(this.reference);
    return setMatchVerdict(result);
  }

  // ####### `@getGroups( callback_fn )`
  static get_groups_Async() {
    const self = this;
    return new Promise((resolve, reject) =>
      $.get('/api/groups', function (data) {
        self.logger('Retreived groups from api', data);
        self.group_names = data.data;
        return resolve(data.data);
      }).fail(error => reject(error))
    );
  }

  // ####### `@getGroups( callback_fn )`
  static get_fields_Async() {
    const self = this;
    return new Promise((resolve, reject) =>
      $.get('/api/groups', function (data) {
        self.logger('Retreived groups from api', data);
        self.group_names = data.data;
        return resolve(data.data);
      }).fail(error => reject(error))
    );
  }

  // ###### `@dom_to_type`
  // Take the selected type in the UI, turn it into a `type` and `sub_type`
  // for a socketio message
  static dom_to_type() {
    const selected_type = this.selected_type();
    this.logger('selected_type', selected_type);
    const o = {};
    switch (selected_type) {
      case 'globals':
        o.type = 'server';
        o.sub_type = 'globals';
        break;
      case 'groups':
        o.type = 'server';
        o.sub_type = 'groups';
        o.group = this.selected_group();
        break;
      case 'agent':
        o.type = 'agent';
        o.sub_type = this.selected_agent();
        break;
      default:
        throw new ValidationError('No rule type selected');
    }
    return o;
  }

  // Get the selected type from the dom input
  static selected_type() {
    const selected_type = $('input:checked[name="new-rule-type"]').val();
    if (!selected_type) {
      throw new ValidationError("Couldn't find a value for the selected rule type");
    }
    return selected_type;
  }

  // Get the selected group from the dom select
  static selected_group() {
    const group = $('select.new-rule-select-groups').val();
    if (group == null) {
      throw new ValidationError("Couldn't find a value for the group selection");
    }
    return group;
  }

  // Get the selected agent from the dom select
  static selected_agent() {
    const agent = $('select.new-rule-select-agent').val();
    if (agent == null) {
      throw new ValidationError("Couldn't find a value for the agent selection");
    }
    return agent;
  }

  static selected_type_message() {
    const selected_type = this.selected_type();
    switch (selected_type) {
      case 'globals':
        return 'Global rule created';
      case 'groups':
        return `Group rule created for ${this.selected_group()}`;
      case 'agent':
        return `Agent rule created for ${this.selected_agent()}`;
      default:
    }
  }

  // ###### `@selected_type_url`
  // Generate a url for the selected rule type
  static selected_type_url() {
    const selected_type = this.selected_type();
    switch (selected_type) {
      case 'globals':
        return '/rules/globals';
      case 'groups':
        return '/rules/groups';
      case 'agent':
        var agent = this.selected_agent();
        return `/rules/agent/${agent}`;
      default:
        throw new ValidationError('No agent defined', {
          field: 'selected_type',
          value: selected_type,
        });
    }
  }

  // ###### `@submit_rule`
  // Save to the new rule to a server rule set.
  // Send the user to the relevent url on success
  static submit_rule() {
    const self = this;
    return new Promise(function (resolve, reject) {
      const msg = self.dom_to_type();
      msg.data = {};
      msg.data.rule = self.rule.dom_to_yaml_obj();
      self.logger('Sending create with', msg);
      return socket.emit('event_rules::rule::create', msg, function (err, data) {
        if (err) {
          return reject(ErrorType.from_object(err));
        }
        Message.info_label('Rule Created', self.selected_type_message());
        return resolve(msg);
      });
    });
  }
}
NewRule.initClass();

window.NewRule = NewRule;

// On DOM ready — after class definition because module scripts are deferred
$(() => NewRule.setup());
