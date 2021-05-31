$(function() {
	var capitalize = function(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	};

	var updateMap = function(mobility) {
		d3.selectAll('#eu-map path')
			.transition().duration(200)
			.attr('data-mobility', mobility)
			.style('fill', function(d) {
				var country = d.properties.NAME;
				var fillColor = '#f5f5f5';
				for (var i = 0; i < correlationByCountry.length; i++) {
					if (correlationByCountry[i].country === country) {
						var rho = correlationByCountry[i][mobility];
						fillColor = correlationColorScale(rho);
					}
				}
				return fillColor;
			});
		$('.map-title').remove();
		d3.selectAll('#eu-map svg')
			.append('text')
				.attr('x', 20)
				.attr('y', 20)
				.attr('class', 'map-title')
				.text(capitalize(mobility.replace(/_/g, ' ')));
	};

	var updateScatterPlot = function(rangeValue) {
		$('.scatter-line').remove();
		$('.scatter-point').remove();
		$('.point-annotation').hide();
		for (var i = 0; i < rangeValue; i++) {
			if (i > 0) {
				scatterSvg.append('line')
					.attr('class', 'scatter-line')
					.attr('x1', scatterX(scatterPlotData[i - 1].retail_and_recreation))
					.attr('x2', scatterX(scatterPlotData[i].retail_and_recreation))
					.attr('y1', scatterY(scatterPlotData[i - 1].value))
					.attr('y2', scatterY(scatterPlotData[i].value));
			}
			scatterSvg.append('circle')
				.attr('cx', scatterX(scatterPlotData[i].retail_and_recreation))
				.attr('cy', scatterY(scatterPlotData[i].value))
				.attr('r', 4)
				.attr('class', 'scatter-point')
				.attr('fill', color(i));
			if (i > 0) {
				// Redraw the previous point so that it is on top of the connecting line.
				scatterSvg.append('circle')
					.attr('cx', scatterX(scatterPlotData[i - 1].retail_and_recreation))
					.attr('cy', scatterY(scatterPlotData[i - 1].value))
					.attr('r', 4)
					.attr('class', 'scatter-point')
					.attr('fill', color(i));
			}
			$('.index-' + i).show();
		}
	};

	$('input[type=range]').on('input', function() {
		var rangeValue = parseInt($(this).val());
		updateScatterPlot(rangeValue);
	});

	var intervalId;
	$('.play-button').on('click', function() {
		var range = $(this).parent().find('input[type=range]');
		var maxValue = parseInt(range.attr('max'));
		if ($(this).hasClass('playing')) {
			clearInterval(intervalId);
			$(this).removeClass('playing');
		} else {
			intervalId = setInterval(function() {
				var rangeValue = parseInt(range.val());
				var newValue = rangeValue < maxValue ? rangeValue + 1 : 0;
				range.val(newValue).trigger('input');
			}, 200);
			$(this).addClass('playing');
		}
	});

	d3.csv('correlation.csv', function(error, data) {
		if (error) throw error;

		//console.log(data);

		var barHeight = 8;
		var margin = {
			top: 10,
			right: 20,
			bottom: 60,
			left: 20
		};
		var width = $('main').width() - margin.left - margin.right;
		var height = 160;
		var svg = d3.select('#correlation').append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
		var x = d3.scale.linear()
			.domain([-0.5, 0.5])
			.range([0, width]);
		var y = d3.scale.ordinal()
			.rangeRoundBands([0, height], 0.2)
			.domain(data.map(function (d) { return d.mobility; }));
		xSecondaryLines = [-0.5, -0.4, -0.3, -0.2, -0.1, 0.1, 0.2, 0.3, 0.4, 0.5];
		for (i = 0; i < xSecondaryLines.length; i++) {
			svg.append('line')
				.attr('x1', x(xSecondaryLines[i]))
				.attr('x2', x(xSecondaryLines[i]))
				.attr('y1', 0)
				.attr('y2', height)
				.attr('class', 'barplot-line');
		}
		svg.selectAll('bar')
			.data(data)
			.enter()
			.append('rect')
				.attr('x', function(d) { return +d.rho < 0 ? x(+d.rho) : x(0); })
				.attr('y', function(d) { return y(d.mobility); })
				.attr('width', function(d) { return +d.rho < 0 ? x(+d.rho * -1) - x(0) : x(+d.rho) - x(0); })
				.attr('height', barHeight)
				.attr('class', 'barplot-bar')
				.attr('fill', function(d) {
					return correlationColorScale(d.rho);
				})
				.on('click', function(d) {
					updateMap(d.mobility);
				});
		svg.selectAll('bar')
			.data(data)
			.enter()
			.append('text')
				.attr('x', function(d) { return +d.rho < 0 ? x(0.01) : x(-0.01); })
				.attr('y', function(d) { return y(d.mobility) + 9; })
				.attr('class', 'barplot-name')
				.attr('text-anchor', function(d) { return +d.rho < 0 ? 'start' : 'end'; })
				.text(function(d) {
					mobName = d.mobility.replace(/_/g, ' ');
					mobName = capitalize(mobName);
					return mobName;
				});
		svg.append('line')
			.attr('x1', x(0))
			.attr('x2', x(0))
			.attr('y1', 0)
			.attr('y2', height)
			.attr('class', 'barplot-line-main');
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient('bottom');
		svg.append('g')
			.attr('class', 'axis')
			.attr('transform', 'translate(0,' + height + ')')
			.call(xAxis);
		svg.append('text')
			.attr('x', x(0))
			.attr('y', height + 40)
			.style('text-anchor', 'middle')
			.attr('class', 'axis-label')
			.text('Correlation with number of hospitalisations');
	});

	var svgArrow =  d3.select('#eu-map-arrow').append('svg')
		.attr('width', 60)
		.attr('height', 60);
	svgArrow.append('path')
		.attr('d', 'M 5 5 C 5 30, 30 55, 55 55')
		.attr('class', 'linking-arrow');
	svgArrow.append('path')
		.attr('d', 'M 50,50 55,55 50,60')
		.attr('class', 'linking-arrow');

	d3.json('europe.topojson', function(error, eu) {
		if (error) throw error;
		
		var margin = {
			top: 50,
			right: 80,
			bottom: 10,
			left: 20
		};
		//var width = 400;
		var width = $('main').width() / 2 - margin.left - margin.right;
		var height = width;
		var featureCollection = topojson.feature(eu, eu.objects.europe);
		var svg = d3.select('#eu-map').append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
		var projection = d3.geo.mercator()
			.scale(1700)
			.center([8, 56])
			.translate([width / 2, height / 2])
			.precision(0.1);
		var path = d3.geo.path().projection(projection);
		svg.append('g')
			.attr('class', 'countries')
			.selectAll('path')
			.data(featureCollection.features)
			.enter()
			.append('path')
			.attr('d', path)
			.attr('class', 'eu-country')
			.attr('data-country', function(d) {
				return d.properties.NAME;
			})
			.attr('data-mobility', 'retail_and_recreation')
			.on('mouseover', function(d) {
				var country = d.properties.NAME;
				var mobility = d3.select(this).attr('data-mobility');
				var countryRho;
				for (var i = 0; i < correlationByCountry.length; i++) {
					if (correlationByCountry[i].country === country) {
						countryRho = correlationByCountry[i][mobility];
						countryRho = parseFloat(countryRho).toFixed(2);
					}
				}
				var coord = d3.mouse(this);
				svg.append('text')
					.attr('x', coord[0] + 6)
					.attr('y', coord[1] - 10)
					.attr('alignment-baseline', 'hanging')
					.attr('class', 'country-annotation-name')
					.text(countryRho ? country + '(' + countryRho + ')' : country);
			})
			.on('mouseout', function(d) {
				$('.country-annotation-name').remove();
			});

		// Create the gradient that will be used for the figure legends.
		var definitions = svg.append('defs');
		var gradient = definitions.append('linearGradient')
			.attr('id', 'svgGradient')
			.attr('x1', '0%')
			.attr('y1', '0%')
			.attr('x2', '0%')
			.attr('y2', '100%');
		gradient.append('stop')
			.attr('class', 'start')
			.attr('offset', '0%')
			.attr('stop-color', '#008080')
			.attr('stop-opacity', 1);
		gradient.append('stop')
			.attr('class', 'start')
			.attr('offset', '50%')
			.attr('stop-color', '#f6edbd')
			.attr('stop-opacity', 1);
		gradient.append('stop')
			.attr('class', 'end')
			.attr('offset', '100%')
			.attr('stop-color', '#ca562c')
			.attr('stop-opacity', 1);

		svg.append('rect')
			.attr('class', 'legend')
			.attr('x', 0)
			.attr('y', 5)
			.attr('width', 10)
			.attr('height', 100);
		svg.append('text')
			.attr('class', 'legend-text')
			.attr('x', 15)
			.attr('y', 5)
			.text('-1');
		svg.append('text')
			.attr('class', 'legend-text')
			.attr('x', 15)
			.attr('y', 55)
			.text('0');
		svg.append('text')
			.attr('class', 'legend-text')
			.attr('x', 15)
			.attr('y', 105)
			.text('+1');
		svg.append('text')
			.attr('class', 'legend-text')
			.attr('x', 0)
			.attr('y', -15)
			.text('Correlation with number of hospitalisations');
		updateMap('retail_and_recreation');
	});

	var scatterPlotData;
	var color;
	var scatterSvg;
	var scatterX, scatterY;
	d3.csv('retail-hospitalisations.csv', function(error, data) {
		if (error) throw(error);

		//console.log(data);
		scatterPlotData = data;

		var i, v;
		var width = $('main').width();
		//var maxDim = $(window).height() * 0.8;
		//width = width > maxDim ? maxDim : width;
		//var height = width;
		var height = $(window).height() * 0.7;
		var margin = {
			top: 40,
			right: 40,
			bottom: 60,
			left: 60
		};
		
		var xDomainMin = parseFloat(data[0].retail_and_recreation),
			xDomainMax = parseFloat(data[0].retail_and_recreation),
			yDomainMin = parseFloat(data[0].value),
			yDomainMax = parseFloat(data[0].value);
		for (i = 0; i < data.length; i++) {
			var mobValue = parseFloat(data[i].retail_and_recreation);
			xDomainMin = mobValue < xDomainMin ? mobValue : xDomainMin;
			xDomainMax = mobValue > xDomainMax ? mobValue : xDomainMax;
			var hospValue = parseFloat(data[i].value);
			yDomainMin = hospValue < yDomainMin ? hospValue : yDomainMin;
			yDomainMax = hospValue > yDomainMax ? hospValue : yDomainMax;
		}

		scatterSvg = d3.select('#connected-scatter').append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
		scatterX = d3.scale.linear()
			.domain([xDomainMin, xDomainMax])
			.range([0, width])
			.nice();
		scatterY = d3.scale.linear()
			.domain([yDomainMin, yDomainMax])
			.range([height, 0])
			.nice();
		var	valueline = d3.svg.line()
			.x(function(d) { return scatterX(d.retail_and_recreation); })
			.y(function(d) { return scatterY(d.value); });
		color = d3.scale.linear()
			.domain([0, data.length])
			.range(['#ffc6c4', '#672044']);
		var xAxis = d3.svg.axis()
			.scale(scatterX)
			.orient('bottom');
		scatterSvg.append('g')
			.attr('class', 'axis')
			.attr('transform', 'translate(0,' + height + ')')
			.call(xAxis);
		var yAxis = d3.svg.axis()
			.scale(scatterY)
			.orient('left');
		scatterSvg.append('g')
			.attr('class', 'axis')
			.call(yAxis);
		scatterSvg.append('path')
			.attr('class', 'scatter-line')
			.attr('d', valueline(data));
		scatterSvg.selectAll('point')
			.data(data)
			.enter()
			.append('circle')
				.attr('cx', function(d) { return scatterX(d.retail_and_recreation); })
				.attr('cy', function(d) { return scatterY(d.value); })
				.attr('r', 4)
				.attr('class', 'scatter-point')
				.attr('fill', function(d, i) { return color(i); });
		scatterSvg.append('text')
			.attr('x', width / 2)
			.attr('y', height + 40)
			.style('text-anchor', 'middle')
			.attr('class', 'axis-label')
			.text('Weekly change in retail and entertainment mobility');
		scatterSvg.append('text')
			.attr('x', -50)
			.attr('y', height / 2)
			.style('text-anchor', 'middle')
			.attr('class', 'axis-label')
			.attr('transform', 'rotate(-90, -50, ' + height / 2 + ')')
			.text('Number of hospitalisations per week');
		
		// Plot annotation
		scatterSvg.append('line')
			.attr('x1', scatterX(-68))
			.attr('x2', scatterX(-64))
			.attr('y1', scatterY(4800))
			.attr('y2', scatterY(4800))
			.attr('class', 'arrow');
		scatterSvg.append('path')
			.attr('d', 'M ' + scatterX(-64.5) + ',' + scatterY(4850) + ' ' + scatterX(-64) + ',' + scatterY(4800) + ' ' + scatterX(-64.5) + ',' + scatterY(4750))
			.attr('class', 'arrow');
		scatterSvg.append('text')
			.attr('x', scatterX(-68))
			.attr('y', scatterY(4600))
			.attr('class', 'plot-annotation')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('Movement to the left indicates an increase in the number');
		scatterSvg.append('text')
			.attr('x', scatterX(-68))
			.attr('y', scatterY(4450))
			.attr('class', 'plot-annotation')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('of people at shops, restaurants, cafes...');
		scatterSvg.append('line')
			.attr('x1', scatterX(-68))
			.attr('x2', scatterX(-68))
			.attr('y1', scatterY(250))
			.attr('y2', scatterY(550))
			.attr('class', 'arrow');
		scatterSvg.append('path')
			.attr('d', 'M ' + scatterX(-68.5) + ',' + scatterY(500) + ' ' + scatterX(-68) + ',' + scatterY(550) + ' ' + scatterX(-67.5) + ',' + scatterY(500))
			.attr('class', 'arrow');
		scatterSvg.append('text')
			.attr('x', scatterX(-67))
			.attr('y', scatterY(400))
			.attr('class', 'plot-annotation')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('Upward movement indicates an increase in hospitalisations');

		scatterSvg.append('text')
			.attr('x', scatterX(-65))
			.attr('y', scatterY(3000))
			.attr('class', 'point-annotation index-7')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('Turning point of the first wave');
		scatterSvg.append('text')
			.attr('x', scatterX(0))
			.attr('y', scatterY(500))
			.attr('class', 'point-annotation index-24')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('Low numbers in the');
		scatterSvg.append('text')
			.attr('x', scatterX(0))
			.attr('y', scatterY(350))
			.attr('class', 'point-annotation index-24')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('summer of 2020');
		scatterSvg.append('text')
			.attr('x', scatterX(-22))
			.attr('y', scatterY(2000))
			.attr('class', 'point-annotation index-36')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('Second wave picking up steam');
		scatterSvg.append('text')
			.attr('x', scatterX(-45))
			.attr('y', scatterY(2650))
			.attr('class', 'point-annotation index-54')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('Start of the third wave, before');
		scatterSvg.append('text')
			.attr('x', scatterX(-45))
			.attr('y', scatterY(2500))
			.attr('class', 'point-annotation index-54')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('hospitalisations recovered');
		scatterSvg.append('text')
			.attr('x', scatterX(-13))
			.attr('y', scatterY(2600))
			.attr('class', 'point-annotation index-65')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('Fewer hospitalisations as more and more');
		scatterSvg.append('text')
			.attr('x', scatterX(-13))
			.attr('y', scatterY(2450))
			.attr('class', 'point-annotation index-65')
			.style('text-anchor', 'start')
			.style('alignment-baseline', 'middle')
			.text('people are vaccinated');

		// Legend
		// Create the gradient that will be used for the figure legends.
		var definitions = scatterSvg.append('defs');
		var gradient = definitions.append('linearGradient')
			.attr('id', 'svgGradientWeeks')
			.attr('x1', '0%')
			.attr('y1', '0%')
			.attr('x2', '0%')
			.attr('y2', '100%');
		gradient.append('stop')
			.attr('class', 'start')
			.attr('offset', '0%')
			.attr('stop-color', '#672044')
			.attr('stop-opacity', 1);
		gradient.append('stop')
			.attr('class', 'end')
			.attr('offset', '100%')
			.attr('stop-color', '#ffc6c4')
			.attr('stop-opacity', 1);

		scatterSvg.append('rect')
			.attr('class', 'legend-scatter')
			.attr('x', scatterX(0))
			.attr('y', scatterY(4500))
			.attr('width', 10)
			.attr('height', 100);
		scatterSvg.append('text')
			.attr('class', 'legend-text')
			.attr('x', scatterX(1.5))
			.attr('y', scatterY(4500))
			.text('2021 - week 19');
		scatterSvg.append('text')
			.attr('class', 'legend-text')
			.attr('x', scatterX(1.5))
			.attr('y', scatterY(4500) + 100)
			.text('2020 - week 7');
	});

	var correlationByCountry;
	var correlationColorScale = d3.scale.linear()
			.domain([-1, 0, 1])
			.range(['#008080', '#f6edbd', '#ca562c']);
	d3.csv('correlation-by-country.csv', function(error, data) {
		if (error) throw error;

		correlationByCountry = data;
	});
});
