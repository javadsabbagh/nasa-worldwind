define(['jquery','OpenStreetMapConfig'],function($, OpenStreetMapConfig) {


    'use strict';

    function OverpassAPIWrapper() {
        this._config = new OpenStreetMapConfig();
    }


    /*
        Assembles a query for the Overpass API using a boundingBox and a list of amenities
        to consider. If the amenities list is undefined, null, or false, then a query is
        constructed to get all nodes with an amenity tag.
        @param boundingBox: the bounding box to consider
        @param amenities: the amenities to consider
        @return a Overpass query to to access nodes with amenities in a specified bounding box
     */
    OverpassAPIWrapper.prototype.assembleQuery = function(boundingBox, amenities) {
        var amenityString = '';
        if(!amenities) {
            amenityString = '["amentities"~"."]';
        }
        var queryString = "node" + amenityString;
        queryString += "(" + boundingBox.join(' , ') + ");";
        queryString += "out body;"
        return queryString;
    }


    /*
        Assembles an API to call
     */
    OverpassAPIWrapper.prototype.assembleAPICall = function(boundingBox, amenities) {
        var query = this.assembleQuery(boundingBox, amenities);
        return this._config.apiBody + query;
    }

    OverpassAPIWrapper.prototype.getAllAmenitiesInBox = function(boundingBox, callback) {
        var url = this.assembleAPICall(boundingBox);
        $.get(url, function(data) {
            callback(data);
        });
    }


});