define(['xmlToJSON'],
    function (XTJ){
        'use strict';
        function OSMDataRetriever () {

        };

        OSMDataRetriever.prototype.buildAPICall = function(boundingBoxCoords){
            //console.log('Retrieving data location...');
            var param = boundingBoxCoords.join(',');
            return 'http://api06.dev.openstreetmap.org/api/0.6/map?bbox=' + param;
        };

        OSMDataRetriever.prototype.translateOSMData = function (data) {
            console.log('Translating OSM XML data to JSON...');
            return XTJ(data)
        };

        OSMDataRetriever.prototype.requestOSMData = function(boundingBoxCoords, callback){
            console.log('Fetching OSM Data...');
            var self = this
            var url = this.buildAPICall(boundingBoxCoords);
            $.get(url, function(data) {
                console.log('OSM Data Fetched!')
                console.log(data);
                var JSONData = self.translateOSMData(data);
                console.log('Data Converted to JSON!')
                console.log(JSONData);
                callback(JSONData);
            });
        };

        return OSMDataRetriever;
    });