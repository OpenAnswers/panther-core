

# ----------------------------------------------------------------
# On DOM ready

$ ->
  # Add initial empty selectors and actions, along with
  # the 'Add New X' links.
  NewRule.setup()


class NewRule

  @logger = debug 'oa:event:rules:new'

  # Store for server groups and fields response
  @groups = null
  @fields = null

  # TODO consider allowing tally to be displayed
  @fields_to_hide = [
    'tally'
    'autoincr_id'
    'history'
    'notes'
    'matches'
    '__v'
    '_id'
    'identifier'
    'occurrences'
  ]
  @fields_manual_layout = [
    'summary', 'tag'
    'severity', 'node'
  ]

  @.$event_highlight = $("#template-event-highlight").html()
  Mustache.parse @.$event_highlight

  @.$rule_view = $("#template-rule-view").html()
  Mustache.parse @.$rule_view

  @populate_group_select: ->
    $('.new-rule-select-groups').html ''
    for group in @groups
      $('.new-rule-select-groups').append $('<option>', value: group, text: group )

  @setup_rule: ()->
    @rule = Rule.generate _initial:true,
      index: 0
      #rule_set: @
      #event_rules: @event_rules
      new: true
      render: true

    $('#new-rule').append @rule.$container

    @rule.enable_editing()
    
    # Remove the Rule title buttons
    @rule.$container
      .find '.title > .right'
      .addClass 'hidden'

    # Fix the rule padding for removed buttons
    $('.rule-name-edit').css 'padding-right', '15px'

    # Add our special buttons create/cancel buttons
    template_create_buttons = $('#template-new-rule-buttons').html()
    $('.edit-warning .right').html template_create_buttons
    $('.edit-warning').removeClass 'collapse'


  @setup: ()->
    self = @

    retrieve =
      fields: Data.getFields()
      groups: Data.getGroupNames()

    Promise.props(retrieve)
    .then ( results )->
      
      self.logger 'Got groupsfields', results.groups
      self.groups = results.groups
      self.populate_group_select()

      self.logger 'Got fields', results.fields
      self.fields = results.fields

      self.setup_rule()

      self.handle_rule_type_select()
      self.handle_rule_create()
      self.handle_rule_cancel()

      # Have we been passed an existing event to compare
      # against? If so, fetch the data and show the relevant UI.
      self.handleEventContext()
      self.showServerRules()
      

  @handle_rule_type_select: ->
    # Add a handler for the _Rule Type_ selection
    $('.new-rule-type').on 'input, change', (ev)->
      type =  $(ev.target).val()
      switch type
        when 'globals'
          $('.new-rule-select-agent').addClass 'hidden'
          $('.new-rule-select-groups').addClass 'hidden'
          @type = 'server'
          @sub_type = 'globals'
        when 'groups'
          $('.new-rule-select-agent').addClass 'hidden'
          $('.new-rule-select-groups').removeClass 'hidden'
          @type = 'server'
          @sub_type = 'groups'
          @group = ''
        when 'agent'
          $('.new-rule-select-agent').removeClass 'hidden'
          $('.new-rule-select-groups').addClass 'hidden'
          @type = 'agent'
          @sub_type = ''
        else
          console.error 'Unknown rule type', type

  @handle_rule_create: ->
    self = @
    $('.new-rule-create-btn').on 'click', (ev)->
      self.submit_rule()
      .then ( result )->
        window.location.href = self.selected_type_url()
      .catch ( error )->
        Message.error error


  @handle_rule_cancel: ->
    self = @
    $('.new-rule-cancel-btn').on 'click', (ev)->
      history.go(-1)
    

  @onSelectsChange: ->
    self = @
    verdict = true
    self.highlight_match_reset()
    self.highlight_regex_reset()
    self.rule.selects.each_instance ( select )->
      res = select.test_event self.event
      unless res then verdict = false
      self.logger 'Check select [%s] results [%s]', select.verb, res
      if select.field?
        self.highlight_match select.field, res
        self.highlight_regex select.field, select.value, res
    self.highlight_verdict verdict

  @handleEventContext: ->
    self = @
    event_id = window.location.hash.replace(/#/g, '')
    return if event_id is ""

    # fetch the event from the server using the id
    @logger "New event with event context. id[#{event_id}]"
    socket.emit 'event::details', { id: event_id }, (error, data) ->
      return Message.error JSON.stringify(error) if error
      $("#reference-event").removeClass 'collapse'
      self.logger "Received event data", data
      self.event = data
      #for k,v of data when v != "" and k not in fieldsToHide
      rows = []
      for first in self.fields_manual_layout
        rows.push { key: first, value: data[first] }
      for key,value of data when key not in self.fields_to_hide and key not in self.fields_manual_layout
        rows.push { key: key, value: value }
      
      html_str = Mustache.render self.$event_highlight, rows:rows
      $("#reference-event-container").append html_str
        
    @clearMatchVerdict()

    $(".selects").on 'click', '.select-delete-button', (ev) ->
      self.logger 'select deleted', ev
      self.onSelectsChange()

    # Add event handler so highlighting happens for any selects that
    # specify a field.
    # Note this is bound to the `.selects` container, so will fire after
    # the event to retrieve cata attached to the the select `input` itself,
    # as the event bubbles up.
    # @ev: JQuery event
    $('.selects').on 'input', 'input', ( ev )->
      self.logger 'select change', ev
      self.onSelectsChange()


  # ### matches tab
  @matches_global_template = $('#event-details-matches-global-row-template').html()
  @matches_group_template = $('#event-details-matches-group-row-template').html()
  @matches_rule_template = $('#event-details-matches-rule-row-template').html()
  Mustache.parse @matches_global_template
  Mustache.parse @matches_group_template
  Mustache.parse @matches_rule_template

  # query the server for other rules that would match the event
  @showServerRules: ( )->
    self = @
    @matches_global = $('#event-details-modal-global-matches-table tbody')
    @matches_group = $('#event-details-modal-group-matches-table tbody')

    event_id = window.location.hash.replace(/#/g, '')
    return if event_id is ""

    socket.emit 'event_rules::query::id', { id: event_id }, (error, data)->
      self.logger 'query::id', data
      return Message.error JSON.stringify( error ) if error

      $("#also-rules").removeClass 'collapse'
      # build template data

      global_matches = data.global ? []
      group_matches = data.group ? []

      total_matches = global_matches.length + group_matches.length
      also_str = "Also matched " + total_matches + " other rules ("
      also_str += "global: " + global_matches.length if global_matches.length > 0
      also_str += " group: " + group_matches.length if group_matches.length > 0
      also_str += ")"

      $("#also-rules > .title > p").html( also_str )
      self.logger also_str

      self.matches_global.html ''
      self.matches_group.html ''

      if global_matches.length == 0
        self.matches_global.append "<tr><td>No matches</td></tr>"
    
      if group_matches.length == 0
        self.matches_group.append "<tr><td>No matches</td></tr>"

      for glmatch in global_matches
        render_data =
          name: glmatch.name
          uuid: glmatch.uuid.split("-")[0]
          uuid_full: glmatch.uuid
        console.log render_data
        self.matches_global.append Mustache.render self.matches_global_template, render_data
      for grmatch in group_matches
        render_data = 
          group_name: grmatch.group_name
          group_uuid: grmatch.group_uuid.split("-")[0]
          group_uuid_full: grmatch.group_uuid
        self.matches_group.append Mustache.render self.matches_group_template, render_data
        for rumatch in grmatch.matches
          rule_data =
            name: rumatch.name
            uuid: rumatch.uuid.split("-")[0]
            uuid_full: rumatch.uuid
          self.matches_group.append Mustache.render self.matches_rule_template, rule_data
      #self.logger "MATCHES", self.matches_el
      #true
  

  @hideServerRules: ()->
    $("#also-matched-rules").html ''
    $("#also-rules").addClass 'collapse'


  @highlight_verdict: ( result )->
    $verdict = $("#reference-event-verdict")
    if result
      $verdict.removeClass 'reference-event-verdict-red'
      $verdict.addClass 'reference-event-verdict-green'
      $verdict
        .find ".inner"
        .html "Your rule would select the reference event"
      # TODO emit the "event"" to API for checking what other rules match
    else
      $verdict.removeClass 'reference-event-verdict-green'
      $verdict.addClass 'reference-event-verdict-red'
      $verdict
        .find ".inner"
        .html "Your rule would NOT match the reference event."


  @highlight_match_class = "reference-event-entry-match"
  @highlight_no_match_class = "reference-event-entry-no-match"

  @highlight_match_reset: ()->
    $('.reference-event-entry').removeClass @highlight_match_class
    $('.reference-event-entry').removeClass @highlight_no_match_class

  @highlight_match: ( field, result )->
    selector = ".reference-event-entry[data-field=\"#{field}\"]"
    $elem = $(selector)
    @logger 'Highlight $elem', selector, $elem, field, result
    if result
      $elem.removeClass @highlight_no_match_class
      $elem.addClass @highlight_match_class
    else
      $elem.removeClass @highlight_match_class
      $elem.addClass @highlight_no_match_class

  @highlight_regex_reset: ()->
    self = @
    selector = ".reference-event-entry td.reference-event-highlight-value"
    $(selector).each (index, element) ->
      self.logger "Reset index [%s] elem [%s] ", index, element
      reference_value = $(element).attr('data-value')
      $(element).html reference_value
    

  @highlight_regex: (field, regex_value, result)->
    selector = ".reference-event-entry[data-field=\"#{field}\"] .reference-event-highlight-value"
    $elem = $(selector)

    regexes = Helpers.regex_from_array( regex_value )
    @logger 'Highlight regex on $elem', selector, regexes
    $elem.highlightRegex regexes


  # ###### `@refEntryMatches()`
  @refEntryMatches: ( elem, yn )->
    if yn
      $(elem).removeClass("entry-nomatch")
      $(elem).addClass("entry-match")
    else
      $(elem).removeClass("entry-match")
      $(elem).addClass("entry-nomatch")

  # ###### `@setMatchVerdict()`
  @setMatchVerdict: ( yn )->
    verdictElem       = $("#reference-event-verdict")
    verdictInnerElem  = $(verdictElem).find("#inner")
    if yn
      $(verdictElem).removeClass("reference-event-verdict-red")
      $(verdictElem).addClass("reference-event-verdict-green")
      $(verdictInnerElem).html("This reference event would be matched by your rule.")
    else
      $(verdictElem).removeClass("reference-event-verdict-green")
      $(verdictElem).addClass("reference-event-verdict-red")
      $(verdictInnerElem).html("This reference event would <strong>NOT</strong> be matched by your rule.")

  @clearMatchVerdict: ->
    verdictElem       = $("#reference-event-verdict")
    verdictInnerElem  = $(verdictElem).find(".inner")
    $(verdictElem).removeClass("reference-event-verdict-green")
    $(verdictElem).removeClass("reference-event-verdict-red")
    $(verdictInnerElem).html("No selectors have been added yet.")


    

  # ----------------------------------------------------------------
  # Reset all state highlighting for a reference field entry.

  @reset_reference_entry: ( field ) ->
    $elem = "tr[data-field=\"#{field}\""
    $elem.removeClass("reference-event-entry-match")
    $elem.removeClass("reference-event-entry-nomatch")

  # ----------------------------------------------------------------
  # Reset all state highlighting for a reference field entry.

  @resetRefMouseState: ( elem ) ->
    # Clear green/red background colour
    $(elem).removeClass("selector-reference-mouseover")

  # ----------------------------------------------------------------
  #

  @resetAllRefEntries: ( resetMouseOverState = false ) ->
    $("#reference-event-container .entry").each (index, element) ->
      resetRefEntry(element)
      if resetMouseOverState
        resetRefMouseState(element)

  # ----------------------------------------------------------------
  # Iterate through all reference fields, check whether they have
  # a selector, then compare the selector against the reference
  # field.

  @evalAllSelectorsAgainstRef: ->
    resetAllRefEntries(true)
    failCount = -1
    result = @rule.selects.test_event @reference
    setMatchVerdict result



  # ####### `@getGroups( callback_fn )`
  @get_groups_Async: ->
    self = @
    new Promise ( resolve, reject )->
      $.get "/api/groups", (data) ->
        self.logger 'Retreived groups from api', data
        self.group_names = data.data
        resolve data.data
      .fail ( error )->
        reject error

  # ####### `@getGroups( callback_fn )`
  @get_fields_Async: ->
    self = @
    new Promise ( resolve, reject )->
      $.get "/api/groups", (data) ->
        self.logger 'Retreived groups from api', data
        self.group_names = data.data
        resolve(data.data)
      .fail ( error )->
        reject error

  # ###### `@dom_to_type`
  # Take the selected type in the UI, turn it into a `type` and `sub_type`
  # for a socketio message
  @dom_to_type: ->
    selected_type = @selected_type()
    @logger 'selected_type', selected_type
    o = {}
    switch selected_type
      when 'globals'
        o.type = 'server'
        o.sub_type = 'globals'
      when 'groups'
        o.type = 'server'
        o.sub_type = 'groups'
        o.group = @selected_group()
      when 'agent'
        o.type = 'agent'
        o.sub_type = @selected_agent()
      else
        throw new ValidationError('No rule type selected')
    o

  # Get the selected type from the dom input
  @selected_type: ->
    selected_type = $('input:checked[name="new-rule-type"]').val()
    unless selected_type
      throw new ValidationError('Couldn\'t find a value for the selected rule type')
    selected_type
 
  # Get the selected group from the dom select
  @selected_group: ->
    group = $('select.new-rule-select-groups').val()
    unless group?
      throw new ValidationError 'Couldn\'t find a value for the group selection'
    group
 
  # Get the selected agent from the dom select
  @selected_agent: ->
    agent = $('select.new-rule-select-agent').val()
    unless agent?
      throw new ValidationError 'Couldn\'t find a value for the agent selection'
    agent


  @selected_type_message: ->
    selected_type = @selected_type()
    switch selected_type
      when 'globals'
        "Global rule created"
      when 'groups'
        "Group rule created for #{@selected_group()}"
      when 'agent'
        "Agent rule created for #{@selected_agent()}"
      else

  # ###### `@selected_type_url`
  # Generate a url for the selected rule type
  @selected_type_url: ->
    selected_type = @selected_type()
    switch selected_type
      when 'globals' then '/rules/globals'
      when 'groups' then '/rules/groups'
      when 'agent'
        agent = @selected_agent()
        "/rules/agent/#{agent}"
      else
        throw new ValidationError "No agent defined",
          field: 'selected_type'
          value: selected_type


  # ###### `@submit_rule`
  # Save to the new rule to a server rule set.
  # Send the user to the relevent url on success
  @submit_rule: ->
    self = @
    new Promise ( resolve, reject )->
      msg = self.dom_to_type()
      msg.data = {}
      msg.data.rule = self.rule.dom_to_yaml_obj()
      self.logger 'Sending create with', msg
      socket.emit 'event_rules::rule::create', msg, ( err, data )->
        if err then return reject ErrorType.from_object(err)
        Message.info_label "Rule Created", self.selected_type_message()
        resolve msg
