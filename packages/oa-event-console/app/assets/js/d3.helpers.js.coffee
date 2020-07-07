
class D3

  debug_d3 = debug 'oa:d3'

  @rect: ( svg, options )->

    debug 'drawing rect with opts', options
    
    id  = options.id  ? null
    x   = options.x   ?  100
    y   = options.y   ? 100
    
    height   = options.height  ? 100
    width    = options.width   ? 100
    opacity  = options.opacity ? 1
    
    stroke         = options.stroke          ? null
    stroke_width   = options.stroke_width    ? null
    stroke_opacity = options.stroke_opacity  ? null
    
    fill           = options.fill            ? '#333'
    fill_opacity   = options.fill_opacity    ? null


    rect = svg.append 'rect'
    rect.attr  "id", id
    rect.attr  "x",  x
    rect.attr  "y",  y
    rect.attr  "height", height
    rect.attr  "width", width
    rect.style "stroke", stroke if stroke?
    rect.style "fill", fill
    rect.style "fill-opacity", fill_opacity if fill_opacity?
    rect.style "stroke", stroke if stroke?
    rect.style "stroke-width", stroke_width if stroke? and stroke_width?
    rect.style "stroke-opacity", stroke_opacity if stroke? and stroke_opacity?

    rect


  @circle_center: ( svg, options )->

    debug 'drawing circle with opts', options
    
    id  = options.id  ? null
    x   = options.x   ?  100
    y   = options.y   ? 100
    
    height   = options.height  ? 100
    width    = options.width   ? 100
    opacity  = options.opacity ? 1
    
    stroke         = options.stroke          ? null
    stroke_width   = options.stroke_width    ? null
    stroke_opacity = options.stroke_opacity  ? null
    
    fill           = options.fill            ? '#333'
    fill_opacity   = options.fill_opacity    ? null


    circle = svg.append 'circle'
    circle.attr  "id", id if id?
    circle.attr  "cx",  x
    circle.attr  "cy",  y
    circle.attr  "height", height
    circle.attr  "width", width
    circle.style "stroke", stroke
    circle.style "fill", fill
    circle.style "fill-opacity", fill_opacity if fill_opacity?
    circle.style "stroke", stroke if stroke?
    circle.style "stroke-width", stroke_width if stroke? and stroke_width?
    circle.style "stroke-opacity", stroke_opacity if stroke? and stroke_opacity?

    circle


  # Create a glow

  @glow: ( url = "glow" )->
    stdDeviation = 5
    rgb = "#000"
    colorMatrix = "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
   
    my = ()->
   
      defs = this.append "defs"
   
      filter = defs.append("filter")
        .attr("id", url)
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%")
      .call ->
        this.append("feColorMatrix")
            .attr("type", "matrix")
            .attr("values", colorMatrix)
        this.append("feGaussianBlur")
             # .attr("in", "SourceGraphics")
            .attr("stdDeviation", stdDeviation)
            .attr("result", "coloredBlur")
   
      filter.append("feMerge")
      .call ->
        this.append("feMergeNode")
            .attr("in", "coloredBlur")
        this.append("feMergeNode")
            .attr("in", "SourceGraphic")
   
    my.rgb = ( value )->
      return color unless value?
      rgb = value
      color = d3.rgb(value)
      colorMatrix = "0 0 0 #{color.r/256} 0 0 0 0 0 #{color.g/256} 0 0 0 0 #{color.b/256} 0 0 0 1 0"
   
      my
   
    my.stdDeviation = ( value )->
      return stdDeviation unless value?
      stdDeviation = value
      my
   
    my


  # ###### gradient( svg, options )

  # Create a gradient defiition
  @gradient: ( svg, id = 'gradient', options = {} )->
    start_colour  = "#000"
    start_opacity = 1
    end_colour    = "#fff"
    end_opacity   = 1

    gradient = svg.append "svg:defs"
        .append "svg:linearGradient"
        .attr "id", "#{id}"
        .attr "x1", "0%"
        .attr "y1", "0%"
        .attr "x2", "100%"
        .attr "y2", "100%"
        .attr "spreadMethod", "pad"

    # Define the gradient colors
    gradient.append "svg:stop"
        .attr "offset", "0%"
        .attr "stop-color", "##{start_colour}"
        .attr "stop-opacity", start_opacity

    gradient.append "svg:stop"
        .attr "offset", "100%"
        .attr "stop-color", "##{end_colour}"
        .attr "stop-opacity", end_opacity

    gradient