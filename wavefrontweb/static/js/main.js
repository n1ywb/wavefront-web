angular.module('wavefrontweb', [])
    .controller('WavefrontWebController', function($scope, $socketio) {
        console.log('WavefrontWebController Initialized');
        // $socketio.on('evnam', function(data) { ... } );
        // $socketio.emit('evname', data);
        $socketio.on('update', function(data) {
            console.log("Update: " + data.update);
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
;
