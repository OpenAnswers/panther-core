// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// ## Stacks

// Stacks manages a chart of Stack.
// It was hard to get D3 to manage the normalized groups in a single svg chart.
// There's some manual setup in here to create individual charts that might be
// able to done in D3 more easily, but it escaped me.

// The data structure to send in looks like this:

// ```
// @numbers = [
//   { id: 'All',  data: [ 15, 84, 42,  4, 27 ] },
//   { id: 'None', data: [ 10,  4, 17, 21,  4 ] },
//   { id: 'Jim',  data: [  0,  4,  0, 21, 25 ] },
// ]
// ```

// Which is the name, and 1,2,3,4,5 sev counts.

class StacksSvg {
  static initClass() {
    this.logger = debug('oa:d3:stacks-svg');
  }

  constructor(id1, data, options) {
    this.id = id1;
    this.data = data;
    options ??= {};
    this.options = options;
    this.chart_el = d3.select(`#${this.id}`);
    this.store = {};

    this.logger = this.constructor.logger;
    this.logger('StacksSvg new [%s]', this.id, this.chart_el, this.options, this.data);

    if (this.chart_el[0][0] == null) {
      Message.error(`d3 couldnt select id [${this.id}]`);
      return;
    }

    this.width = this.options.width ?? (this.options.width = this.chart_el.node().clientWidth);
    this.height = this.options.height ?? (this.options.height = 50);
    this.resize = this.options.resize ?? (this.options.resize = false);

    this.last_resize = Date.now();

    const div = d3.select(`#${this.id}`);

    this.logger('creating charts w[%s] h[%s]', this.width, this.height);

    // Loop over all the array items, which equal a chart and build it
    for (var chart_def of this.data) {
      if (chart_def.uid == null) {
        chart_def.uid = Helpers.random_string(8);
      }

      var id = `${this.id}-stacksvg-${chart_def.uid}`;
      this.logger('creating %s', id, this.options);

      div.append('svg').attr('id', id).attr('class', 'svgchart').attr('width', this.width).attr('height', this.height);

      this.options.label = chart_def.label;
      this.options.link = chart_def.link;
      if (this.options.label == null) {
        this.options.label = chart_def.id;
      }
      this.options.parent_id = this.id;

      var chart_svg = new StackSvg(id, chart_def.data, this.options);
      chart_svg.add();
      chart_svg.show_chart();

      this.store[chart_def.id] = chart_svg;
    }

    if (this.resize) {
      const self = this;
      $(window).on('resize', () =>
        //self.logger 'ressize event!', self
        self.run_resize()
      );
    }
  }

  // It would be good to use a _.debounce sheild for the resize, but ran into
  // problems using the class methods via the the _ functions

  run_resize() {
    if (this.width === d3.select(`#${this.id}`).node().clientWidth) {
      return;
    }
    for (var name in this.store) {
      var stack = this.store[name];
      this.logger(`resizing ${name}`, name, stack);
      stack.resize();
    }
    return (this.width = d3.select(`#${this.id}`).node().clientWidth);
  }

  update_stack(dataArray) {
    return (() => {
      const result = [];
      for (var name in this.store) {
        // @logger "updating #{name}", name, chart_svg
        var chart_svg = this.store[name];
        result.push(
          (() => {
            const result1 = [];
            for (var datum of dataArray) {
              if (datum.id === name) {
                result1.push(chart_svg.update(datum.data));
              } else {
                result1.push(undefined);
              }
            }
            return result1;
          })()
        );
      }
      return result;
    })();
  }
}
StacksSvg.initClass();

// ## Stack

// Stack will draw a single svg stack to a div container

// Config
// - duration     Duration of the animations (300)
// - width        Width of the svg (parent div)
// - height       Height of the svg (30)
// - label        Label for the bar, with _'s remooved (ID)
// - font_size    Base font size (17)

// Options
// - link         Prefix for links
// - show_total   Show totals on the right?
// - summary      Show summary?
// - toggle_hover Toggle summary on hover
// - toggle_click Togge summary on click

// Details
// - parent_id    = @options.parent_id

class StackSvg {
  static initClass() {
    this.logger = debug('oa:d3:stack-svg');
  }

  constructor(id, data, options) {
    this.id = id;
    this.data = data;
    options ??= {};
    this.options = options;
    this.chart_el = d3.select(`#${this.id}`);
    //@chart_el = d3.select "##{@id}-stacksvg-#{chart_def.id}"

    this.logger = this.constructor.logger;
    this.logger('StackSvg new [%s]', this.id, this.chart_el, this.options, this.data);

    if (this.chart_el[0][0] == null) {
      Message.error(`d3 couldnt select id [${this.id}]`);
      return;
    }

    // Rendering
    this.duration = this.options.duration ?? 300;
    this.width = this.options.width ?? this.chart_el.node().clientWidth;
    this.height = this.options.height ?? 30;
    this.label = this.options.label ?? this.id.replace(/_/g, ' ');
    this.font_size = this.options.font_size ?? 17;

    // Options
    this.link = this.options.link ?? null;
    this.show_total = this.options.show_total ?? false;
    this.summary = this.options.summary ?? true;
    this.toggle_hover = this.options.toggle_hover ?? false;
    this.toggle_click = this.options.toggle_click ?? false;

    // deatils
    this.parent_id = this.options.parent_id ?? null;
    this.parent_id_el = d3.select(`#${this.id}`);

    // calculate vars from options
    this.calculate_vars();

    // Create the initial chart group
    this.g = this.chart_el.append('g').attr('class', 'svg-chart-container');

    // Bind the data sets to the visual bar
    this.bars = this.g.selectAll('.bar').data(this.data);

    // Bind the data to the counts
    this.counts = this.g.selectAll('.count').data(this.data);
  }

  // helper to grab the parents with (for resize)
  parent_width() {
    return d3.select(`#${this.parent_id}`).node().clientWidth;
  }

  // calculate all the setup variables (for resize, re render)
  calculate_vars() {
    // Font placement needs some help
    this.row_half = this.height / 2;
    this.font_padding = this.font_size / 2;
    this.font_thirds = this.font_size / 3;
    this.text_middle = this.row_half + this.font_thirds;

    // D3 vars for scale
    this.sum = d3.sum(this.data);
    this.scale = d3.scale.linear().domain([0, this.sum]).range([0, this.width]);

    // D3 vars for our layout
    this.label_size = 0;
    if (this.label != null) {
      this.label_size = 130;
    }
    this.summary_count = this.data.length;
    if (this.show_total != null) {
      this.summary_count += 1;
    }
    this.summary_width = (this.width - this.label_size) / this.summary_count;

    return (this.summary_scale = d3.scale.linear().domain([0, this.data.length]).range([this.label_size, this.width]));
  }

  // @showing controls which view is currently on screen
  toggle() {
    switch (this.showing) {
      case 'chart':
        return this.show_summary();
      case 'summary':
        return this.show_chart();
      default:
        return this.show_chart();
    }
  }

  // resize and draw everything based on the parent divs width
  resize() {
    this.logger('stack resize');
    this.width = this.parent_width();

    this.logger('stack resize width', this.width);
    this.calculate_vars();

    this.chart_el.attr('height', this.height).attr('width', this.width);

    this.g.select('.svg-bar-width').attr('width', this.width);

    this.render_total();
    this.render_label();
    this.render_bg();
    this.render_border();

    switch (this.showing) {
      case 'chart':
        return this.show_chart();
      case 'summary':
        return this.show_summary();
    }
  }

  update(data) {
    // store the new data
    this.data = data;
    // update internals
    this.calculate_vars();

    // set data in D3
    this.bars.data(this.data);
    this.counts.data(this.data);

    this.update_total();

    this.logger('stack update', this.data);
    switch (this.showing) {
      case 'chart':
        return this.show_chart();
      case 'summary':
        return this.show_summary();
    }
  }

  // Add the main svg to the container div
  add() {
    const self = this;
    this.chart_el.attr('height', this.height).attr('width', this.width);

    this.add_bg();
    this.add_bars();
    this.add_counts();
    if (this.label != null) {
      this.add_label();
    }
    if (this.show_total != null) {
      this.add_total();
    }
    this.add_border();

    if (this.toggle_hover) {
      this.chart_el.on('mouseenter', () => self.toggle());
      this.chart_el.on('mouseleave', () => self.toggle());
    }

    if (this.toggle_click) {
      return this.chart_el.on('mouseclick', () => self.toggle());
    }
  }

  // Add the background rect to the main group
  add_bg() {
    const self = this;

    const bg_g = this.g.append('g').attr('class', 'svg-bar-bg');

    const bg_a = bg_g.append('a').attr('xlink:href', `${self.link}`);

    const bg = bg_a
      .append('rect')
      .attr('class', 'svg-bar-bg svg-bar-width')
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', '#000')
      .attr('fill-opacity', 0.05)

      .on('mouseenter', function () {
        return d3.select(this).attr('fill-opacity', 0.1);
      })
      .on('mouseleave', function () {
        return d3.select(this).attr('fill-opacity', 0.05);
      });

    this.render_bg(bg);
    return bg;
  }

  // Render any bg properties from variables
  render_bg(bg) {
    bg ??= this.g.select('.svg-bar-bg');
    return bg.attr('height', this.height).attr('width', this.width);
  }

  // Add the border rect to the main group
  // If this is on top, you need to make sure it ignores
  // mouse events so clicks get through to lower elements
  add_border() {
    const border = this.g
      .append('rect')
      .style('fill', '#ffffff')
      .style('fill-opacity', 0)
      .style('stroke', '#aaa')
      .style('stroke-opacity', 0.5)
      .attr('class', 'svg-bar-border svg-bar-width')
      .attr('x', 0)
      .attr('y', 0);
    this.render_border(border);
    return border;
  }

  // Render any border properties from varaible that may change
  render_border(border) {
    border ??= this.g.select('.svg-bar-border');
    return border.attr('height', this.height).attr('width', this.width);
  }

  // Add the event count sized bars for each severity from the array data
  add_bars() {
    const self = this;
    return this.bars
      .enter()
      .append('g')
      .attr('class', 'svg-bar-box')
      .append('a')
      .attr('title', d => `${self.label}`)
      .attr('xlink:href', (d, i) => `${self.link}/severity/${i + 1}`)
      .attr('target', '_self')
      .append('rect')
      .attr('height', self.height)
      .attr('width', 1)
      .attr('stroke', 'black')
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 0)
      .attr('x', 0)
      .attr('y', 0)
      .attr(
        'class',
        (
          d,
          i // match the event console sevs
        ) => `svg-bar severity-svg-${i + 1}`
      )
      .on('mouseenter', function (d, i, j) {
        return d3.select(this).attr('opacity', 1.0).attr('stroke-opacity', 1).attr('stroke-width', 20);
      })
      .on('mouseleave', function (d, i, j) {
        return d3.select(this).attr('opacity', 0.8).attr('stroke-opacity', 0).attr('stroke-width', 0);
      });
  }

  // Add the event count text for each severity from the array data
  add_counts() {
    const self = this;
    return (
      this.counts
        .enter()
        .append('g')
        .attr('class', 'svg-bar-counts')
        .attr('opacity', 0)
        // .append 'a'
        //   .attr 'title', (d)-> "#{self.label}"
        //   .attr 'xlink:href', (d,i)->
        //     "/console#/group/#{self.label}/severity/#{i}"
        //   .attr 'target', '_self'
        .append('text')
        .attr('class', 'svg-bar-summary-count')
        .attr('x', 0)
        .attr('y', this.text_middle)
        .attr('text-anchor', 'end')
        .attr('font-size', `${this.font_size - 2}px`)
        .text(d => d)
    );
  }

  update_counts() {
    const self = this;
    return (
      this.counts
        .select('.svg-bar-summary-count')
        //.text Math.random()
        .text(d => d)
    );
  }

  // Add the label for this group of events
  add_label() {
    const label_g = this.g.append('g').attr('class', 'svg-bar-label-group');

    // label_a = label_g.append 'a'
    //   .attr 'xlink:href', "/console#/group/#{@label}"

    // label_a.append 'rect'
    //   .attr 'class', 'svg-bar-label-rect'
    //   .attr 'x', 0
    //   .attr 'y', 0
    //   .attr 'height', @height
    //   .attr 'width', @label_size
    //   .attr 'fill', '#000'
    //   .attr 'fill-opacity', 0
    //   .on 'mouseenter', ()->
    //     d3.select(this)
    //       .attr 'fill-opacity', 0.05

    //   .on 'mouseleave', ()->
    //     d3.select(this)
    //       .attr 'fill-opacity', 0

    const label = label_g.append('text').attr('class', 'svg-bar-label').attr('opacity', 0.7);

    this.render_label(label);
    return label;
  }

  // Render the components of the label from variabels that
  // might change
  render_label(label) {
    label ??= this.g.select('svg-bar-label');
    label
      .attr('x', this.font_padding)
      .attr('y', this.text_middle)
      .attr('font-size', `${this.font_size}px`)
      .text(this.label);
    return label;
  }

  // Add a total event count to the right
  add_total() {
    const total_g = this.g.append('g').attr('class', 'svg-bar-total-group');

    // total_a = total_g.append 'a'
    //   .attr 'xlink:href', "/console#/group/#{@label}"

    // total_r = total_a.append 'rect'
    //   .attr 'class', 'svg-bar-total-rect'
    //   .attr 'x', @width - @summary_width
    //   .attr 'y', 0
    //   .attr 'width', @summary_width
    //   .attr 'height', @height
    //   .attr 'fill', '#000'
    //   .attr 'fill-opacity', 0
    //   .on 'mouseenter', ()->
    //     d3.select(this)
    //       .attr 'fill-opacity', 0.02

    //   .on 'mouseleave', ()->
    //     d3.select(this)
    //       .attr 'fill-opacity', 0

    const total = total_g.append('text').attr('class', 'svg-bar-total').attr('opacity', 0.7);
    this.render_total(total);
    return total;
  }

  // Render any total values from variables
  render_total(total) {
    total ??= this.g.select('.svg-bar-total');
    return total
      .attr('text-anchor', 'end')
      .attr('font-size', `${this.font_size - 2}px`)
      .attr('x', this.width - this.font_padding)
      .attr('y', this.text_middle)
      .text(this.sum);
  }

  update_total() {
    const total = this.g.select('.svg-bar-total');
    return total.text(this.sum);
  }

  // Transition to the event count summary view
  show_summary() {
    const self = this;

    if (this.sum === 0) {
      return;
    }

    this.bars
      .transition()
      .duration(this.duration)
      .attr('opacity', 0.75)
      .attr('height', this.height)
      .attr('y', 0)
      .attr('transform', function (d, i) {
        const x = self.label_size + i * self.summary_width;
        return `translate(${x},0)`;
      })
      .select('.svg-bar')
      .attr('width', self.summary_width);

    this.counts
      .transition()
      .duration(this.duration)
      //.delay (d,i)-> i * 10
      .attr('width', self.summary_width)
      .attr('transform', function (d, i) {
        const x = self.label_size + (i + 1) * self.summary_width - self.font_padding;
        return `translate(${x},0)`;
      })
      .attr('opacity', 0.9)
      .select('.svg-bar-summary-count')
      .text(d => d);

    return (this.showing = 'summary');
  }

  // Transition to the stacked/scaled chart view
  show_chart() {
    const self = this;

    this.bars
      .transition()
      .duration(this.duration)
      //.attr 'height', @height
      .attr('opacity', 0.65)
      .attr('y', 0)
      .attr('transform', function (d, i) {
        let r = 0;
        if (i > 0) {
          // slice the array to get the data up to now
          const array = self.data.slice(0, +(i - 1) + 1 || undefined);
          r = self.scale(d3.sum(array));
        }
        //d = self.data[i]
        //self.logger 'chart r d[%s] i[%s] a[%j]', d, i, self.data[0..i-1], r
        return `translate(${r},0)`;
      })
      .select('.svg-bar')
      .attr('width', function (d, i) {
        //width = self.scale self.data[i]
        const width = self.scale(d);
        //self.logger 'chart atr width', d, self.data, width
        return width;
      });

    this.counts
      .transition()
      .duration(this.duration)
      .attr('transform', function (d, i) {
        let r = 0;
        if (i > 0) {
          // slice the array to get the data up to now
          const array = self.data.slice(0, +(i - 1) + 1 || undefined);
          r = self.scale(d3.sum(array));
        }
        //self.logger 'chart r d[%s] i[%s] a[%j]', d, i, self.data[0..i-1], r
        const x = r + self.summary_width - self.font_padding;
        return `translate(${x},0)`;
      })
      .attr('opacity', 0);

    return (this.showing = 'chart');
  }
}
StackSvg.initClass();

window.StacksSvg = StacksSvg;
window.StackSvg = StackSvg;
