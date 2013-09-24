//https://github.com/abourget/moo
// http://bl.ocks.org/mbostock/3884914

angular.module('wavefrontweb', [])
    .controller('WavefrontWebController', function($scope, $socketio) {
        console.log('WavefrontWebController Initialized');
        // $socketio.on('evnam', function(data) { ... } );
        // $socketio.emit('evname', data);
        $scope.wfdata = [];
/*        $scope.wfdata.push({timestamp: new Date(0), max: 10, min: 0});
        $scope.wfdata.push({timestamp: new Date(1000), max: 0, min: -10});
        $scope.wfdata.push({timestamp: new Date(2000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(3000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(4000), max: 10, min: -10});
        $scope.wfdata.push({timestamp: new Date(5000), max: 10, min: -10});
        */
        $socketio.on('update', function(data) {
            for (binidx in data.update) {
                bin = data.update[binidx]
                console.log("Update: " + JSON.stringify(bin));
                timestamp = new Date(bin.timestamp * 1000);
                bin.timestamp = timestamp
                $scope.wfdata.push(bin);
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

                $scope.$watch('data.length', function(oldLen, newLen) {
                    var data = $scope.data;
                    if (!data.length) { return; }

                    // remove g
                    d3.select('svg').remove();

                    var svg = d3.select("body").append("svg")
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

                    svg.selectAll(".bar")
                            .data(data)
                        .enter().append("rect")
                            .attr("class", "bar")
                            .attr('width', function(d) { 
                                    r = width / data.length; 
                                    return r; })
                            .attr('height', height_f)
                            .attr('x', function(d) { return x(d.timestamp); })
                            .attr('y', function(d) { return y(d.max); })
                        ;

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
