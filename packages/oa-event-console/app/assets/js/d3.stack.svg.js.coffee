# ## Stacks

# Stacks manages a chart of Stack.
# It was hard to get D3 to manage the normalized groups in a single svg chart.
# There's some manual setup in here to create individual charts that might be
# able to done in D3 more easily, but it escaped me.

# The data structure to send in looks like this:

# ```
# @numbers = [
#   { id: 'All',  data: [ 15, 84, 42,  4, 27 ] },
#   { id: 'None', data: [ 10,  4, 17, 21,  4 ] },
#   { id: 'Jim',  data: [  0,  4,  0, 21, 25 ] },
# ]
# ```

# Which is the name, and 1,2,3,4,5 sev counts.


class StacksSvg
  
  @logger = debug 'oa:d3:stacks-svg'

  constructor: ( @id, @data, @options = {} )->
    @chart_el = d3.select("##{@id}")
    @store = {}

    @logger = @constructor.logger
    @logger "StacksSvg new [%s]", @id, @chart_el, @options, @data
    
    unless @chart_el[0][0]?
      Message.error "d3 couldnt select id [#{@id}]"
      return

    @width  = @options.width  ?= @chart_el.node().clientWidth
    @height = @options.height ?= 50
    @gap    = @options.gap    ?= 10
    @resize = @options.resize ?= false

    @total_height = @data.length * ( @height + @gap )
    @last_resize = Date.now()

    # adjust the div, just in case
    div = d3.select "##{@id}"
      .style 'height', "#{@total_height}px"

    @logger 'creating charts w[%s] h[%s] gap[%s]', @width, @height, @gap

    # Loop over all the array items, which equal a chart and build it
    for chart_def in @data

      chart_def.uid ?= Helpers.random_string(8)

      id = "#{@id}-stacksvg-#{chart_def.uid}"
      @logger 'creating %s', id, @options

      div.append 'svg'
        .attr 'id', id
        .attr 'class', 'svgchart'
        .attr 'width', @width
        .attr 'height', @height

      @options.label  = chart_def.label
      @options.link   = chart_def.link
      @options.label ?= chart_def.id
      @options.parent_id = @id

      chart_svg = new StackSvg id, chart_def.data, @options
      chart_svg.add()
      chart_svg.show_chart()

      @store[chart_def.id] = chart_svg

    if @resize
      self = @
      $(window).on 'resize', ->
        #self.logger 'ressize event!', self
        self.run_resize()


  # It would be good to use a _.debounce sheild for the resize, but ran into
  # problems using the class methods via the the _ functions

  run_resize: ->
    return if @width is d3.select("##{@id}").node().clientWidth
    for name, stack of @store
      @logger "resizing #{name}", name, stack
      stack.resize()
    @width = d3.select("##{@id}").node().clientWidth

  update_stack: (dataArray) ->
    for name, chart_svg of @store
      # @logger "updating #{name}", name, chart_svg
      for datum in dataArray
        if datum.id == name
          chart_svg.update datum.data

      
# ## Stack

# Stack will draw a single svg stack to a div container

# Config
# - duration     Duration of the animations (300)
# - width        Width of the svg (parent div)
# - height       Height of the svg (30)
# - label        Label for the bar, with _'s remooved (ID)
# - font_size    Base font size (17)
    
# Options
# - link         Prefix for links
# - show_total   Show totals on the right?
# - summary      Show summary?
# - toggle_hover Toggle summary on hover
# - toggle_click Togge summary on click
    
# Details
# - parent_id    = @options.parent_id

class StackSvg

  @logger = debug 'oa:d3:stack-svg'

  constructor: ( @id, @data, @options = {} )->

    @chart_el = d3.select "##{@id}"
    #@chart_el = d3.select "##{@id}-stacksvg-#{chart_def.id}"

    @logger = @constructor.logger
    @logger "StackSvg new [%s]", @id, @chart_el, @options, @data

    unless @chart_el[0][0]?
      Message.error "d3 couldnt select id [#{@id}]"
      return
    
    # Rendering
    @duration     = @options.duration     ? 300
    @width        = @options.width        ? @chart_el.node().clientWidth
    @height       = @options.height       ? 30
    @label        = @options.label        ? @id.replace(/_/g, ' ')
    @font_size    = @options.font_size    ? 17
    
    # Options
    @link         = @options.link         ? null
    @show_total   = @options.show_total   ? false
    @summary      = @options.summary      ? true
    @toggle_hover = @options.toggle_hover ? false
    @toggle_click = @options.toggle_click ? false
    
    # deatils
    @parent_id    = @options.parent_id    ? null
    @parent_id_el = d3.select "##{@id}"

    # calculate vars from options
    @calculate_vars()

    # Create the initial chart group
    @g = @chart_el
      .append 'g'
        .attr 'class', 'svg-chart-container'

    # Bind the data sets to the visual bar
    @bars = @g.selectAll ".bar"
      .data @data

    # Bind the data to the counts
    @counts = @g.selectAll ".count"
      .data @data
      
  # helper to grab the parents with (for resize)
  parent_width: ->
    d3.select("##{@parent_id}").node().clientWidth


  # calculate all the setup variables (for resize, re render)
  calculate_vars: ->
    # Font placement needs some help
    @row_half     = @height / 2
    @font_padding = @font_size / 2
    @font_thirds  = @font_size / 3
    @text_middle  = @row_half + @font_thirds

    # D3 vars for scale
    @sum          = d3.sum @data
    @scale = d3.scale.linear()
      .domain [ 0, @sum ]
      .range  [ 0, @width ]

    # D3 vars for our layout
    @label_size     = 0
    @label_size     = 130 if @label?
    @summary_count  = @data.length
    @summary_count += 1 if @show_total?
    @summary_width  = ( @width - @label_size ) / @summary_count
    
    @summary_scale = d3.scale.linear()
      .domain [ 0, @data.length ]
      .range  [ @label_size, @width ]


  # @showing controls which view is currently on screen
  toggle: ->
    switch @showing
      when 'chart'
        @show_summary()
      when 'summary'
        @show_chart()
      else
        @show_chart()


  # resize and draw everything based on the parent divs width
  resize: ->
    @logger 'stack resize'
    @width = @parent_width()

    @logger 'stack resize width', @width
    @calculate_vars()
    
    @chart_el
      .attr 'height', @height
      .attr 'width', @width

    @g.select '.svg-bar-width'
      .attr 'width', @width

    @render_total()
    @render_label()
    @render_bg()
    @render_border()

    switch @showing
      when 'chart'
        @show_chart()
      when 'summary'
        @show_summary()

  update: (data) ->
    # store the new data
    @data = data
    # update internals
    @calculate_vars()

    # set data in D3
    @bars.data @data
    @counts.data @data

    @update_total()

    @logger 'stack update', @data
    switch @showing
      when 'chart'
        @show_chart()
      when 'summary'
        @show_summary()

  # Add the main svg to the container div
  add: ->
    self = @
    @chart_el
      .attr 'height', @height
      .attr 'width', @width
    
    @add_bg()
    @add_bars()
    @add_counts()
    @add_label() if @label?
    @add_total() if @show_total?
    @add_border()   

    if @toggle_hover
      @chart_el.on 'mouseenter', -> self.toggle()
      @chart_el.on 'mouseleave', -> self.toggle()

    if @toggle_click
      @chart_el.on 'mouseclick', -> self.toggle()


  # Add the background rect to the main group
  add_bg: ->
    self = @

    bg_g = @g.append 'g'
      .attr 'class', 'svg-bar-bg'

    bg_a = bg_g.append 'a'
      .attr 'xlink:href', "#{self.link}"

    bg = bg_a.append "rect"
      .attr     "class", 'svg-bar-bg svg-bar-width'
      .attr     "x", 0
      .attr     "y", 0
      .style    "fill", "#000"
      .attr 'fill-opacity', 0.05

      .on 'mouseenter', ()->
        d3.select(this)
          .attr 'fill-opacity', 0.1

      .on 'mouseleave', ()->
        d3.select(this)
          .attr 'fill-opacity', 0.05

    @render_bg bg
    bg

  # Render any bg properties from variables
  render_bg: (bg)->
    bg ?= @g.select '.svg-bar-bg'
    bg
      .attr     "height", @height
      .attr     "width", @width


  # Add the border rect to the main group
  # If this is on top, you need to make sure it ignores
  # mouse events so clicks get through to lower elements
  add_border: ->
    border = @g.append "rect"
      .style    "fill", "#ffffff"
      .style    "fill-opacity", 0
      .style    "stroke", "#aaa"
      .style    "stroke-opacity", 0.5
      .attr     "class", 'svg-bar-border svg-bar-width'
      .attr     "x", 0
      .attr     "y", 0
    @render_border border
    border

  # Render any border properties from varaible that may change
  render_border: ( border )->
    border ?= @g.select '.svg-bar-border'
    border
      .attr     "height", @height
      .attr     "width", @width


  # Add the event count sized bars for each severity from the array data
  add_bars: ->
    self = @
    @bars.enter()
      .append 'g'
        .attr 'class', 'svg-bar-box'
      .append 'a'
        .attr 'title', (d)-> "#{self.label}"
        .attr 'xlink:href', (d,i)->
          "#{self.link}/severity/#{i+1}"
        .attr 'target', '_self'
      .append 'rect'
        .attr 'height', self.height
        .attr 'width', 1
        .attr 'stroke', "black"
        .attr 'stroke-opacity', 0
        .attr 'stroke-width', 0
        .attr 'x',  0
        .attr 'y',  0
        .attr 'class', (d,i)->
          # match the event console sevs
          "svg-bar severity-svg-#{i+1}"
        .on   'mouseenter', (d,i,j)->
          d3.select(this)
            .attr 'opacity', 1.0
            .attr 'stroke-opacity', 1
            .attr 'stroke-width', 20
        .on   'mouseleave', (d,i,j)->
          d3.select(this)
            .attr 'opacity', 0.8
            .attr 'stroke-opacity', 0
            .attr 'stroke-width', 0


  
  # Add the event count text for each severity from the array data
  add_counts: ->
    self = @
    @counts.enter()
      .append 'g'
        .attr 'class', 'svg-bar-counts'
        .attr 'opacity', 0
      # .append 'a'
      #   .attr 'title', (d)-> "#{self.label}"
      #   .attr 'xlink:href', (d,i)->
      #     "/console#/group/#{self.label}/severity/#{i}"
      #   .attr 'target', '_self'
      .append 'text'
        .attr 'class', 'svg-bar-summary-count'
        .attr 'x', 0
        .attr 'y', @text_middle
        .attr 'text-anchor', "end"
        .attr 'font-size', "#{@font_size-2}px"
        .text (d)-> d

  update_counts: ->
    self = @
    @counts.select('.svg-bar-summary-count')
      #.text Math.random()
      .text (d)-> d


  # Add the label for this group of events
  add_label: ->
    label_g = @g.append 'g'
      .attr 'class', 'svg-bar-label-group'
    
    # label_a = label_g.append 'a'
    #   .attr 'xlink:href', "/console#/group/#{@label}"
    
    # label_a.append 'rect'
    #   .attr 'class', 'svg-bar-label-rect'
    #   .attr 'x', 0
    #   .attr 'y', 0
    #   .attr 'height', @height
    #   .attr 'width', @label_size      
    #   .attr 'fill', '#000'
    #   .attr 'fill-opacity', 0
    #   .on 'mouseenter', ()->
    #     d3.select(this)
    #       .attr 'fill-opacity', 0.05

    #   .on 'mouseleave', ()->
    #     d3.select(this)
    #       .attr 'fill-opacity', 0

    label = label_g.append 'text'
      .attr 'class', 'svg-bar-label'
      .attr 'opacity', 0.7

    @render_label label
    label

  # Render the components of the label from variabels that
  # might change
  render_label: (label)->
    label ?= @g.select('svg-bar-label')
    label
      .attr 'x', @font_padding
      .attr 'y', @text_middle
      .attr 'font-size', "#{@font_size}px"
      .text @label
    label
  

  # Add a total event count to the right
  add_total: ->
    total_g = @g.append 'g'
      .attr 'class', 'svg-bar-total-group'

    # total_a = total_g.append 'a'
    #   .attr 'xlink:href', "/console#/group/#{@label}"

    # total_r = total_a.append 'rect'
    #   .attr 'class', 'svg-bar-total-rect'
    #   .attr 'x', @width - @summary_width
    #   .attr 'y', 0
    #   .attr 'width', @summary_width
    #   .attr 'height', @height
    #   .attr 'fill', '#000'
    #   .attr 'fill-opacity', 0
    #   .on 'mouseenter', ()->
    #     d3.select(this)
    #       .attr 'fill-opacity', 0.02

    #   .on 'mouseleave', ()->
    #     d3.select(this)
    #       .attr 'fill-opacity', 0

    total = total_g.append 'text'
      .attr 'class', 'svg-bar-total'
      .attr 'opacity', 0.7
    @render_total total
    total

  # Render any total values from variables
  render_total: ( total )->
    total ?= @g.select '.svg-bar-total'
    total
      .attr 'text-anchor', "end"
      .attr 'font-size', "#{@font_size-2}px"
      .attr 'x', @width - @font_padding
      .attr 'y', @text_middle
      .text @sum

  update_total: ->
    total = @g.select '.svg-bar-total'
    total.text @sum 

  
  # Transition to the event count summary view
  show_summary: ->
    self = @

    return if @sum is 0
      
    @bars.transition()
      .duration @duration
      .attr 'opacity', 0.75
      .attr 'height', @height
      .attr 'y', 0
      .attr 'transform', ( d, i )->
        x = self.label_size + ( i * self.summary_width )
        "translate(#{x},0)"
      
    .select '.svg-bar'
      .attr 'width', self.summary_width

      
    @counts.transition()
      .duration @duration
      #.delay (d,i)-> i * 10
      .attr 'width', self.summary_width
      .attr 'transform', ( d, i )->
        x = self.label_size + ( (i+1) * self.summary_width ) - self.font_padding
        "translate(#{x},0)"
      .attr 'opacity', 0.9
      .select ".svg-bar-summary-count"
        .text (d)-> d

    @showing = 'summary'


  # Transition to the stacked/scaled chart view
  show_chart: ->
    self = @

    @bars.transition()
      .duration @duration
      #.attr 'height', @height
      .attr 'opacity', 0.65
      .attr 'y', 0
      .attr 'transform', ( d, i )->
        r = 0
        if i > 0
          # slice the array to get the data up to now
          array = self.data[0..(i-1)]
          r = self.scale d3.sum(array)
          #d = self.data[i]
        #self.logger 'chart r d[%s] i[%s] a[%j]', d, i, self.data[0..i-1], r
        "translate(#{r},0)"

    .select '.svg-bar'
      .attr 'width', ( d,i )->
        #width = self.scale self.data[i]
        width = self.scale d
        #self.logger 'chart atr width', d, self.data, width
        width

    @counts.transition()
      .duration @duration
      .attr 'transform', ( d, i )->
        r = 0
        if i > 0
          # slice the array to get the data up to now
          array = self.data[0..(i-1)]
          r = self.scale d3.sum(array)
        #self.logger 'chart r d[%s] i[%s] a[%j]', d, i, self.data[0..i-1], r
        x = r + self.summary_width - self.font_padding
        "translate(#{x},0)"

      .attr 'opacity', 0
      
    @showing = 'chart'
