/*
    Authors: Matt Evers, Inzamam Rahaman
 */

define(function() {

    var baseURL = 'http://data.osmbuildings.org/0.2/anonymous';
    var cachedURLData = {
        keys: {},
        URL: [],
        maxCacheSize: 100
    };
    var cachedBuildingData = {
        //keys contains building IDs as Keys and its index in buildings as entries.
        keys: {},
        buildings: [],
        maxCacheSize: 100
    };

    /*
    *
    * Takes a bounding box of the form [lat, long, lat, long] and bounds the side lengths
    *
    * @param BBox: see above
    * @param maxSideLength: The max difference between lat-lat or long-long
    *
    * @return: an array bounded by above
     */
    function boundBoundingBox (BBox, maxSideLength) {
        var latAve = Math.abs(BBox[0]-BBox[2])/2;
        var longAve = Math.abs(BBox[1]-BBox[3])/2;
        if (Math.abs(BBox[0]-BBox[2]) > maxSideLength) {
            if (BBox[2] > BBox[0]) {
                BBox[2] = latAve + maxSideLength/2;
                BBox[0] = latAve - maxSideLength/2;
            }
            else
            {
                BBox[2] = latAve - maxSideLength/2;
                BBox[0] = latAve + maxSideLength/2;
            }
        }

        if (Math.abs(BBox[1]-BBox[3]) > maxSideLength) {
            if (BBox[1] > BBox[3]) {
                BBox[3] = longAve + maxSideLength/2;
                BBox[1] = longAve - maxSideLength/2;
            }
            else
            {
                BBox[3] = longAve - maxSideLength/2;
                BBox[1] = longAve + maxSideLength/2;
            }
        }
        return BBox
    }

    function OSMBuildingDataRetriever() {
        //this.applyKey();
    };

    OSMBuildingDataRetriever.prototype.applyKey = function (options) {
        options = options || {};
        baseURL += (options.key || 'anonymous');
    };

    OSMBuildingDataRetriever.prototype.buildBBoxAPICall = function (bbox) {
        console.log('Building API call for building data in a BBox...')
        bbox.forEach(function (entry, index) {
            bbox[index] = entry.toFixed(5)
        });
        return baseURL + '/bbox.json?bbox=' + bbox.join(',');
    };

    OSMBuildingDataRetriever.prototype.buildGetFeatureAPICall = function (idOfFeature) {
        //console.log('Building API call to get feature JSON of ' + idOfFeature);
        return baseURL + '/feature/' + idOfFeature + '.json';
    };

    //OSMBuildingDataRetriever.prototype.restrictBuildingCache = function () {
    //    while (cachedBuildingData.buildings.length + 1 > cachedBuildingData.maxCacheSize) {
    //        var item = cachedBuildingData.buildings.shift();
    //        console.log(item.id + ' removed.')
    //        delete cachedBuildingData.keys[item.id];
    //
    //    }
    //    cachedBuildingData.buildings.forEach(function (building, index) {
    //        console.log(building)
    //        cachedBuildingData.keys[building.id] = index;
    //    });
    //};

    //OSMBuildingDataRetriever.prototype.updateBuildingCacheFromData = function (data, callback) {
    //    var self = this;
    //    //console.log(data)
    //    console.log('Caching data...');
    //    if (data.features) {
    //        data.features.forEach(function (building, index) {
    //            if (!cachedBuildingData['keys'][building.id]) {
    //                //console.log(building.id + ' is a new building.')
    //
    //                //console.log('Fetching building '+ building.id + '.' )
    //                $.get(self.buildGetFeatureAPICall(building.id), function (info) {
    //                    if (building['properties']) {
    //                        building['properties'].tags = info.features[0].properties.tags
    //                    } else {
    //                        building['properties'] = {
    //                            tags: info.features[0].properties.tags
    //                        }
    //                    }
    //                    //console.log('Building '+ building.id + ' fetched.' )
    //                    cachedBuildingData['keys'][building.id] = cachedBuildingData.buildings.length;
    //                    cachedBuildingData.buildings.push(building);
    //
    //                    if (index === data.features.length - 1) {
    //                        self.restrictBuildingCache();
    //                        console.log('Data Cached!');
    //                        callback(cachedBuildingData)
    //                    }
    //                });
    //
    //            } else {
    //                //console.log('We already know about this building.')
    //                if (index === data.features.length - 1) {
    //                    self.restrictBuildingCache();
    //                    console.log('Data Cached!')
    //                    callback(cachedBuildingData)
    //                }
    //            }
    //
    //        });
    //    };
    //};

    OSMBuildingDataRetriever.prototype.callAPI = function (url, callback) {
        var self = this;
        console.log(url)
        $.get(url, function(returnedData){
            console.log(returnedData)
        });
        //if (cachedURLData.keys[url]){
        //    self.updateBuildingCacheFromData(cachedURLData.URL[cachedURLData.keys[url]],callback)
        //} else {
        //    $.get(url, function(returnedData){
        //        cachedURLData.keys[url] = cachedURLData.URL.length;
        //        cachedURLData.URL.push(returnedData);
        //        self.updateBuildingCacheFromData(returnedData,callback);
        //    });
        //}
    };

    // Bounding Box should be [Low Lat, high long, high lat, low long]
    OSMBuildingDataRetriever.prototype.requestOSMBuildingData = function (boundingBoxCoords, callback) {
        console.log('Fetching OSM Building Data...');
        var self = this;
        // = [39.00050,-76.89950,37.99950,-76.90050];
        boundingBoxCoords = ([37.38258, -122.08888999999999, 37.39758, -122.07389]);

        boundingBoxCoords = self.fixBoundingBoxForOSMB(boundingBoxCoords)

        var url = this.buildBBoxAPICall(boundingBoxCoords);
        self.callAPI(url, callback);
    };

    /*
    * Takes a bounding box of the form [low lat, low long, high lat, high long] and returns a corrosponding array of
    *   the form [high lat, high long, low lat, low long]
    *
    * @param boundingBoxCoords: bounding box of the form [low lat, low long, high lat, high long]
    *
    * @return: a corrosponding array of the form [high lat, high long, low lat, low long]
    */
    OSMBuildingDataRetriever.prototype.fixBoundingBoxForOSMB = function (boundingBoxCoords) {
        return [boundingBoxCoords[2],boundingBoxCoords[3],boundingBoxCoords[0],boundingBoxCoords[1]]
    };

    return OSMBuildingDataRetriever;
});