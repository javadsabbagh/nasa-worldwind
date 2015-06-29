define(['jquery','OpenStreetMapConfig', 'osmtogeojson'],function($, OpenStreetMapConfig, osmtogeojson) {


    'use strict';

    function OverpassAPIWrapper() {
        this._config = new OpenStreetMapConfig();
    }


    /*
        Assembles a query for the Overpass API using a boundingBox and a list of amenities
        to consider. If the amenities list is undefined, null, or false, then a query is
        constructed to get all nodes with an amenity tag.
        @param boundingBox: the bounding box to consider [lower latitude, lower longitude, upper latitude, upper longitude]
        @param amenities: the amenities to consider
        @return a Overpass query to to access nodes with amenities in a specified bounding box
     */

    OverpassAPIWrapper.prototype.assembleQuery = function(boundingBox, amenities) {
        var amenityString = '';
        if(!amenities) {
            amenityString = '["amenity"~"."]';
        }
        var queryString = "node" + amenityString;
        queryString += "(" + boundingBox.join(' , ') + ");";
        queryString += "out body;";
        return queryString;
    };


    /*
        Assembles an API to retrieve the nodes with specified amenities in a specified bounding box
        (NB: if amenities is null, false, or undefined, then we retrieve all nodes in the bounding box)
        @param boundingBox : the bounding box to consider [lower latitude, lower longitude, upper latitude, upper longitude]
        @param amenities: the amenities to consider
        @return : a url that can be used to retrieve amenities in a specified bounding box using
                  the Overpass Open Street Map API
     */
    OverpassAPIWrapper.prototype.assembleAPICall = function(boundingBox, amenities) {
        var query = this.assembleQuery(boundingBox, amenities);
        return this._config.overPassAPIBody + query;
    }

    /*
        Given a bounxing box and a callback to handle the data, uses a GET request to
        access Open Street Map data that contains amenities.
        @param boundingBox: the bounding box to consider [lower latitude, lower longitude, upper latitude, upper longitude]
        @param callback : the callback to use to handle the data retrived from the GET request
     */
    OverpassAPIWrapper.prototype.getAllAmenitiesInBox = function(boundingBox, callback) {
        var url = this.assembleAPICall(boundingBox);
        console.log(url)
        $.get(url, function(data) {
            console.log(data)
            var toSend = osmtogeojson(data);
            callback(toSend);
        });
    }

    return OverpassAPIWrapper;


});