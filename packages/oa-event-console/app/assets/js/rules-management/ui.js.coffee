class UI

  @showConfirmDeleteDialog = (rule) ->
    rule_name = rule.getRuleName()
    $el = rule.getRuleElement()

    #$("#modal-delete-confirm .metadata-tags").html(ruleTagsHtml)
    $modal = $("#modal-delete-confirm")
    $.data $modal, "rule", rule
    $modal.find("rule-name").html name_name
    $modal.modal()

  # ### Save Rules Dialog
  @toggleSaveRulesDialog = ->
    if $(".nav-quick-deploy").hasClass 'hidden'
      $(".nav-quick-deploy").removeClass 'hidden'
    else
      $(".nav-quick-deploy").addClass 'hidden'

  @showSaveRulesDialog = ->
    $(".nav-quick-deploy").removeClass 'hidden'

  @hideSaveRulesDialog = ->
    $(".nav-quick-deploy").addClass 'hidden'

  # Reload rules dialog
  @showReloadRulesDialog = ->
    $(".card-rules-reload").removeClass("hidden")

  @hideReloadRulesDialog = ->
    $(".card-rules-reload").addClass("hidden")


  #@setSidebarAffix = ->
    #$(".sidebar").affix { offset : { top: 245 } }

  @populateGroupSelects = ->
    $.each Data.groupNames, (key, value) ->
      $("#modal-move-to-group-select")
        .append($("<option></option>")
        .attr("value", key)
        .text(value))

  @showErrorDialog = (title, message) ->
    $("#modal-error .modal-title").html title
    $("#modal-error-message").html message
    $("#modal-error").modal()

  @showSuccessDialog = (title, message) ->
    $("#modal-success .modal-title").html title
    $("#modal-success-message").html message
    $("#modal-success").modal()

  @hideRulesLoader: ->
    $("#rules-loader").hide()

  @updateRulesLoaderStatus: (index) ->
    $("#rules-loader .text").html "Loading rule #{index}"


