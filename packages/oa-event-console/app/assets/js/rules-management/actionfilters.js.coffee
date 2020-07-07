class @ActionFilters
  @actionFilters = []

  @resetActionFilter = ->
    ActionFilters.actionFilters = []

  @addActionFilter = (action) ->
    ActionFilters.actionFilters.push action

  @removeActionFilter = (action) ->
    index = ActionFilters.actionFilters.indexOf action
    ActionFilters.actionFilters.splice index, 1
    if ActionFilters.actionFilters.length == 0
      @showAll()

  @removeAllActionFilters = ->
    @actionFilters = []
    $(".tags .entry").each (index, element) ->
      $(element).removeClass "entry-selected"
    @showAll()

  @renderActionFilter = ->
    searchWarning = $("#search-warning").show()
    disableDragging = false

    cardsCount = $(".card-global-rule-li").length
    hiddenCount = 0

    $("#rules-empty").hide()
    # cards not already marked by no-match from strings searches
    $(".card-global-rule-li").not('.no-match').each () ->
      
      for filter in ActionFilters.actionFilters
        if $(this).find(".tag-#{filter}").length == 0
          disableDragging = true
          hiddenCount++
          
          $(this).hide()
          # add class to mark being hidden from filter matches
          $(this).addClass "no-match"
          
#    hide the group if all rules don't match
    $(".rule-group").each (rgi, rge) ->
      $(this).show()
#      
      ruleCounter = $(this).find(".card-global-rule-li").length
      noMatchCounter = $(this).find(".no-match").length
      #console.log "ruleCounter = " + ruleCounter + " noMatchCounter = " + noMatchCounter, rgi, rge
      if ruleCounter == noMatchCounter
        $(this).hide()
    
    if cardsCount - hiddenCount == 0
      $("#rules-empty").show()
    
    if disableDragging
      Data.event_rules.disable_sortable()
      $(searchWarning).show()
      
  @toggleTag = (elem) ->
    if $(elem).hasClass "entry-selected"
      $(elem).removeClass "entry-selected"
      ActionFilters.removeActionFilter($(elem).data("action"))
    else
      $(elem).addClass "entry-selected"
      ActionFilters.addActionFilter($(elem).data("action"))

  @showAll = ->
    if(sub_type == "globals")
      $(".card-global-rule-li").each (rgi, rge) ->
        $(this).show()
        $(this).removeClass("no-match")
    else
      $(".rule-group").each (rgi, rge) ->
        $(this).show()
    $("#rules-empty").hide()
