// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
class Dashboard {
  static initClass() {
    this.logger = debug('oa:event:console:dashboard');

    this.severities_data = [];
    this.sev_counts_group = [];
    this.sev_counts = [];
    this.groups = [];

    // Render the news
    this.news_template = $('#template-news-entry').html();
  }

  // If a serverity doesn't return a result, we need to set
  // the .total value for it
  static default_total_to_zero(sev_count_array) {
    if (sev_count_array.length === 0) {
      return sev_count_array.push({ total: 0 });
    }
  }

  // Build an array of _all_ counts for each severity (excluding 0)
  // Loop over the ordered severities
  // it reveresed for the generic query sort order.
  static build_all_severities_array() {
    return (() => {
      const result = [];
      const iterable = this.severities.slice(0, +-2 + 1 || undefined);
      for (let i = iterable.length - 1; i >= 0; i--) {
        var severity_doc = iterable[i];
        var sev_count_array = _.filter(this.sev_counts, { _id: severity_doc.value });
        this.default_total_to_zero(sev_count_array);
        result.push(sev_count_array[0].total);
      }
      return result;
    })();
  }

  // Build an array of _group_ counts for each severity (excluding 0)
  // it reveresed for the sort order.
  static build_groups_severities_array(group_data) {
    return (() => {
      const result = [];
      const iterable = this.severities.slice(0, +-2 + 1 || undefined);
      for (let i = iterable.length - 1; i >= 0; i--) {
        var severity_doc = iterable[i];
        var sev_count_array = _.filter(group_data, { _id: { severity: severity_doc.value } });
        this.default_total_to_zero(sev_count_array);
        result.push(sev_count_array[0].total);
      }
      return result;
    })();
  }

  // Save all query data in `Dashboard`
  static save_data(severities, sev_counts_group, sev_counts, groups) {
    this.severities = severities;
    this.sev_counts_group = sev_counts_group;
    this.sev_counts = sev_counts;
    return (this.groups = groups);
  }

  // Generate the required data for the severity bars and then draw them
  static severity_bars_data() {
    // Setup the 'All Event' data, convert mongo -> d3
    this.d3_data = [];
    const counts = Dashboard.build_all_severities_array();

    // Add the pseudo group for "All Events"
    this.d3_data[0] = {};
    this.d3_data[0].id = 'All_Events';
    this.d3_data[0].label = 'All Events';
    this.d3_data[0].link = '/console#';
    this.d3_data[0].data = counts;

    // Setup the rest of the data, including the "No group"
    // again, converting the mongo array of objects into an array for d3

    //     [{ _id: { group:y, severity: 0 }, total: n }]
    //     [{ _id: { group:y, severity: 1 }, total: n }]

    // to

    //     id: y, data: [ total0, total1 ]

    const iterable = [''].concat(this.groups);
    for (let index = 0; index < iterable.length; index++) {
      var group = iterable[index];
      var group_data = _.filter(this.sev_counts_group, { _id: { group } });
      this.logger('group_data', group, group_data);

      var group_sev_counts = Dashboard.build_groups_severities_array(group_data);

      // Fix some names
      var group_name = group.replace(/_/g, ' ');
      var group_link = encodeURI(group);
      if (group === '') {
        group_name = 'No Group';
        group_link = encodeURI('No Group');
      }

      // Create the group data for the d3 severity charts and attach it to `data`
      var grp = {
        id: group,
        data: group_sev_counts,
        label: group_name,
        link: `/console#/group/${group_link}`,
      };

      this.d3_data.push(grp);
    }

    return this.logger('group_data after map', this.d3_data);
  }

  static draw_severity_bars() {
    // Allow a large display to have two bootstrap columns
    const half_the_groups = Math.floor(this.d3_data.length / 2);

    if (this.stacks_1) {
      this.stacks_1.update_stack(this.d3_data.slice(0, +half_the_groups + 1 || undefined));
    } else {
      $('#charts_svg_1').html('');
      this.stacks_1 = new StacksSvg('charts_svg_1', this.d3_data.slice(0, +half_the_groups + 1 || undefined), {
        height: 30,
        gap: 5,
        toggle_hover: true,
        show_total: true,
        resize: true,
      });
    }

    if (this.stacks_2) {
      return this.stacks_2.update_stack(this.d3_data.slice(half_the_groups + 1));
    } else {
      $('#charts_svg_2').html('');
      return (this.stacks_2 = new StacksSvg('charts_svg_2', this.d3_data.slice(half_the_groups + 1), {
        height: 30,
        gap: 5,
        toggle_hover: true,
        show_total: true,
        resize: true,
      }));
    }
  }

  static update_severity_bars(data) {
    data ??= {};
    return this.stacks_1.update_stack(data);
  }

  // Populate the jumbo serverity counts
  // After the severity bars have created the data
  static populate_jumbo_counts() {
    $('.number-critical').text(Helpers.round_number(this.d3_data[0].data[4] || 0));
    $('.number-major').text(Helpers.round_number(this.d3_data[0].data[3] || 0));
    $('.number-minor').text(Helpers.round_number(this.d3_data[0].data[2] || 0));
    $('.number-warning').text(Helpers.round_number(this.d3_data[0].data[1] || 0));
    return $('.number-indeterminate').text(Helpers.round_number(this.d3_data[0].data[0] || 0));
  }

  static recieve_severity_data(data) {
    this.logger('received severity data for render', data);

    Dashboard.save_data(data.severities, data.sev_counts_group, data.sev_counts, data.groups);

    Dashboard.severity_bars_data();
    Dashboard.draw_severity_bars();

    return Dashboard.populate_jumbo_counts();
  }
  static populate_news(news_data) {
    this.logger('populating news data', news_data);
    $('.news-widget').html(Mustache.render(this.news_template, { news: news_data }));
    return $('.news-widget').find('.details').timeago();
  }
}
Dashboard.initClass();

$(function () {
  // Load the severity info for the dashboard page
  socket.emit('events::severities', {}, function (err, data) {});
  //Dashboard.recieve_severity_data( data )
  // Just using the emit so we don't get two loads

  //  socket.emit 'news::read', {}, ( err, response )->
  //    if err then return Message.error(err)
  //    if response and response.error
  //      return Message.error(response.error)
  //    Dashboard.populate_news(response.data)

  // Listen for sev updates
  socket.on('events::severities', data => Dashboard.recieve_severity_data(data));

  $('.dashboard-metric-critical').on('click', () => (window.location.href = '/console/#/severity/Critical'));

  $('.dashboard-metric-major').on('click', () => (window.location.href = '/console/#/severity/Major'));

  $('.dashboard-metric-minor').on('click', () => (window.location.href = '/console/#/severity/Minor'));

  $('.dashboard-metric-warning').on('click', () => (window.location.href = '/console/#/severity/Warning'));

  return $('.dashboard-metric-indeterminate').on(
    'click',
    () => (window.location.href = '/console/#/severity/Indeterminate')
  );
});

window.Dashboard = Dashboard;
