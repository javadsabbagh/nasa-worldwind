/**
 * Created by Matthew on 8/13/2015.
 */
/*
* This modules calls the polygon api, calls the building info api.
*
* Module Completed but unused...
 */
define(['OSMBuildingDataRetriever',
        'BuildingFactory',
        'lodash',
        'OpenStreetMapConfig'],
    function (OSMBuildingDataRetriever,
              BuildingFactory,
              _,
              OpenStreetMapConfig) {

        /*
         Given a WorldWind Location or WorldWind Position, uses the maximum bounding
         box distances from the config object to define a bounding box for usage in
         the OpenStreetMap API and the RTree.
         @param center : the object containing the longitude and latitude points of the bounding rect's
         center point
         @return : returns an array, [top, left, bottom, right], that represents the bounding rectangle
         */
        function getBoundingRectLocs (center, grid) {
            var jQueryDoc = $(window.document),
                jQH = jQueryDoc.height(),
                jQW = jQueryDoc.width(),
                R = jQH/jQW,
                size = (grid ||.002);

            center.latitude = Math.round(center.latitude/(2*size))*(2*size);
            center.longitude = Math.round(center.longitude/(2*size/R))*(2*size/R);

            return [
                center.latitude + size,
                center.longitude - size/R,
                center.latitude - size,
                center.longitude + size/R
            ];

        }

        function bboxToNode (bbox) {
            return [
                Math.min(bbox[0],bbox[2]),
                Math.min(bbox[1],bbox[3]),
                Math.max(bbox[0],bbox[2]),
                Math.max(bbox[1],bbox[3])
            ]
        }

        var BuildingPolygonHandler = function ( layer ) {
            var self = this;

            self._OSMBuildingData = new OSMBuildingDataRetriever();
            self._buildingFactory = new BuildingFactory();
            self._config = new OpenStreetMapConfig();
            self._tempBuildingIDTracker = [];
            self._layer = layer;
            self._boxesOwned = {};


            self.buildingHandler = function (drawContext) {

                //console.log(drawContext)
                var callCompleteCallback = function () {self.isInCall = false; console.log('isincall set to false')};
                var eyeAltitude = drawContext.eyePosition.altitude;
                var box = getBoundingRectLocs(
                    {
                        latitude: drawContext.eyePosition.latitude,
                        longitude: drawContext.eyePosition.longitude
                    }

                );
                //console.log(!self.isInCall && eyeAltitude <= self._config._maxBuildingDrawHeight)
                if (!self.isInCall && eyeAltitude <= self._config._maxBuildingDrawHeight) {
                    self.isInCall = true;
                    self.getBuildingArrayAndType(
                        box,
                        self.buildingRenderableHandler,
                        callCompleteCallback
                    );

                }


            };

            self.buildingRenderableHandler = function (building) {
                if (building) {
                    self._layer.addRenderable(building, function(renderable){return renderable.bbox})
                }

            };

        };

        BuildingPolygonHandler.prototype.getBuildingArrayAndType = function (
            box,
            buildingRetreivedCallback,
            CompletionCallback) {
            var self = this;
            //console.log('called')
            var box = [box[0], box[3], box[2], box[1]];
            //console.log(box)
            var boxKey = (box.map(function(entry){return entry.toFixed(5)})).join(',');
            //console.log(boxKey)
            if (!self._boxesOwned[boxKey]) {
                self._boxesOwned[boxKey] = true;
                self._OSMBuildingData.requestOSMBuildingData(box, function (buildingIdArray) {
                    var numberOfBuildingsFullyRetreived = 0;
                    buildingIdArray.forEach(function (buildingData) {
                        var building = self.buildingFromDatum(buildingData);
                        if (self._tempBuildingIDTracker.indexOf(building.id) === -1) {
                            self._tempBuildingIDTracker.push(building.id);
                            self._OSMBuildingData.requestBuildingInfoById(building.id, function (data) {
                                var features = data['features'];
                                if (features) {
                                    var first = features[0];
                                }
                                if (first) {
                                    var properties = first['properties'];
                                }
                                if (properties) {
                                    var tags = properties['tags'];
                                }
                                if (tags) {
                                    var buildingType = tags['building'];
                                }
                                if (buildingType) {
                                    building.buildingType = buildingType;
                                }

                                if (building.buildingType) {
                                    building.bbox = bboxToNode(box);
                                    buildingRetreivedCallback(building)
                                }
                                numberOfBuildingsFullyRetreived++;
                                //console.log(numberOfBuildingsFullyRetreived, 'of', buildingIdArray.length)
                                if (numberOfBuildingsFullyRetreived >= buildingIdArray.length - 5) {
                                    CompletionCallback()
                                }

                            });
                        } else {
                            numberOfBuildingsFullyRetreived++;
                            //console.log(numberOfBuildingsFullyRetreived, 'of', buildingIdArray.length)
                            if (numberOfBuildingsFullyRetreived >= buildingIdArray.length - 5) {
                                CompletionCallback()
                            }

                        }

                    });
                })
            } else {
                //console.log('This is an old box');
                CompletionCallback()
            }
        };




        BuildingPolygonHandler.prototype.buildingFromDatum = function(buildingData) {
            var self = this;
            var id = buildingData['id'];
            var geometry = buildingData['geometry'];
            var coordinates = geometry['coordinates'];
            var points = coordinates[0];
            var polygon = _.map(points, function(point) {
                return new WorldWind.Position(point[1], point[0], 100);
            });

            return self._buildingFactory.createBuilding(id, polygon, undefined);
        };

        return BuildingPolygonHandler
    }
);