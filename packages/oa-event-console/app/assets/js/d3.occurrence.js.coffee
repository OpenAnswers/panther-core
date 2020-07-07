
class Occurrence

  debug_d3 = debug 'oa:d3:occurrence'

  # ###### event_time_dots ( element_id, data_array, options )
  #
  @event_time_dots: ( id, data, options = {} )->

    height    = options.height ? 50
    width     = options.width ? $(id).width()
    size      = options.size ? 15
    radius    = size / 2
    opacity   = options.opacity ? 0.8

    dates = for time in data
      new Date(time)

    min = d3.min dates
    max = new Date

    #height  = size + 4

    debug_d3 'min[%s]  max[%s]  width[%s]  height[%s]', min, max, width, height

    event_scale = d3.time.scale()
      .domain [ min, max ]
      .range  [ 0+height, width-height ]

    # ticks along the x axis
    event_axis = d3.svg.axis()
      .scale event_scale
      .orient 'bottom'
      .ticks d3.time.minutes, 60
      .tickSize 4, 0
      .tickFormat d3.time.format('%m')

    # Date dots
    svg = d3.select id
      .append "svg"
        #.attr("preserveAspectRatio", "xMinYMin meet")
        #.attr("viewBox", "0 0 #{width} #{height}")
        .attr "width", width
        .attr "height", height

    svg.append "g"
      .attr "class", "x axis"
      .attr "transform", "translate(0,#{height-5})"
      .call event_axis

    svg.append "g"
      .selectAll "line"
      .data     dates
      .enter()
      .append   "svg:line"
        .style    "fill", "darkblue"
        .style    "stroke-width", 2
        .style    "stroke", "black"
        .style    "stroke-opacity", opacity
        #.style    "stroke-opacity", opacity
        .attr     "y1", 0
        .attr     "y2", height-5
        .attr     "x1", ( ts )->
          scaled = event_scale ts
          debug_d3 'ts x1: [%s] scaled: [%s]', ts, scaled
          scaled
        .attr     "x2", ( ts )->
          scaled = event_scale ts
          debug_d3 'ts x2: [%s] scaled: [%s]', ts, scaled
          scaled

    svg.append "g"
      .selectAll "circle"
      .data     dates
      .enter()
      .append   "svg:circle"
        .style    "fill", "steelblue"
        #.style    "stroke", "darkblue"
        .style    "opacity", 0.5
        #.style    "stroke-opacity", opacity
        .attr     "r", radius
        .attr     "cy", radius+1
        .attr     "cx", ( ts )->
          scaled = event_scale ts
          debug_d3 'ts: [%s] scaled: [%s]', ts, scaled
          scaled
      .append "svg:title"
        .text ( d )-> new Date(d)
