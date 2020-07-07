# Globals AND Groups and Agent Rules
# ===============================

# This file provides the entry point for JavaScript
# on both the global and grouped rule management pages.

class Config
  enableAnimation: true

# jQuery On Document Load
# -----------------------
# Kick off data acquisition and rendering.

$ ->
  # Call Bootstrap's affix method to keep the sidebar in the viewport on scrolling.
  #UI.setSidebarAffix()

  # Jade passes in two simple string variables from `render`
  Message.error "No rules type available" unless _.isString(type)
  Message.error "No rules sub type is available" unless _.isString(sub_type)

  # Start page specific code.
  Data.type = type
  Data.sub_type = sub_type

  # The Promise library lets us specify a series of asynchronous calls, and
  # register code to be executed once they are all completed. We can continue
  # rendering once all our API calls to fetch data have been completed.
  Promise.props
    selectors:    Data.getSelectorOperators()
    actions:      Data.getActions()
    fields:       Data.getFields()
    ruleMatches:  Data.getRuleMatches()
    event_rules:  Data.getRules( type, sub_type )
    groupNames:   Data.getGroupNames()
    scheduleNames: Data.getScheduleNames()

  .then (results) ->

    
    $evr = $('#event-rules-generic-container')
  
    Data.event_rules = EventRules.generate results.event_rules,
      $container: $evr

    # Create and render our rule elements.
    Data.event_rules.render()

    # Collapse all rules, extra parameter is false to disable animation.
    Data.event_rules.collapse_all false

    # Allow the user to re-arrange the rules.
    Data.event_rules.enable_sortable()

    # Populate the 'Move to Group' drop-down with group names.
    UI.populateGroupSelects()

    #Loaded
    UI.hideRulesLoader()

    # Ask the server if the current rule set has changes awaiting deployment, and display a dialog
    # box if that is the case to prompt the user to save.
    Data.isRuleSetEdited()


  .catch ( error )->
    console.error "Failed to load rules data", error
    Message.exception("Failed to load rules data", error)
