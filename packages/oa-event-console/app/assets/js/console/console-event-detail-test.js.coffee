###*
# @deprecated no longer used
###

# window on load
$ ->

  debug_d3 = debug 'oa:console:event-detail-d3'

  # Simple dots

  margin = 20
  width = 500

  event_scale2 = d3.scale.linear()
    .domain [ 0, 20 ]
    .range  [ 0+margin, width-margin ]

  svg2 = d3.select "#chart2"
    .append   "svg"
    .attr "width", width
    .attr "height", margin

  svg2.append "g"
    .selectAll "circle"
    .data [ 1 , 5 , 9, 12, 13, 20 ]
    .enter()
    .append "svg:circle"
      .style    "fill", "steelblue"
      .style    "stroke", "darkblue"
      .attr     "r", 7
      .attr     "cy", 7+2
      .attr     "cx", ( d )->
        scaled = event_scale2 d
        debug_d3 'd: [%s] scaled: [%s]', d, scaled
        scaled


  # Occurences chart

  if doc and doc.current and doc.current.length > 1
    times = doc.current
    debug_d3 'Using times from doc', doc.current
  else
    debug_d3 'not using doc', doc
    times = [
      Date.now()-90000
      Date.now()-70000
      Date.now()-60000
      Date.now()-50000
      Date.now()-44000
      Date.now()-22000
      Date.now()-12000
      Date.now()-8000
    ]

  Occurrence.event_time_dots "#chart1", times,
    label: 'All'
    opacity: 0.3


  # html sev bars
 
  # @numbers = [
  #   { id: 'All',  data: [ 15, 84, 42,  4, 27 ] },
  #   { id: 'None', data: [ 10,  4, 17, 21,  4 ] },
  #   { id: 'Jim',  data: [  0,  4,  0, 21, 25 ] },
  # ]
  
# This is what mongodb dumps out for the aggregation queries

# [ { _id: 5, total: 192 },
#   { _id: 4, total: 139 },
#   { _id: 3, total: 1093 },
#   { _id: 2, total: 429 },
#   { _id: 1, total: 3 } ]

# [ { _id: { severity: 5, group: '' }, total: 192 },
#   { _id: { severity: 4, group: '' }, total: 139 },
#   { _id: { severity: 3, group: '' }, total: 1093 },
#   { _id: { severity: 2, group: '' }, total: 429 },
#   { _id: { severity: 1, group: '' }, total: 3 } ]


  # Setup the 'All Event' data, convert mongo->d3
  data = []
  counts = []
  for sev in severities[1..-1]
    a = _.filter sev_counts, _id: sev.value
    counts.push a[0].total
  data[0] = {}
  data[0].id = 'All_Events'
  data[0].data = counts


  # Now convert the data for the groups mongo->d3.
  # We append none or '' to the front as it's not really a group
  # but it does exist in data

  for group, index in [''].concat(groups)

    group_data = _.filter sev_counts_group, _id: group: group
    debug_d3 'group_data', group, group_data

    counts = []
    for sev in severities[1..-1]
      a = _.filter group_data, _id: severity: sev.value
      if a.length is 0
        a.push { total: 0 }
      counts.push a[0].total
    grp = { id: group, data: counts }
    data.push grp

    debug_d3 'group_data after map', data
    link =  "/console#/group/#{group}"

  # Allow a large display to have two bootstrap columns
  half = Math.floor(data.length/2)

  stacks_1 = new StacksSvg "charts_svg_1", data[0..half],
    height: 30
    gap: 5
    toggle_hover: true
    show_total: true
    resize: true

  stacks_2 = new StacksSvg "charts_svg_2", data[half..-1],
    height: 30
    gap: 5
    toggle_hover: true
    show_total: true
    resize: true


