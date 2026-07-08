// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_syslog = debug('oa:event:rules:syslog');

class RuleSyslog {
  static initClass() {
    this.mustache = {
      levels: {
        template: $('#rules-syslog-levels-template').html(),
        element: $('#rules-syslog-levels'),
      },
      fields: {
        template: $('#rules-syslog-fields-template').html(),
        element: $('#rules-syslog-fields'),
      },
      identifier: {
        template: $('#rules-syslog-identifier-template').html(),
        element: $('#rules-syslog-identifier'),
      },
    };
  }
  // transforms:
  //   template: $('#rules-syslog-transforms-template').html()
  //   element:  $('#rules-syslog-transforms')

  // Render a type of template
  static render_type(type, data) {
    debug_syslog('render_type', type, data);
    if (this.mustache[type] == null) {
      console.log('ERROR: No setup for type [%s]', type);
      return;
    }
    const { element } = this.mustache[type];
    const { template } = this.mustache[type];
    if (!element) {
      console.log('ERROR: No element for type [%s]');
      return;
    }
    if (!template) {
      console.log('ERROR: No template for type [%s]');
      return;
    }
    debug_syslog('element and template', element, template);
    return element.html(Mustache.render(template, data));
  }
  //debug_syslog 'rendered', element.html()

  // Render all templates
  static render(data) {
    return (() => {
      const result = [];
      for (var type in RuleSyslog.mustache) {
        var elements = RuleSyslog.mustache[type];
        result.push(RuleSyslog.render_type(type, data));
      }
      return result;
    })();
  }

  // Send the read socketio request
  static send_read_all(cb) {
    debug_syslog('read all views');

    return socket.emit('rules::syslog::read', {}, function (error, data) {
      debug_syslog('read rules::syslog', data);

      data.syslog_levels = [];
      for (var level in data.severity_map) {
        var val = data.severity_map[level];
        data.syslog_levels.push({ syslog: level, console: val });
      }

      data.field_mapping = [];
      for (var syslog_field in data.field_map) {
        var console_field = data.field_map[syslog_field];
        data.field_mapping.push({ syslog: syslog_field, console: console_field });
      }

      RuleSyslog.render(data);
      if (cb != null) {
        return cb();
      }
    });
  }
}
RuleSyslog.initClass();

// @show_help: ( section )->

$(function () {
  RuleSyslog.send_read_all();

  $('.help-icon').on('click', function () {
    const help_section = $(this).data('section');
    debug_syslog('toggle help section', help_section);
    return $(`.help.help-${help_section}`).toggleClass('hidden');
  });

  const typeahead_defaults = {
    minLength: 0,
    showHintOnFocus: true,
    autoSelect: true,
    items: 'all',
  };

  // Typeahead
  return $('.fields_typeahead').typeahead(_.defaults({ source: fields_list }, typeahead_defaults));
});

window.RuleSyslog = RuleSyslog;
