define(['xmlToJSON'],
    function (XTJ){
        'use strict';
        function OSMDataRetriever () {

        };

        OSMDataRetriever.prototype.buildAPICall = function(){
            console.log('Retrieving data location...');
            return 'http://api06.dev.openstreetmap.org/api/0.6/map?bbox=-88.4,42.02,-88.25,42.09';
        };

        OSMDataRetriever.prototype.translateOSMData = function (data) {
            console.log('Translating OSM XML data to JSON...');
            return XTJ(data)
        };

        OSMDataRetriever.prototype.requestOSMData = function(callback){
            console.log('Fetching OSM Data...');
            var self = this
            var url = this.buildAPICall();
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