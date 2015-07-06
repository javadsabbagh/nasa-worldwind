/**
 * Created by Matthew on 6/30/2015.
 */
define(['OpenStreetMapConfig'],function(OpenStreetMapConfig){

    'use strict';

    function RouteAPIWrapper(){
        this._config = new OpenStreetMapConfig();
    }
    /*
        Assembles the API call for specified points.
        @param locArray: Array containing the start point and end point of the route [start lat, start lon, end lat, end lon]
        @return: Returns API call
     */
    RouteAPIWrapper.prototype.assembleCall = function (locArray) {
        var self = this;
        console.log(locArray);

        console.log(locArray.slice(0,2).join(','))
        return self._config.OSRMAPIBody + "viaroute?" + "loc="
            + locArray.slice(0,2).join(',') + "&" + "loc="
            + locArray.slice(2,4).join(',') + '&' + 'instructions=true'
    }

    RouteAPIWrapper.prototype.assembleQuery = function() {
    }

    RouteAPIWrapper.prototype.getRouteData = function (callback,locArray) {
        var Array;
        if (!locArray){
            Array = [42.036241, -88.345090, 42.025845, -88.341743]
        } else {
            Array = locArray;
        }

        var url = this.assembleCall(Array);
        $.get(url, function(data) {
            var toSend = data;
            callback(toSend);
        });

    }

    return RouteAPIWrapper

})