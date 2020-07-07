# Logging Class
# =============
# Provides some basic logging methods for timing and so on

class @Logging
  @timerStack = []

  # Group Logic
  # -----------------------------------------
  @startGroup: (groupName, collapsed = false) ->
    if collapsed
      console.groupCollapsed "%c#{groupName}", "font-weight: normal"
    else
      console.group groupName
    @timerStack.push performance.now()
    
  @endGroup: ->
    startTime    = @timerStack.pop()
    groupElapsed = performance.now() - startTime
    console.log "%cFinished in: #{groupElapsed.toFixed(2)}ms", "font-weight: bold; color: #3F51B5"
    console.groupEnd()
  # ------------------------------------------

  @title: (message) ->
    console.log "%c#{message}", "font-size: 2em; font-weight: bold;"

  @subtitle: (message) ->
    console.log "%c#{message}", "font-size: 1.3em;"

  @divider: ->
    Logging.blank()

  @blank: ->
    console.log ""

  @info: (message) ->
    console.log message

  @infoTime: (message) ->
    console.log message

  @success: (message) ->
    console.log "%c    #{message}    ", "background: #CCFFCC; font-weight: bold;"

  @failure: (message) ->
    console.log "%c    #{message}    ", "background: #FF6962; color:white; font-weight: bold;"

  @error: (message) ->
    console.error message

  
