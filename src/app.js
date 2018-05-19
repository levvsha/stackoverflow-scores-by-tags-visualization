import './styles.styl';

import * as d3 from 'd3';
import _throttle from 'lodash/throttle';
import _ceil from 'lodash/ceil';

const colors = [
  '#aec7e8',
  '#ffbb78',
  '#98df8a',
  '#ff9896',
  '#c5b0d5',
  '#c49c94',
  '#f7b6d2',
  '#c7c7c7',
  '#dbdb8d',
  '#9edae5'
];

let vizualization = null;
let currentActiveUserId = null;

const fetchAndDraw = (userId) => {
  if (userId === currentActiveUserId) return false;

  currentActiveUserId = userId;

  fetch(getApiEndPoint(userId))
    .then(response => response.json())
    .then(json => {
      if (vizualization) {
        vizualization.update(json.items, false);
      } else {
        vizualization = new Vizualization(json.items);
      }
    });
}

const getApiEndPoint = userId => {
  return `https://api.stackexchange.com/2.2/users/${ userId }/top-answer-tags?key=U4DMV*8nvpm3EOpvf69Rxw((&site=stackoverflow&pagesize=100&filter=default`
};

const input = document.getElementById('js-input');

input.addEventListener('keyup', event => {
  const result = (event.target.value || '').match(/users\/([0-9]*)/i);

  if (!result) return false;

  const userId = parseInt(result[1], 10);

  if (userId) {
    fetchAndDraw(userId);
  }
});

const MAX_RADIUS = 70;

d3.selectAll('.js-username').on('click', function() {
  fetchAndDraw(this.getAttribute('data-user-id'));
});

fetchAndDraw(22656);

const svg = d3.select('body svg');

class Vizualization {
  constructor(rawData) {
    this.sizes = {
      width: 1100,
      height: 540,
      maxRadius: MAX_RADIUS,
      maxArea: Math.pow(MAX_RADIUS , 2) * Math.PI
    };

    this.nodes = {
      svg: svg,
      circleGroup: null,
      circles: null,
      tooltip: d3.select('.js-tooltip'),
      tagLinks: d3.selectAll('.js-tag-link')
    };

    this.scales = {
      circleAreaScale: null,
      colorScale: null,
      colorScheme: null
    };

    this.isDragged = false;
    this.gradientLegend = null;

    this.circlesUpdateTransition = d3.transition().duration(750);

    this.drawSceleton(rawData);
    this.bindEvents();

    this.moveTooltip = _throttle(this.moveTooltip, 300);
  }

  drawSceleton(rawData) {
    this.nodes.tooltip
      .style('display', 'block');

    this.scales.colorScheme = d3.scaleOrdinal(colors);

    this.simulation = d3.forceSimulation()
      .force('forceX', d3.forceX().strength(.1).x(this.sizes.width * 0.75))
      .force('forceY', d3.forceY().strength(.1).y(this.sizes.height * .55))
      .force('center', d3.forceCenter().x(this.sizes.width * 0.75).y(this.sizes.height * .55))
      .force('charge', d3.forceManyBody().strength(-25));

    this.nodes.svg
      .attr('width', this.sizes.width)
      .attr('height', this.sizes.height);

    this.nodes.groupsContainer = this.nodes.svg
      .append('g')
      .attr('class', 'nodes');

    this.update(rawData, true);
  }

  update(newData, isInitial) {
    const areaScaleDomain = d3.extent(newData, d => d.answer_score);

    this.scales.circleAreaScale = d3.scaleLinear()
      .domain(areaScaleDomain)
      .range([this.sizes.maxArea / (areaScaleDomain[1] / areaScaleDomain[0]), this.sizes.maxArea]);

    const upperValueForScale = _ceil(areaScaleDomain[1], -(areaScaleDomain[1].toString().length - 2));

    this.scales.colorScale = d3.scaleLinear()
      .domain([0, upperValueForScale / 2, upperValueForScale])
      .range(['rgb(34, 131, 187)', 'rgb(253, 255, 140)', 'rgb(216, 31, 28)']);

    if (isInitial) {
      this.gradientLegend = new GradientLegend(this.nodes.svg, {
        upperValueForScale,
        containerWidth: this.sizes.width,
        colorScale: this.scales.colorScale
      });
    } else {
      this.gradientLegend.update(upperValueForScale);
    }

    this.data = this.getProcessedData(newData);

    this.nodes.circleGroup = this.nodes.groupsContainer
      .selectAll('g.node')
      .data(this.data, d => d.tag);

    const exitGroups = this.nodes.circleGroup
      .exit();

    exitGroups
      .selectAll('text')
      .remove();

    exitGroups
      .selectAll('circle')
      .transition(this.circlesUpdateTransition)
      .attr('r', () => 0)
      .on('end', function() {
        d3.select(this.parentNode).remove();
      });

    this.nodes.circleGroup = this.nodes.circleGroup
      .enter()
      .append('g')
      .attr('class', 'node')
      .merge(this.nodes.circleGroup);

    this.bindCirclesGroupEvents(this.nodes.circleGroup);

    this.nodes.circles = this.nodes.circleGroup
      .selectAll('circle')
      .data(d => [d], d => d.tag);

    this.nodes.circles
      .transition(this.circlesUpdateTransition)
      .attr('r', d => d.radius)
      .attr('fill', d => this.getColorByScore(d));

    this.nodes.circles = this.nodes.circles
      .enter()
      .append('circle')
      .merge(this.nodes.circles);

    this.nodes.circles
      .transition(this.circlesUpdateTransition)
      .attr('r', d => d.radius)
      .attr('fill', d => this.getColorByScore(d));

    this.nodes.labels = this.nodes.circleGroup
      .selectAll('text')
      .data(d => [d], d => d.tag);

    this.nodes.labels
      .transition(this.circlesUpdateTransition)
      .style('font-size', function(d) {
        const currentFontSize = parseFloat(window.getComputedStyle(this, null).getPropertyValue('font-size'));
        const fontSize = Math.min(2 * d.radius, (2 * d.radius - 8)) / this.getComputedTextLength() * currentFontSize;

        if (fontSize < 14) {
          this.remove();
        }

        return `${ fontSize }px`;
      });

    this.nodes.labels = this.nodes.labels
      .enter()
      .append('text')
      .text(d => d.tag)
      .merge(this.nodes.labels);

    this.nodes.labels.transition(this.circlesUpdateTransition)
      .style('font-size', function(d) {
        const currentFontSize = parseFloat(window.getComputedStyle(this, null).getPropertyValue('font-size'));
        const fontSize = Math.min(2 * d.radius, (2 * d.radius - 8)) / this.getComputedTextLength() * currentFontSize;

        if (fontSize < 14) {
          this.remove();
        }

        return `${ fontSize }px`;
      })
      .attr('dy', '.35em');

    this.simulation
      .nodes(this.data)
      .force('collide', d3.forceCollide().strength(.5).radius(d => d.radius + 2.5).iterations(1));

    this.simulation.alphaTarget(.03).restart();
  }

  bindCirclesGroupEvents(selection) {
    selection
      .on('mouseenter', (d) => {
        if (!this.isDragged) {
          this.nodes.tooltip.classed('show', true)
            .text(`${ d.tag }: ${ d.score }`);
        }
      })
      .on('mouseleave', () => {
        this.nodes.tooltip.classed('show', false);
      })
      .on('mousemove', () => {
        const { pageX, pageY } = d3.event;

        this.moveTooltip(pageX, pageY);
      })
      .call(d3.drag()
        .on('start', d => this.dragstarted(d))
        .on('drag', d => this.dragged(d))
        .on('end', d => this.dragended(d))
      );
  }

  bindEvents() {
    this.simulation
      .on('tick', () => {
        this.nodes.circleGroup.attr('transform', d => `translate(${ d.x },${ d.y })`);
      });
  }

  getProcessedData(rawData) {
    return rawData
      .map(item => ({ tag: item.tag_name, score: item.answer_score }))
      .map(d => {
        d.radius = Math.sqrt(this.scales.circleAreaScale(d.score) / Math.PI);

        return d;
      });
  }

  getColorByScore(d) {
    return this.scales.colorScale(d.score);
  }

  moveTooltip(left, top) {
    this.nodes.tooltip
      .style('left', `${ left }px`)
      .style('top', `${ top }px`);
  }

  dragstarted(d) {
    this.nodes.tooltip.classed('show', false);
    this.isDragged = true;

    if (!d3.event.active) {
      this.simulation.alphaTarget(.03).restart();
    }

    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  dragended(d) {
    this.isDragged = false;

    if (!d3.event.active) {
      this.simulation.alphaTarget(.03);
    }

    d.fx = null;
    d.fy = null;
  }
}

class GradientLegend {
  constructor(node, options) {
    this.options = options;

    this.sizes = {
      width: 450
    };

    const legendScale = d3.scaleLinear()
      .domain([0, options.upperValueForScale])
      .range([0, this.sizes.width]);

    this.scales = {
      legendScale,
      colorScale: options.colorScale
    };

    this.nodes = {
      svg: node,
      root: null,
      axis: null
    };

    this.axisTransition = d3.transition().duration(750);

    this.drawLegend();
  }

  drawLegend() {
    const numStops = 10;
    const countRange = this.scales.legendScale.domain();
    countRange[2] = countRange[1] - countRange[0];
    const countPoint = [];

    for(let i = 0; i < numStops; i++) {
      countPoint.push(i * countRange[2] / (numStops - 1) + countRange[0]);
    }

    this.nodes.svg.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-traffic')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%')
      .selectAll('stop')
      .data(d3.range(10))
      .enter().append('stop')
      .attr('offset', (d,i) => this.scales.legendScale(countPoint[i]) / this.sizes.width)
      .attr('stop-color', (d,i) => this.scales.colorScale(countPoint[i]));

    this.nodes.root = this.nodes.svg.append('g')
      .attr('class', 'legendWrapper')
      .attr('transform', `translate(${ this.options.containerWidth - 50 },30)`);

    this.nodes.root.append('rect')
      .attr('class', 'legendRect')
      .attr('x', -this.sizes.width)
      .attr('y', 0)
      .attr('width', this.sizes.width)
      .attr('height', 10)
      .style('fill', 'url(#legend-traffic)');

    this.nodes.axis = this.nodes.root.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${ -this.sizes.width / 2 },10)`);

    this.update(this.options.upperValueForScale);
  }

  update(maxDomainValue) {
    const xScale = d3.scaleLinear()
      .range([-this.sizes.width / 2, this.sizes.width / 2])
      .domain([0, maxDomainValue])
      .nice();

    const xAxis = d3.axisBottom()
      .scale(xScale)
      .tickFormat(d3.format('.0f'));

    this.nodes.axis
      .transition(this.axisTransition)
      .call(xAxis)
  }
}
