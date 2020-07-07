class UI
  @toggleSaveRulesDialog = ->
    if Config.enableAnimation
      $("#card-rules-not-saved").animate({"height": "toggle", "opacity": "toggle"}, "fast")
    else
      $("#card-rules-not-saved").toggle()
  @showSaveRulesDialog = ->
    if Config.enableAnimation
      $("#card-rules-not-saved").animate({"height": "show", "opacity": "show"}, "fast")
    else
      $("#card-rules-not-saved").show()
  @hideSaveRulesDialog = ->
    if Config.enableAnimation
      $("#card-rules-not-saved").animate({"height": "hide", "opacity": "hide"}, "fast")
    else
      $("#card-rules-not-saved").hide()
  @configureEllipsis = ->
    $(".rule-name").dotdotdot({
      watch: 'window'
    })

