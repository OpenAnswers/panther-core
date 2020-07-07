
class Severity

  @logger = debug 'oa:d3:severity'
  # ###### severity_bar ( element_id, data_array, options )

  # element_id: to append svg to
  # data: data to pass to d3 data
  # options:
  @severity_bar: ( id, data, options = {} )->
    self = @
    
    # Options
    place   = options.place     ? 0
    height  = options.height    ? 30
    width   = options.width     ? $(id).width()
    margin  = options.margin    ? 0
    label   = options.label     ? null
    count   = options.count     ? null
    text    = options.text      ? null
    fontpx  = options.fontpx    ? 15
    link    = options.link      ? null
    parent  = options.parent    ? null
    klass   = options.klass     ? null
    mouseover = options.mouseover ? false
    
    # Sum the total for each severity
    sum = d3.sum data, ( d )->
      d.total

    #text_glow = D3.glow('text_glow').rgb('#fff').stdDeviation(5)

    # Create the main svg
    if parent?

      width = $("##{parent}").width()

      uid = 'sev-' + Helpers.random_string(7)

      all = d3.select "##{parent}"
        .append 'svg'
        .attr 'id', uid
        .attr 'width', width
        .attr 'height', height
        .attr 'data-name', id
      
      @logger 'all element', uid, id, width, all
      console.error 'no parent: %s', parent unless all?

    # Setup a scale for this bar
    event_scale = d3.scale.linear()
      .domain [ 0, sum ]
      .range  [ 0, width ]


    # Create a group
    svg = d3.select "##{uid}"
      .append "g"
      #.attr "transform", "translate(0,#{place*(height+margin)})"
      .attr "width", width
      .attr "height", height
    #.call text_glow
      #.attr("preserveAspectRatio", "xMinYMin meet")
      #.attr("viewBox", "0 0 #{width} #{height}")

    svg.attr "class", klass if klass?

    rect_start = 0
    summary_start = 170
    summary_size = (width - summary_start) / ( data.length + 1 )
    summary_end = summary_size

    summary_scale = d3.scale.linear()
      .domain [ 1, 5 ]
      .range  [ (0 + summary_start), (width - summary_end) ]

    # Loop through the data.. drawing rectangles
    svg.append "rect"
      .attr       "x", 0
      .attr       "y", 0
      .attr       "height", height
      .attr       "width", width
      .style      "stroke", '#ccc'
      .style      "stroke-width", 0
      .style      "stroke-opacity", 0.5
      .style      "fill", "#f4f4f4"
      .style      "fill-opacity", 1

    sev_grouping = svg.append('g')
    sev_grouping.attr 'class', 'sev-grouping'
    
    sev_bar = sev_grouping.append('g')
    sev_bar.attr 'class', 'sev-bar'

    sev_summary = sev_grouping.append('g')
    sev_summary.attr 'class', 'sev-summary'



    for sev_count in data

      count = sev_count.total
      rect_width = event_scale count
      
      @logger "appending", sev_count

      sev_bar.append "rect"
        .classed    {"severity-svg-#{sev_count._id}": true}
        .attr       "x", rect_start
        .attr       "y", 0
        .attr       "height", height
        .attr       "width", rect_width
        .attr       "opacity", 0.8


      if mouseover?

        if link?
          text_el = sev_summary.append "a"
          text_el.attr "xlink:href", "#{link}/severity/#{sev_count._id}"
        else
          text_el = sev_summary

        text_el.append "text"
          
          .append "tspan"
          .text   count

          .classed {
            "severity-svg-text-#{sev_count._id}": true
            "group_#{uid}_sev_summary_text": true
          }
          .attr       "x", summary_start + (Math.abs(height-fontpx)/2)
          .attr       "y", ( (height/2) + (fontpx/2) - (fontpx/7) )
          .attr       "startOffset", "100%"
          .attr       "opacity", 0
          .attr       "font-size", "#{fontpx}px"

        sev_summary.append "rect"
          .classed    {
            "severity-svg-#{sev_count._id}": true
            "group_#{uid}_sev_summary_rect": true
          }
          .attr       "x", summary_start
          .attr       "y", 0
          .attr       "height", height
          .attr       "width", summary_size
          .attr       "opacity", 0
          .style      "stroke", '#999'
          .style      "stroke-width", 0

      summary_start += summary_size
      rect_start += rect_width

    if label?

      #label = options.label.replace /_/g, ' '
      labelpx = fontpx*1.2

      if link?
        label_el = svg.append "a"
        label_el.attr "xlink:href", "#{link}"
      else
        label_el = svg

      label_el.append "text"
        .text       "#{label}"
        .attr       "id", "group_#{uid}_label"
        #.classed    "severity-bar-label": true
        .attr       "x", 5
        .attr       "y", ( (height/2) + (labelpx/2) - (labelpx/7) )
        .attr       "font-size", "#{labelpx}px"
        .attr       "opacity", 0.75
        #.attr       'filter', 'url(#drop-shadow)'
        #.style      "filter", "url(#text_glow)"

    if count?
      labelpx = fontpx*1.2

      svg.append "text"
        .text       "#{sum}"
        .attr       "id", "group_#{uid}_count"
        #.classed    "severity-bar-count": true
        .attr       "x", width - (Math.abs(height-fontpx)/2)
        .attr       "y", ( (height/2) + (labelpx/2) - (labelpx/7) - 1 )
        .attr       "font-size", "#{fontpx}px"
        .attr       "opacity", 0.7
        .attr       "text-anchor", "end"
        .attr       "startOffset", "100%"


    # svg outline
    # cover = D3.rect svg,
    #   id: "group_#{options.label}_rect"
    #   x: 0
    #   y: 0
    #   height: height
    #   width:  width
    #   #stroke: '#999'
    #   #stroke_width: 1
    #   fill:   "#fff"
    #   fill_opacity: 0

    svg.append "rect"
      .attr       "id", "group_#{uid}_rect"
      .attr       "x", 0
      .attr       "y", 0
      .attr       "height", height
      .attr       "width", width
      .style      "stroke", '#aaa'
      .style      "stroke-width", 1
      .style      "stroke-opacity", 0.5
      .style      "fill", "#fff"
      .style      "fill-opacity", 0
      
    
    if mouseover

      svg.on "mouseover", ->
        self.logger 'rect mouseover'

        d3.selectAll(".group_#{uid}_sev_summary_text")
          .transition()
          .duration(500)
          .attr "opacity", 1

        d3.selectAll(".group_#{uid}_sev_summary_rect")
          .transition()
          .duration(1500)
          .attr "opacity", 0.7

        # d3.select("#group_#{uid}_label")
        #   .transition()
        #   .duration(150)
        #   .attr "opacity", 0

        # d3.select("#group_#{uid}_count")
        #   .transition()
        #   .duration(150)
        #   .attr "opacity", 0

        d3.select("#group_#{uid}_rect")
          .style      "stroke", '#333'
          .attr       "opacity", 0.6

        d3.select(this).selectAll('.sev-bar rect')
          .transition()
          .duration(100)
          .attr "opacity", 0


      svg.on "mouseout", ->
        self.logger 'rect mouseout'

        d3.selectAll(".group_#{uid}_sev_summary_text")
          .transition()
          .duration(500)
          .attr "opacity", 0

        d3.selectAll(".group_#{uid}_sev_summary_rect")
          .transition()
          .duration(1500)
          .attr "opacity", 0

        # d3.select("#group_#{uid}_label")
        #   .transition()
        #   .duration(500)
        #   .attr "opacity", 0.75

        # d3.select("#group_#{uid}_count")
        #   .transition()
        #   .duration(500)
        #   .attr "opacity", 0.75

        d3.select("#group_#{uid}_rect")
          .style      "stroke", '#999'
          .style      "opacity", 0.5

        d3.select(this).selectAll('.sev-bar rect')
          .transition()
          .duration(500)
          .attr "opacity", 0.8
