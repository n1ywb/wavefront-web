//https://github.com/abourget/moo
// http://bl.ocks.org/mbostock/3884914

angular.module('wavefrontweb', [])
    .controller('WavefrontWebController', function($scope, $socketio) {
        console.log('WavefrontWebController Initialized');
        // $socketio.on('evnam', function(data) { ... } );
        // $socketio.emit('evname', data);
        $scope.wfdata = [];
        $socketio.on('update', function(data) {
            console.log("Update: " + data.update.toSource());
            for (bin in data.update) {
                $scope.wfdata.push(data.update[bin]);
            }
        });
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
                    $rootScope.$apply(function() {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                })
            }
        };
    })

    .directive('wfChart', function($compile, $interpolate) {
        return {
            restrict: "EA",
            scope: {
                data: "=",
            },
            link: function($scope, $element, $attr) {
                var margin = {top: 20, right: 20, bottom: 30, left: 50},
                    width = 960 - margin.left - margin.right,
                    height = 500 - margin.top - margin.bottom;

                var parseDate = d3.time.format("%Y%m%d").parse;

                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                var area = d3.svg.area()
                    .x(function(d) { return x(d.timestamp); })
                    .y0(function(d) { return y(d.min); })
                    .y1(function(d) { return y(d.max); });

                var svg = d3.select("body").append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                $scope.$watch('data.length', function(oldLen, newLen) {
                    var data = $scope.data;
                    if (!data.length) { return; }

                    // remove g
                    svg.select('g').remove();
                    svg.select('path').remove();

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

                    svg.append("path")
                        .datum(data)
                        .attr("class", "area")
                        .attr("d", area);

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
                            .text("Temperature (ºF)");
                });
            }
        }
    })
;
