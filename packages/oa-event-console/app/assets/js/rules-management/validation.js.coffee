class @Validation
  @errors: []
  @logger: debug 'oa:event:rules:validation'

  @populateErrorList: ->
    errorMessage = $("#modal-error-message")
    $(errorMessage).append("<ul>")
    for error in @errors
      $(errorMessage).append("<li>#{error}</li>")
    $(errorMessage).append("</ul>")

  #-----------------------------------------------------------------
  
  @validateRule: ( $ruleElem ) ->
    Validation.errors = []
    isInvalid    = false
    
    # Validate selectors
    selectorCount = 0
    $ruleElem.find(".select-entry-edit").each (index, element) ->
      selectorCount++
      data = $(element).data("select-id")
      Validation.logger 'validate', $ruleElem, data
      unless Validation.validateSelector($ruleElem, data)
        @logger "Validation on rule uid #{$ruleElem.data('uid')} failed on selectors"
        isInvalid = true

    if selectorCount == 0
      Validation.errors.push("You must specify at least one selector!")
      isInvalid = true

    unless Validation.validateName($ruleElem)
      isInvalid = true

    Validation.populateErrorList()
   
    return !isInvalid

  #-----------------------------------------------------------------
  
  @validateName: ( $ruleElem ) ->
    isInvalid = false

    nameElem    = $ruleElem.find(".rule-name-edit input")
    nameVal     = $(nameElem).val().trim()

    if nameVal is "" or nameVal.length is 0
      isInvalid = true
      DOM.invalidInput(nameElem)

    return !isInvalid
  
  #-----------------------------------------------------------------
  
  @validateAction: ($ruleElem, actionId) ->
    isInvalid = false

    $actionElem = $ruleElem.find(".action-entry-edit[data-action-id=#{actionId}]")

    $operatorElem = $actionElem.find('.action-operator input')
    operatorVal = $operatorElem.val()
    $fieldElem = $actionElem.find('.action-field input')
    fieldVal = $fieldElem.val()

    if $fieldElem and fieldElem.length is 1
      if fieldVal.length == 0
        DOM.invalidInput $fieldElem
        isInvalid = true
      else
        DOM.validInput $fieldElem

    if $operatorElem
      if operatorVal.length == 0
        DOM.invalidInput $operatorElem
        isInvalid = true
      else
        DOM.validInput $operatorElem

    # Ensure the operator is valid
    if !@isValidActionOperator operatorVal
      DOM.invalidInput $operatorElem
      isInvalid = true
    else
      DOM.validInput $operatorElem

    @logger "Operator: #{operatorVal} | Field: #{fieldVal}"

    return !isInvalid

  #-----------------------------------------------------------------
  
  @isValidActionOperator: (operatorName) ->
    operatorName in Data.actionNames

  @isValidSelectorOperator: (operatorName) ->
    operatorName in Data.selectorOperatorNames

  #-----------------------------------------------------------------
  # These methods apply to EDIT selectors only!

  @validateSelector: ($ruleElem, selectorId) ->
    logger = debug("#{@debug_namespace}.validateSelector()")
    isInvalid = false

    $selectorElem = Selector.getSelectorEdit $ruleElem, selectorId
    logger "validateSlector", $selectorElem

    $fieldElem    = $selectorElem.find('.selector-field input')
    $operatorElem = $selectorElem.find('.selector-operator input')
    $valueElems   = $selectorElem.find('.selector-value input')

    fieldVal    = $fieldElem.val().trim()
    operatorVal = $operatorElem.val().trim()
    
    # Check fieldVals are populated
    if fieldVal.length == 0
      DOM.invalidInput $fieldElem
      Validation.errors.push("The field box must not be empty.")
      isInvalid = true
    else
      DOM.validInput $fieldElem

    if operatorVal.length == 0
      DOM.invalidInput $operatorElem
      Validation.errors.push("The operator box must not be empty.")
      isInvalid = true
    else
      DOM.validInput $operatorElem

    # Ensure the operator is valid
    if !Selector.isSelectorValid operatorVal
      DOM.invalidInput $operatorElem
      Validation.errors.push("The operator specified is invalid.")
      isInvalid = true
    else
      DOM.validInput $operatorElem

    for valueElem in $valueElems
      value = $(valueElem).val().trim()
      if value.length == 0
        DOM.invalidInput valueElem
        isInvalid = true
      else
        DOM.validInput valueElem

    return !isInvalid

  #-----------------------------------------------------------------

