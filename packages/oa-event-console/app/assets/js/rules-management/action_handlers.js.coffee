# # ActionHandlers

# An interface for all the rule verbs to implement

class ActionHandlers extends RuleVerbHandlers
  
  # Add a logger, other classes should override
  @logger: debug 'oa:event:rules:action_handlers'
  
  # The type for the verb. `action`, `option`, `select`
  @verb_type: 'action'
  @set_vars_from_verb_type()

  @dump: ->
    [
      @verb_type
      @verb_set_class
      @verb_set_selector
      @verb_instance_class
      @verb_instance_selector
    ]

  @logger "ActionHandlers", @dump()


  # ----------------------------------------------
  handleActionDelete: ( $object, selector = '.action-delete-button' ) ->

    $object.on 'click', selector, ->
      $actionElem = ActionHandlers.closest this, ".actions"
      $setElem = ActionHandlers.closest this, ".action-entry"
      unless $actionElem.data('verb_set')
        return console.error 'Missing verb_set object', $actionElem
      unless $actionElem.data('verb')
        return console.error 'Missing verb object', $actionElem
      $actionElem.data('verb_set').remove()