// https://github.com/abourget/moo
// http://bl.ocks.org/mbostock/3884914

angular.module('wavefrontweb', [])
    .controller('WavefrontWebController', function($scope, $socketio) {
        console.log('WavefrontWebController Initialized');
/*
        $scope.redraw_sleep = 10000;
        $scope.init = function(cfg) {
            if(typeof cfg.redraw_sleep != 'undefined') {
                $scope.redraw_sleep = cfg.redraw_sleep;
            }
        };
*/
/*
        $scope.wfdata.push({timestamp: new Date(0), max: 10, min: 0});
        $scope.wfdata.push({timestamp: new Date(1000), max: 0, min: -10});
        $scope.wfdata.push({timestamp: new Date(2000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(3000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(4000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(5000), max: 10, min: -10});
*/
    })

    .factory("$socketio", function($rootScope) {
        var socket = io.connect('/wavefront');
        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                })
            }
        };
    })

    .directive('wfChart', function($compile, $interpolate, $socketio) {
        return {
            restrict: "EA",
            scope: true,
            link: function($scope, $element, $attr) {
                // https://github.com/mbostock/d3/blob/master/src/time/scale.js
                var time_scaleLocalFormats = [
                    [d3.time.format.utc("%Y"), function(d) { return true; }],
                    [d3.time.format.utc("%B"), function(d) { return d.getUTCMonth(); }],
                    [d3.time.format.utc("%b %d"), function(d) { return d.getUTCDate() != 1; }],
                    [d3.time.format.utc("%a %d"), function(d) { return d.getUTCDay() && d.getUTCDate() != 1; }],
                    [d3.time.format.utc("%H:%M"), function(d) { return d.getUTCHours(); }],
                    [d3.time.format.utc("%H:%M"), function(d) { return d.getUTCMinutes(); }],
                    [d3.time.format.utc(":%S"), function(d) { return d.getUTCSeconds(); }],
                    [d3.time.format.utc(".%L"), function(d) { return d.getUTCMilliseconds(); }]
                ];

                function d3_time_scaleFormat(formats) {
                  return function(date) {
                    var i = formats.length - 1, f = formats[i];
                    while (!f[1](date)) f = formats[--i];
                    return f[0](date);
                  };
                }

                var twin = parseFloat($attr.twin);
                var tbin = parseFloat($attr.tbin);
                var data = [];

                var _hash = function() {
                    return [$attr.srcname, String(twin), String(tbin)].join('_');
                };

                console.log(["Linking wfChart", _hash()].join(', '))

                var 
                    margin = {top: 16, right: 5, bottom: 3, left: 50},
                    width = parseInt($attr.width - margin.left - margin.right),
                    height = parseInt($attr.height - margin.top - margin.bottom);

                var x = d3.time.scale.utc()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var area = d3.svg.area()
                    .x(function(d) { return x(d.timestamp); })
                    .y0(function(d) { return y(d.min); })
                    .y1(function(d) { return y(d.max); });
                    
                var line = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) { return x(d.timestamp); })
                    .y(function(d) { return y(d.mean); });

                var svg = d3.select($element[0]).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom);

                svg.append("defs")
                    .append("clipPath")
                            .attr("id", "clip")
                        .append("rect")
                            .attr("width", width)
                            .attr("height", height);

                svg.append('rect')
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("class", "background");

                function zoomed() {
                    svg.select("path.area").attr("d", area);
                    svg.select("path.line").attr("d", line);
                    svg.select(".x.axis").call(xAxis);
                    svg.select(".y.axis").call(yAxis);
                }                    

                var zoom = d3.behavior.zoom()
                // how to limit range
                /*    .scaleExtent([-2, 0]) */
                    .on("zoom", zoomed);

                var svg = svg.append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                    .call(zoom);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("top")
                    .tickSize(height)
                    .tickFormat(d3_time_scaleFormat(time_scaleLocalFormats));

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .tickSize(-width);

                var areaNode = svg
                    .append('g')
                            .attr("clip-path", "url(#clip)")
                        .append("path")
                            .datum(data)
                            .attr("class", "area");

                var lineNode = svg
                    .append('g')
                            .attr("clip-path", "url(#clip)")
                        .append("path")
                            .datum(data)
                            .attr("class", "line");

                var xAxisNode = svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + (height)  + ")")
                    .call(xAxis);

                var yAxisNode = svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis);

                var before = new Date();
                var interval_sleep = tbin * 1000 * 1.1;
                var new_data = true;

                function on_interval() {
                    // move this back to ng controller?
                    // that has a negative performance impact due to the mass update
                    console.log("Interval fired");

                    var transdur = 0;
                    
                    // call in interval loop
                    var x_extent = d3.extent(data, function(d) { return d.timestamp; })
                    // x.domain(x_extent);
                    // change to now-twin, now
                    var now = new Date()
                    var tshift = new Date(x_extent[0].getTime() - (now.getTime() - before.getTime()) * 0.8);
                    before = now;
                    var tr =  x(tshift);
                    x.domain([now-twin*1000,now]);
                    // console.log("Tr: " + tr);
                    lineNode.transition()
                        .duration(transdur)
                        .ease("linear")
                        .attr("transform", "translate(" + tr + ")");
                    areaNode.transition()
                        .duration(transdur)
                        .ease("linear")
                        .attr("transform", "translate(" + tr + ")");
                    xAxisNode.transition()
                        .duration(transdur)
                        .ease('linear')
                        .call(xAxis);

                    yAxisNode.transition()
                        .duration(transdur)
                        .ease('linear')
                        .call(yAxis);

                }

                var interval_loop;

                function on_new_data() {
                    // make it so this doesn't actually draw anything
                    // orly?
                    new_data = true;

                    // console.log("Redraw watch fired");
                    // cancel and restart interval every time
                    // if interval loop is not undefined
                    // cancel interval
                    // set interval
                    if (interval_loop != undefined) clearInterval(interval_loop);

//                    var x_extent = d3.extent(data, function(d) { return d.timestamp; })
                    var now = new Date()

                    x.domain([now-twin*1000,now]);

                    // call on new data
                    y.domain([d3.min(data, function(d) { return d.min; }),
                              d3.max(data, function(d) { return d.max; })]);

                    // when to call these?
                    zoom.x(x);
                    //y.nice();
                    yAxis.tickValues(y.ticks(3));

                    // call on new data
                    // do we need to retranslate x? and maybe the scale too? to get everythign realigned?
                    areaNode.attr("d", area).attr("transform", null);
                    lineNode.attr("d", line).attr("transform", null);

                    xAxisNode
                        .call(xAxis);

                    yAxisNode
                        .call(yAxis);

                    interval_loop = setInterval(on_interval, interval_sleep);
                    // if you're animating you want to call this
//                    on_interval();
                 }

                function on_update(pkt) {
                    if (pkt == undefined) {
                        console.error("pkt undefined");
                        return;
                    }
                    console.log("Update " + _hash() + " len " + String(pkt.update.length), String(Date(pkt.update[0].timestamp * 1000)))
                    for (binidx in pkt.update) {
                        var bin = pkt.update[binidx]
                        /* console.log("Update: " + JSON.stringify([_hash(), bin])); */
                        var bin1 = {
                            timestamp: new Date((bin.timestamp) * 1000),
                            max: bin.max,
                            min: bin.min,
                            mean: bin.mean,
                            nsamples: bin.nsamples
                        };
                        var bin2 = {
                            timestamp: new Date((bin.timestamp + tbin) * 1000),
                            max: bin.max,
                            min: bin.min,
                            mean: bin.mean,
                            nsamples: bin.nsamples
                        };
                        data.push(bin1);
                        data.push(bin2);
                        var bincnt = Math.floor(twin / tbin);
                        if (data.length > bincnt * 2) {
                            data.splice(0,2)
                        }
                    }
                    on_new_data();
                }

                $socketio.on('update_' + _hash(), on_update);

                $socketio.on('error_' + _hash(), function(ename, emsg) {
                    console.log(ename + ": " + emsg);
                });

                $socketio.emit('subscribe', [$attr.srcname, twin, tbin, _hash()]);
            }
        }
    })
;
