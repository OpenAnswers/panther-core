debug_syslog = debug 'oa:event:rules:syslog'


class RuleSyslog

  @mustache:
    levels:
      template: $('#rules-syslog-levels-template').html()
      element:  $('#rules-syslog-levels')
    fields:
      template: $('#rules-syslog-fields-template').html()
      element:  $('#rules-syslog-fields')
    identifier:
      template: $('#rules-syslog-identifier-template').html()
      element:  $('#rules-syslog-identifier')
    # transforms:
    #   template: $('#rules-syslog-transforms-template').html()
    #   element:  $('#rules-syslog-transforms')


  # Render a type of template
  @render_type: ( type, data )->
    debug_syslog 'render_type', type, data
    unless @mustache[type]?
      console.log 'ERROR: No setup for type [%s]', type
      return
    element = @mustache[type].element
    template = @mustache[type].template
    unless element
      console.log 'ERROR: No element for type [%s]'
      return
    unless template
      console.log 'ERROR: No template for type [%s]'
      return
    debug_syslog 'element and template', element, template
    element.html Mustache.render( template, data )
    #debug_syslog 'rendered', element.html()


  # Render all templates
  @render: ( data )->
    for type, elements of RuleSyslog.mustache
      RuleSyslog.render_type type, data


  # Send the read socketio request
  @send_read_all: ( cb )->
    debug_syslog 'read all views'
    
    socket.emit 'rules::syslog::read', {}, ( error, data )->
      debug_syslog 'read rules::syslog', data

      data.syslog_levels = []
      for level, val of data.severity_map
        data.syslog_levels.push { syslog: level, console: val }

      data.field_mapping = []
      for syslog_field, console_field of data.field_map
        data.field_mapping.push { syslog: syslog_field, console: console_field }

      RuleSyslog.render data
      cb() if cb?_

  # @show_help: ( section )->



$ ->

  RuleSyslog.send_read_all()

  $('.help-icon').on 'click', ->
    help_section = $(this).data('section')
    debug_syslog "toggle help section", help_section
    $(".help.help-#{help_section}").toggleClass('hidden')


  typeahead_defaults =
    minLength: 0
    showHintOnFocus: true
    autoSelect: true
    items: 'all'

  # Typeahead
  $('.fields_typeahead').typeahead _.defaults
    source: fields_list
  , typeahead_defaults

