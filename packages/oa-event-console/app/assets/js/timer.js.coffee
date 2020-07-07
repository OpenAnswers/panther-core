# Allows you to easily track the time things take

class Timer

  # Generate and start a timer
  @start: ()->
    new Timer start: true

  constructor: ( options = {} )->
    @startTime   = undefined
    @endTime     = 0
    @elapsedTime = undefined
    @logger = options.logger or console.log
    @name = options.name
    if options.start is true
      @start()

  start: ->
    @startTime = Date.now()

  end: ->
    @endTime = Date.now()
    @elapsedTime = @endTime - @startTime

  elapsed: ->
    ###
    colour = "black"
    if @elapsedTime <= 50
      colour = "green"
    if @elapsedTime > 50 && @elapsedTime < 100
      colour = "orange"
    if @elapsedTime => 100
      colour = "red"
    ###

    return @elapsedTime

  end_log: ( msg, data, logger = @logger )->
    @end()
    @log msg, data, logger

  log: ( msg, data, logger = @logger )->
    logger.call "#{msg} took #{@elapsedTime} ms", data
