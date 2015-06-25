define(['xmlToJSON'],
    function (XTJ){
        'use strict';
        function OSMDataRetriever () {

        };

        /*
         Builds the API call and returns it.

         @param boundingBoxCoords: Contains an array of points that determine the bounding box.
                                   [LEFT , BOTTOM , RIGHT , TOP]
         @return: API call URL
         */

        OSMDataRetriever.prototype.buildAPICall = function(boundingBoxCoords){
            //console.log('Retrieving data location...');
            var param = boundingBoxCoords.join(',');
            return 'http://api06.dev.openstreetmap.org/api/0.6/map?bbox=' + param;
        };

        /*
        Uses an external library to change the xml data structure to JSON data structure

        @param data: XML OSM data structure.
        @return: JSON data structure containing the same information as the xml data structure.
         */
        OSMDataRetriever.prototype.translateOSMData = function (data) {
            console.log('Translating OSM XML data to JSON...');
            return XTJ(data)
        };

        /*
        Parses JSON data into a more understandable and useable form.

        @param JSOND: JSON data structure in the form outputted from translateOSMData().
         */
        OSMDataRetriever.prototype.reduceOSMData = function (JSOND) {
            console.log('Interpreting JSON Data...')
            var reducedJSON = {
                _overHead: {
                    boundingBox: [
                        JSOND.osm['bounds']['@attributes']['minlon'],
                        JSOND.osm['bounds']['@attributes']['minlat'],
                        JSOND.osm['bounds']['@attributes']['maxlon'],
                        JSOND.osm['bounds']['@attributes']['maxlat']
                    ]
                },
                nodes: []
            };

            for (var oInfo in JSOND.osm['@attributes']) {
                reducedJSON._overHead[oInfo] = JSOND.osm['@attributes'][oInfo]
            }
            var index = 0;
            if (JSOND.osm.node) {
                JSOND.osm.node.forEach(function (node) {
                    reducedJSON.nodes[index] = {
                        _overHead: {
                            timestamp: node['@attributes'].timestamp
                        },
                        location: {
                            lat: node['@attributes'].lat,
                            lon: node['@attributes'].lon
                        },
                        info: {}
                    };
                    node.tag.forEach(function (tag) {
                        reducedJSON.nodes[index].info[tag['@attributes'].k] = tag['@attributes'].v
                    });
                    index++;
                });
                return reducedJSON;
            } else {
                console.log('No nodes in bounding box.')
            }
        };

        /*
        Requests OSM data and executes a callback function when data is retrieved.

        @param boundingBoxCoords: Contains an array of points that determine the bounding box.
                                  [LEFT , BOTTOM , RIGHT , TOP]
        @param callback: Function to be executed when data is retrieved.
         */
        OSMDataRetriever.prototype.requestOSMData = function(boundingBoxCoords, callback){
            console.log('Fetching OSM Data...');
            var self = this;
            var url = this.buildAPICall(boundingBoxCoords);
            $.get(url, function(data) {
                console.log('OSM Data Fetched!');
                console.log(self.translateOSMData(data));
                var rData = self.reduceOSMData(self.translateOSMData(data));
                console.log('Data Converted to JSON!');
                console.log(rData);
                callback(rData);
            });
        };

        return OSMDataRetriever;
    });