/*
    Authors: Matt Evers, Inzamam Rahaman
 */

define(function() {

    var baseURL = 'http://data.osmbuildings.org/0.2/anonymous';

    function signOf(x) { return x ? x < 0 ? -1 : 1 : 0; }

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

        var latAve = (BBox[0]+BBox[2])/2;
        var longAve = (BBox[1]+BBox[3])/2;
        console.log(longAve)
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
            if (BBox[1] < BBox[3]) {
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

    /*
    *   This calls the API to retrieve the shape of each building in the box given.
    *   Calls the callback with data of the form
    *   {
    *   features: <Array>[
    *                     <buildingObject>{
    *                     |     geometry: {
    *                     |     |   coordinates: <array>[
    *                     |     |   |   <pointArray>[
    *                     |     |   |   |   [lat, long],
    *                     |     |   |   |   [lat, long],
    *                     |     |   |   |   etc...
    *                     |     |   |   ],
    *                     |     |   |   etc...
    *                     |     |   ]
    *                     |     |   type: 'Polygon'
    *                     |     }
    *                     |     id: integer
    *                     |     properties: <protoObject>
    *                     |     type: 'feature'
    *                     },
    *                     etc...
    *             ]
    *   }
    *
    *   @param boundingBoxCoords: BoundingBox of the form [Low Lat, high long, high lat, low long]
    *   @param callback: callback function
     */
    OSMBuildingDataRetriever.prototype.callPolygonAPI = function (boundingBoxCoords, callback) {
        var self = this;
        boundingBoxCoords = ([37.38258, -122.08888999999999, 37.39758, -122.07389]);
        //console.log(boundingBoxCoords);
        boundingBoxCoords = boundBoundingBox(boundingBoxCoords, 0.005);
        //console.log(boundingBoxCoords);
        boundingBoxCoords = self.fixBoundingBoxForOSMB(boundingBoxCoords);
        console.log('Fetching OSM Building Polygon Data...');
        var url = this.buildBBoxAPICall(boundingBoxCoords);
        $.get(url, function(returnedData){
            console.log('Building Polygon data recieved.');
            callback(returnedData)
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

    /*
    * calls the building feature API and returns data of the same type as the polygon with the exception of a
    * building type in properties.tags. i.e. object.features[n].properties.tags.building
    *
     */
    OSMBuildingDataRetriever.prototype.callFeatureInformationAPI = function (buildingNumber, callback) {
        var url = this.buildGetFeatureAPICall(buildingNumber);
        console.log('Fetching building.')
        $.get(url, function(returnedFeatureData){
            //console.log(returnedFeatureData.features[0].properties.tags.building)
            callback(returnedFeatureData)
        });
    }

    // Bounding Box should be [Low Lat, high long, high lat, low long]
    OSMBuildingDataRetriever.prototype.requestOSMBuildingData = function (boundingBoxCoords, callback) {
        var self = this;
        // = [39.00050,-76.89950,37.99950,-76.90050];

        self.callPolygonAPI(boundingBoxCoords, self.CurriedCallback(callback));

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

    /*
    *   Takes in a polygon array and calls for the feature data for each feature returned in the polygon array.
    *   Calls the callback with each feature with its tag information
    *
    *   @param polygonArray: an object of the form returned by the polygonAPI
    *   @param callback: callback function
    *
     */
    OSMBuildingDataRetriever.prototype._buildReturnDataForCallback = function (polygonArray, callback) {
        var returnArray = [];
        var self = this;
        console.log('Fetching Feature Information')
        polygonArray.features.forEach(function(feature){
            self.callFeatureInformationAPI(feature.id, function (buildingObject){
                returnArray.push(buildingObject.features[0]);
                console.log('Building ' + returnArray.length + ' of ' + polygonArray.features.length + ' fetched.')
                if (returnArray.length === polygonArray.features.length){
                    callback(returnArray)
                }
            })
        })


    };

    /*
    * Curries the callback function to the _buildReturnDataForCallback.
    *
    * @return: returns self._buildReturnDataForCallback with the callback curried to it. This function then takes
    *           a polygon array as an argument.
     */
    OSMBuildingDataRetriever.prototype.CurriedCallback = function (callback) {
        var self = this;
        return function (polygonArray) {
            self._buildReturnDataForCallback(polygonArray, callback)
        };
    };

    return OSMBuildingDataRetriever;
});

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
