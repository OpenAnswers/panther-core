

class Dashboard

  @logger = debug 'oa:event:console:dashboard'

  @severities_data: []
  @sev_counts_group: []
  @sev_counts: []
  @groups: []
  
  # If a serverity doesn't return a result, we need to set
  # the .total value for it
  @default_total_to_zero: ( sev_count_array )->
    if sev_count_array.length is 0
      sev_count_array.push { total: 0 }


  # Build an array of _all_ counts for each severity (excluding 0)
  # Loop over the ordered severities 
  # it reveresed for the generic query sort order.
  @build_all_severities_array: ->
    for severity_doc in @severities[0..-2] by -1
      sev_count_array = _.filter @sev_counts, _id: severity_doc.value
      @default_total_to_zero(sev_count_array)
      sev_count_array[0].total


  # Build an array of _group_ counts for each severity (excluding 0)
  # it reveresed for the sort order.
  @build_groups_severities_array: ( group_data )->
    for severity_doc in @severities[0..-2] by -1
      sev_count_array = _.filter group_data, _id: severity: severity_doc.value
      @default_total_to_zero(sev_count_array)
      sev_count_array[0].total


  # Save all query data in `Dashboard`
  @save_data: ( severities, sev_counts_group, sev_counts, groups )  ->
    @severities = severities
    @sev_counts_group = sev_counts_group
    @sev_counts = sev_counts
    @groups = groups


  # Generate the required data for the severity bars and then draw them
  @severity_bars_data: ()->
    
    # Setup the 'All Event' data, convert mongo -> d3
    @d3_data = []
    counts = Dashboard.build_all_severities_array()

    # Add the pseudo group for "All Events"
    @d3_data[0] = {}
    @d3_data[0].id = 'All_Events'
    @d3_data[0].label = 'All Events'
    @d3_data[0].link = '/console#'
    @d3_data[0].data = counts


    # Setup the rest of the data, including the "No group"
    # again, converting the mongo array of objects into an array for d3

    #     [{ _id: { group:y, severity: 0 }, total: n }]
    #     [{ _id: { group:y, severity: 1 }, total: n }]

    # to

    #     id: y, data: [ total0, total1 ]

    for group, index in [''].concat(@groups)

      group_data = _.filter @sev_counts_group, _id: group: group
      @logger 'group_data', group, group_data

      group_sev_counts = Dashboard.build_groups_severities_array( group_data )

      # Fix some names
      group_name = group.replace( /_/g, ' ' )
      group_link = encodeURI(group)
      if group is ''
        group_name = "No Group"
        group_link = encodeURI('No Group')

      # Create the group data for the d3 severity charts and attach it to `data`
      grp =
        id: group
        data: group_sev_counts
        label: group_name
        link: "/console#/group/#{group_link}"

      @d3_data.push grp

    @logger 'group_data after map', @d3_data


  @draw_severity_bars: ->
    # Allow a large display to have two bootstrap columns
    half_the_groups = Math.floor(@d3_data.length/2)

    if @stacks_1
      @stacks_1.update_stack @d3_data[0..half_the_groups]
    else
      $('#charts_svg_1').html('')
      @stacks_1 = new StacksSvg "charts_svg_1", @d3_data[0..half_the_groups],
        height: 30
        gap: 5
        toggle_hover: true
        show_total: true
        resize: true

    if @stacks_2
      @stacks_2.update_stack @d3_data[half_the_groups+1..-1]
    else
      $('#charts_svg_2').html('')
      @stacks_2 = new StacksSvg "charts_svg_2", @d3_data[half_the_groups+1..-1],
        height: 30
        gap: 5
        toggle_hover: true
        show_total: true
        resize: true

  @update_severity_bars: (data = {}) ->
    @stacks_1.update_stack(data)

  # Populate the jumbo serverity counts
  # After the severity bars have created the data
  @populate_jumbo_counts: ->
    $('.number-critical').text  Helpers.round_number(@d3_data[0].data[4] or 0)
    $('.number-major').text     Helpers.round_number(@d3_data[0].data[3] or 0)
    $('.number-minor').text     Helpers.round_number(@d3_data[0].data[2] or 0)
    $('.number-warning').text   Helpers.round_number(@d3_data[0].data[1] or 0)
    $('.number-indeterminate').text Helpers.round_number(@d3_data[0].data[0] or 0)

  @recieve_severity_data: ( data )->
    @logger 'received severity data for render', data

    Dashboard.save_data data.severities,
      data.sev_counts_group,
      data.sev_counts,
      data.groups

    Dashboard.severity_bars_data()
    Dashboard.draw_severity_bars()

    Dashboard.populate_jumbo_counts()

  # Render the news
  @news_template: $('#template-news-entry').html()
  @populate_news: (news_data)->
    @logger 'populating news data', news_data
    $('.news-widget').html Mustache.render(@news_template, news:news_data)
    $('.news-widget').find(".details").timeago()
    


$ ->

  # Load the severity info for the dashboard page
  socket.emit 'events::severities', {}, ( err, data )->
    #Dashboard.recieve_severity_data( data )
    # Just using the emit so we don't get two loads

#  socket.emit 'news::read', {}, ( err, response )->
#    if err then return Message.error(err)
#    if response and response.error 
#      return Message.error(response.error)
#    Dashboard.populate_news(response.data)

  # Listen for sev updates
  socket.on 'events::severities', ( data )->
    Dashboard.recieve_severity_data( data )


  $(".dashboard-metric-critical").on 'click', ->
    window.location.href = '/console/#/severity/Critical'

  $(".dashboard-metric-major").on 'click', ->
    window.location.href = '/console/#/severity/Major'

  $(".dashboard-metric-minor").on 'click', ->
    window.location.href = '/console/#/severity/Minor'

  $(".dashboard-metric-warning").on 'click', ->
    window.location.href = '/console/#/severity/Warning'

  $(".dashboard-metric-indeterminate").on 'click', ->
    window.location.href = '/console/#/severity/Indeterminate'

