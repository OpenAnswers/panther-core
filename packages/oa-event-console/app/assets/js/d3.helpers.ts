// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
var D3 = (function () {
  let debug_d3 = undefined;
  D3 = class D3 {
    static initClass() {
      debug_d3 = debug('oa:d3');
    }

    static rect(svg, options) {
      debug('drawing rect with opts', options);

      const id = options.id ?? null;
      const x = options.x ?? 100;
      const y = options.y ?? 100;

      const height = options.height ?? 100;
      const width = options.width ?? 100;
      const opacity = options.opacity ?? 1;

      const stroke = options.stroke ?? null;
      const stroke_width = options.stroke_width ?? null;
      const stroke_opacity = options.stroke_opacity ?? null;

      const fill = options.fill ?? '#333';
      const fill_opacity = options.fill_opacity ?? null;

      const rect = svg.append('rect');
      rect.attr('id', id);
      rect.attr('x', x);
      rect.attr('y', y);
      rect.attr('height', height);
      rect.attr('width', width);
      if (stroke != null) {
        rect.style('stroke', stroke);
      }
      rect.style('fill', fill);
      if (fill_opacity != null) {
        rect.style('fill-opacity', fill_opacity);
      }
      if (stroke != null) {
        rect.style('stroke', stroke);
      }
      if (stroke != null && stroke_width != null) {
        rect.style('stroke-width', stroke_width);
      }
      if (stroke != null && stroke_opacity != null) {
        rect.style('stroke-opacity', stroke_opacity);
      }

      return rect;
    }

    static circle_center(svg, options) {
      debug('drawing circle with opts', options);

      const id = options.id ?? null;
      const x = options.x ?? 100;
      const y = options.y ?? 100;

      const height = options.height ?? 100;
      const width = options.width ?? 100;
      const opacity = options.opacity ?? 1;

      const stroke = options.stroke ?? null;
      const stroke_width = options.stroke_width ?? null;
      const stroke_opacity = options.stroke_opacity ?? null;

      const fill = options.fill ?? '#333';
      const fill_opacity = options.fill_opacity ?? null;

      const circle = svg.append('circle');
      if (id != null) {
        circle.attr('id', id);
      }
      circle.attr('cx', x);
      circle.attr('cy', y);
      circle.attr('height', height);
      circle.attr('width', width);
      circle.style('stroke', stroke);
      circle.style('fill', fill);
      if (fill_opacity != null) {
        circle.style('fill-opacity', fill_opacity);
      }
      if (stroke != null) {
        circle.style('stroke', stroke);
      }
      if (stroke != null && stroke_width != null) {
        circle.style('stroke-width', stroke_width);
      }
      if (stroke != null && stroke_opacity != null) {
        circle.style('stroke-opacity', stroke_opacity);
      }

      return circle;
    }

    // Create a glow

    static glow(url) {
      url ??= 'glow';
      let stdDeviation = 5;
      let rgb = '#000';
      let colorMatrix = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0';

      const my = function () {
        const defs = this.append('defs');

        const filter = defs
          .append('filter')
          .attr('id', url)
          .attr('x', '-20%')
          .attr('y', '-20%')
          .attr('width', '140%')
          .attr('height', '140%')
          .call(function () {
            this.append('feColorMatrix').attr('type', 'matrix').attr('values', colorMatrix);
            return (
              this.append('feGaussianBlur')
                // .attr("in", "SourceGraphics")
                .attr('stdDeviation', stdDeviation)
                .attr('result', 'coloredBlur')
            );
          });

        return filter.append('feMerge').call(function () {
          this.append('feMergeNode').attr('in', 'coloredBlur');
          return this.append('feMergeNode').attr('in', 'SourceGraphic');
        });
      };

      my.rgb = function (value) {
        if (value == null) {
          return color;
        }
        rgb = value;
        var color = d3.rgb(value);
        colorMatrix = `0 0 0 ${color.r / 256} 0 0 0 0 0 ${color.g / 256} 0 0 0 0 ${color.b / 256} 0 0 0 1 0`;

        return my;
      };

      my.stdDeviation = function (value) {
        if (value == null) {
          return stdDeviation;
        }
        stdDeviation = value;
        return my;
      };

      return my;
    }

    // ###### gradient( svg, options )

    // Create a gradient defiition
    static gradient(svg, id, options) {
      id ??= 'gradient';
      options ??= {};
      const start_colour = '#000';
      const start_opacity = 1;
      const end_colour = '#fff';
      const end_opacity = 1;

      const gradient = svg
        .append('svg:defs')
        .append('svg:linearGradient')
        .attr('id', `${id}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%')
        .attr('spreadMethod', 'pad');

      // Define the gradient colors
      gradient
        .append('svg:stop')
        .attr('offset', '0%')
        .attr('stop-color', `#${start_colour}`)
        .attr('stop-opacity', start_opacity);

      gradient
        .append('svg:stop')
        .attr('offset', '100%')
        .attr('stop-color', `#${end_colour}`)
        .attr('stop-opacity', end_opacity);

      return gradient;
    }
  };
  D3.initClass();
  return D3;
})();
