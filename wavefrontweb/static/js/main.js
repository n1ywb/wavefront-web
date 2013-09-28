//https://github.com/abourget/moo
// http://bl.ocks.org/mbostock/3884914

angular.module('wavefrontweb', [])
    .controller('WavefrontWebController', function($scope, $socketio) {
        console.log('WavefrontWebController Initialized');
        $scope.redraw_sleep = 10000;
        $scope.init = function(cfg) {
            if(typeof cfg.redraw_sleep != 'undefined') {
                $scope.redraw_sleep = cfg.redraw_sleep;
            }
        };
        // $socketio.on('evnam', function(data) { ... } );
        // $socketio.emit('evname', data);
/*        $scope.wfdata = []; */
        /*
        $scope.wfdata.push({timestamp: new Date(0), max: 10, min: 0});
        $scope.wfdata.push({timestamp: new Date(1000), max: 0, min: -10});
        $scope.wfdata.push({timestamp: new Date(2000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(3000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(4000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(5000), max: 10, min: -10});
        */
/*        $socketio.on('update', function(data) {
            for (binidx in data.update) {
                bin = data.update[binidx]
                console.log("Update: " + JSON.stringify(bin));
                timestamp = new Date(bin.timestamp * 1000);
                bin.timestamp = timestamp
                $scope.wfdata.push(bin);
            }
        });
        $socketio.emit('subscribe', ['TA_058A_BHN', 3600.0, 10.0]);
 */   
    $scope.redraw = 0;
    $scope.request_redraw = [0];

    var redraw = function() {
        $scope.$apply(function() {
            if ($scope.request_redraw[0] > 0) {
                $scope.redraw += 1;
                $scope.redraw %= 2;
                $scope.request_redraw[0] = 0;
            }
        });
    };

    interval = setInterval(redraw, $scope.redraw_sleep);
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
                /* console.log(JSON.stringify($attr)); */
                var twin = parseFloat($attr.twin);
                var tbin = parseFloat($attr.tbin);
                $scope.data = [];

                var _hash = function() {
                    return [$attr.srcname, String(twin), String(tbin)].join('_');
                };

                console.log(["Linking wfChart", _hash()].join(', '))

                $socketio.on('error_' + _hash(), function(ename, emsg) {
                    console.log(ename + ": " + emsg);
                });

                $socketio.on('update_' + _hash(), function(data) {
                    console.log("Update " + _hash() + " len " + String(data.update.length))
                    for (binidx in data.update) {
                        bin = data.update[binidx]
                        /* console.log("Update: " + JSON.stringify([_hash(), bin])); */
                        timestamp = new Date(bin.timestamp * 1000);
                        bin = {
                            timestamp: bin.timestamp,
                            max: bin.max,
                            min: bin.min,
                            mean: bin.mean,
                            nsamples: bin.nsamples
                        };
                        $scope.data.push(bin);
                        $scope.request_redraw[0] = 1;
                    }
                });

                $socketio.emit('subscribe', [$attr.srcname, twin, tbin, _hash()]);

                var margin = {top: 20, right: 20, bottom: 30, left: 50},
                    width = parseInt($attr.width) - margin.left - margin.right,
                    height = parseInt($attr.height) - margin.top - margin.bottom;

                // var parseDate = d3.time.format("%Y%m%d").parse;

                var x = d3.time.scale()
                    //.range([0, width]);
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                $scope.$watch('redraw', function(oldLen, newLen) {
                    var data = $scope.data;
                    if (!data.length) { return; }

                    d3.select($element[0]).select('svg').remove();

                    var area = d3.svg.area()
                        .x(function(d) { return x(d.timestamp); })
                        .y0(function(d) { return y(d.min); })
                        .y1(function(d) { return y(d.max); });
                        
                    var line = d3.svg.line()
                        .x(function(d) { return x(d.timestamp); })
                        .y(function(d) { return y(d.mean); });

                    var svg = d3.select($element[0]).append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                      .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    // fix this; do we need to iterate data even?
                    // does this modify in place?
                    // data.forEach(function(d) {
                    //     d.date = parseDate(d.date);
                    //     d.low = +d.low;
                    //     d.high = +d.high;
                    // });

                    x.domain(d3.extent(data, function(d) { return d.timestamp; }));
                    y.domain([d3.min(data, function(d) { return d.min; }), 
                              d3.max(data, function(d) { return d.max; })]);

                    var height_f =  function(d) { 
                        var ydmax = y(d.max);
                        var ydmin = y(d.min);
                        var diff = ydmin - ydmax;
                        return diff;
                    };

/*
                    svg.selectAll(".bar")
                            .data(data)
                        .enter().append("rect")
                            .attr("class", "bar")
                            .attr('width', function(d) { 
                                    var r = (x(1000001000.0) - x(1000000000.0));
                                    return r;
                                    var r = width / data.length; 
                                    return r; })
                            .attr('height', height_f)
                            .attr('x', function(d) { return x(d.timestamp); })
                            .attr('y', function(d) { return y(d.max); })
                        ;
*/

// These require data to be sorted by timestamp, but that's not how it arrives,
// and we don't want to do that right now.
// area could even simulate bars by adding more points
// could use horizontal lines or some other symbol for mean instead of a
// continuous line
/**/
                    svg.append("path")
                        .datum(data)
                        .attr("class", "area")
                        .attr("d", area);

                    svg.append("path")
                        .datum(data)
                        .attr("class", "line")
                        .attr("d", line);
/**/

                    svg.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(xAxis);

                    svg.append("g")
                            .attr("class", "y axis")
                            .call(yAxis)
                        .append("text")
                            .attr("transform", "rotate(-90)")
                            .attr("y", 6)
                            .attr("dy", ".71em")
                            .style("text-anchor", "end")
                            .text("Amplitude");
                });
            }
        }
    })
;
