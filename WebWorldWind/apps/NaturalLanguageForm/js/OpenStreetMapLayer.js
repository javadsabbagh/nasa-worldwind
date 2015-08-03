/*
 * Author: Inzamam Rahaman
 */
define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapConfig',
        'OSMBuildingDataRetriever',
        'rbush',
        'OSMDataRetriever',
        'Set',
        'OverpassAPIWrapper',
        'lodash',
        'AnyAmenityRequestProxy',
        'buckets',
        'BuildingLayer',
        'Building',
        '../js/polyline'],
    function(ww,
             OpenStreetMapConfig,
             OSMBuildingDataRetriever,
             rbush,
             OSMDataRetriever,
             Set,
             OverpassAPIWrapper,
             _,
             AnyAmenityRequestProxy,
             buckets,
             BuildingLayer,
             Building,
             polyline) {

        'use strict';

        /*
            From the draw context, extracts the current altitude of the eyePosition
         */
        function getEyeAltitude(drawContext) {
            return drawContext.eyePosition.altitude;
        }

        /*
         From the draw context, extracts the current location of the eyePosition
         */
        function getEyeLocation(drawContext) {
            return [drawContext.eyePosition.latitude,drawContext.eyePosition.longitude];
        }

        /*
            Abstracts off of the OpenStreetMap Layer and a Renderable Layer
            to facilitate the display of information to the user
            @param wwd: the WorldWind WorldWindow object to which the layers
                        are to be applied
         */
        function OpenStreetMapLayer(wwd) {

            this._config = new OpenStreetMapConfig();
            this._wwd = wwd;
            this._baseLayer = new WorldWind.OpenStreetMapImageLayer(null);
            this._drawLayer = new WorldWind.RenderableLayer('Building Layer');
            this._enabled =  true;
            this._displayName = 'Open Street Maps';
            this._tree = new rbush(this._config.rTreeSize);
            this._visibleNodes = [];
            this._dataRetriever = new OSMDataRetriever();
            this._set = new Set();
            this._overpassWrapper = new OverpassAPIWrapper();
            this._osmBuildingRetriever = new OSMBuildingDataRetriever();
            this._amenityReqest = new AnyAmenityRequestProxy();
            this._buildingGrabIntervalID = null;
            this._urlSet = new buckets.Set();
            this._buildingLayer = new BuildingLayer();
            this._renderOnce = true;
            this._hasRenderedOnce = false;
        }


        /*
            Given a WorldWind Location or WorldWind Position, uses the maximum bounding
            box distances from the config object to define a bounding box for usage in
            the OpenStreetMap API and the RTree.
            Based on Java implementation given at http://janmatuschek.de/LatitudeLongitudeBoundingCoordinates
            @param center : the object containing the longitude and latitude points of the bounding rect's
                            center point
            @return : returns an array, [left, top, right, bottom], that represents the bounding rectangle
         */

        OpenStreetMapLayer.prototype.getBoundingRectLocs = function(center) {
            //creates a grid of .125 degrees by rounding the center point to the nearest .125 degrees.
            center.latitude = Math.round(center.latitude/.125)*.125;
            center.longitude = Math.round(center.latitude/.125)*.125;

            return [
                center.longitude - .0625,
                center.latitude - .0625,
                center.longitude + .0625,
                center.latitude + .0625
            ];

        }

        /*
            Uses a center point and the default configuration for the drawable bounding rectangle's
            size to get all of the nodes from the RTree to draw said nodes
            @param center: the center point of the bounding rectangle
            @return: the RTree nodes that need to be considered to be drawn
         */
        OpenStreetMapLayer.prototype.getAllNodesToDraw = function(center) {
            var boundingRectangle = this.getBoundingRectLocs(center);
            var rTreeNodesToBeConsidered = this._tree.search(boundingRectangle);
            return rTreeNodesToBeConsidered;
        }


        /*
            Scans through an iterable of rTreeNodes, plucks out the renderable (stored as the
            last element of the array), and sets the enabled property of the renderable
            @param nodes : the RTree nodes to be considered
                           NB: stored as [left, top, right, bottom, renderable]
            @param enabled : the value to set the enabled property field to
         */
        OpenStreetMapLayer.prototype.setEnabledPropertyOnNodes = function(nodes, enabled) {
            nodes.forEach(function(node) {
                console.log('node is ', node);
                var renderableObject = node[node.length - 1];
                renderableObject.enabled = enabled;
            })
        }


        /*
            Retrieves nodes within a configured bounding rectangle, enable their
            constituent renderables, and returns the nodes;
            @param center: the center point of the bounding rectangle
            @return: the RTree nodes to be considered
         */
        OpenStreetMapLayer.prototype.enableNodesToBeDrawn = function(center) {
            var rTreeNodesToBeConsidered = this.getAllNodesToDraw(center);
            this.setEnabledPropertyOnNodes(rTreeNodesToBeConsidered, true);
            return rTreeNodesToBeConsidered;
        }

        /*
            Iterates, through the renderables currently being drawn,
            disables them, and clears the the visible nodes array
         */
        OpenStreetMapLayer.prototype.resetVisibleNodes = function() {
            this.setEnabledPropertyOnNodes(this._visibleNodes, false);
            this._visibleNodes = [];
        }


        /*
            Takes a renderable and a function to extract its bounding rectangle to yield
            an RTree node.
            @param renderable : the renderable to be drawn
            @param extractBoundingRectFun : the function to extract a bounding box for a
                                            renderable
            @return : an array to be inserted into an RTree as a node
         */
        OpenStreetMapLayer.prototype.createRTreeNode = function(renderable, extractBoundingRectFun) {
            renderable.enabled = false;
            var boundingRect = extractBoundingRectFun(renderable);
            boundingRect.push(renderable);
            return boundingRect;
        }


        /*
            Accepts a renderable and a function to extract a boundingRectangle from the renderable to insert
            and manage said renderable in the layer
            @param renderable : the renderable to be added
            @param extractBoundingRectFun : the function to be used to extract the bouding rectangle from
                                            the renderable
         */
        OpenStreetMapLayer.prototype.addRenderable = function(renderable, extractBoundingRectFun) {
            var node = this.createRTreeNode(renderable, extractBoundingRectFun);
            this._drawLayer.addRenderable(renderable);
            this._tree.insert(node);
        }


        /*
            Accepts an iterable of renderables and loads them appropriately
            @param renderable : the renderable to be added
            @param extractBoundingRectFun : the function to be used to extract the bouding rectangle from
                                            the renderable

         */
        OpenStreetMapLayer.prototype.addRenderables = function(renderables, extractBouundingRectFun) {
            var self = this;
            var nodes = renderables.map(function(renderable) {
                return self.addRenderable(renderable, extractBouundingRectFun);
            });
            this._drawLayer.addRenderables(renderables);
            this._tree.load(nodes);
        }


        /*
            Transform a bounding rectangle into a string to be used to examine if
            the bounding rectangle has been examined already
            @param boundingRect: the bounding rectangle to be considered
            @return a string representation of the bounding rectangle
         */
        OpenStreetMapLayer.prototype.createBoundingRectKey = function(boundingRect) {
            return boundingRect.join(' ');
        }


        OpenStreetMapLayer.prototype.handleBuildingInfo = function(eyeAltitude) {
            var self = this;
            var boundingBox = this.getEncompassingBoundingBox();
            console.log('bounding box returned ', boundingBox);
            var box = [boundingBox[0], boundingBox[3], boundingBox[2], boundingBox[1]];

            //var specs = {
            //    north: boundingBox[0],
            //    west : boundingBox[1],
            //    south: boundingBox[2],
            //    east : boundingBox[3]
            //};
            //
            //
            //// 888 17th St NW Washington, DC 20006
            //this._amenityReqest.retrieveData(specs, function(specifications, data) {
            //   console.log('Amenity(ies) : ',data);
            //});



            function buildingFromData(buildingData) {
                var id = building['id'];
                var geometry = building['geometry'];
                var coordinates = geometry['coordinates'];
                var points = coordinates[0];
                var polygon = _.map(points, function(point) {
                    return new WorldWind.Position(point[1], point[2], 100);
                });
                return new Building(id, polygon, undefined);
            }

            this._osmBuildingRetriever.requestOSMBuildingData(box, function(buildingData) {
                //
                 //console.log('building data for ', boundingBox);
                 //alert(_.map(buildingData, JSON.stringify));



                var buildings = _.map(buildingData, function(building) {





                });

                // [[]]
                var polygons = _.map(buildingData, function(building) {
                    var geometry = building['geometry'];
                    var coordinates = geometry['coordinates'];
                    var points = coordinates[0];
                    return _.map(points, function(point) {
                        return new WorldWind.Position(point[1], point[0], 100);
                    });
                });

                polygons.forEach(function(polygon) {
                    //console.log('adding building at ', polygon.join(','));
                   self._buildingLayer.addBuilding(polygon, null);
                });


                var boundings = _.map(polygons, function(polygon) {



                    var pointWithHighestLongitude = _.max(polygon, 'latitude');
                    var pointWithHighestLatitude = _.max(polygon, 'longitude');
                    var pointWithLowestLongitude = _.min(polygon, 'latitude');
                    var pointWithLowestLatitude = _.min(polygon, 'longitude');

                    //console.log(pointWithHighestLatitude, pointWithHighestLongitude,
                    //    pointWithLowestLatitude, pointWithLowestLongitude);

                    var maxLongitude = pointWithHighestLongitude['latitude'];
                    var minLongitude = pointWithLowestLongitude['latitude'];
                    var maxLatitude = pointWithHighestLatitude['longitude'];
                    var minLatitude = pointWithLowestLatitude['longitude'];

                    var decimalPoints = 5;

                    var obj = {
                        north : maxLatitude,
                        south : minLatitude,
                        east : maxLongitude,
                        west : minLongitude
                    };

                    //var coordinates = _.map(obj, function(coordinate) {
                    //    return coordinate.toFixed(decimalPoints);
                    //});
                    var coordinates = obj;

                    return coordinates;
                });

                //console.log('polygons ' , polygons);
                //console.log('bounding boxes ', boundings);



                //var east = boundingBox[1];
                //var north = boundingBox[0];
                //var west = boundingBox[3];
                //var south = boundingBox[2];


                // go to 888 17th St NW
                // Washington, DC 20006 for testing
                // 888 17th St NW Washington, DC 20006

                if(boundings.length > 0) {

                    var totalBox = {
                        north : _.max(boundings, 'north')['north'],
                        south : _.min(boundings, 'south')['south'],
                        west : _.min(boundings, 'west')['west'],
                        east : _.max(boundings, 'east')['east']
                    };

                    var boxAsArr = [totalBox.north, totalBox.east, totalBox.south, totalBox.west];



                    // Based on algorithm found at
                    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
                    var pointInPolygon = function(point, polygon) {
                        var x = point.latitude;
                        var y = point.longitude;

                        for(var idx = 0, jdx = polygon.length - 1; idx < jdx; jdx = idx++) {
                            var polyPoint1 = polygon[idx];
                            var polyPoint2 = polygon[jdx];

                            var xi = polyPoint1.latitude;
                            var yi = polyPoint1.longitude;
                            var xj = polyPoint2.latitude;
                            var yj = polyPoint2.longitude;

                            var intersect = ((yi > y) != (yj > y))
                                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

                            if(intersect === true) {
                                return true;
                            }
                        }
                        return false;
                    }

                    var assignToPolygon = function(polygons, amenities) {

                        var mapping = new buckets.Dictionary(function(polygon) {
                            var pointsAsStrings = _.map(polygon, function(point) {
                                return point.latitude.toFixed(5) + ',' + point.longitude.toFixed(5);
                            });
                            return pointsAsStrings.join(',');
                        });

                        polygons.forEach(function(polygon) {
                            var filteredAmenities = _.filter(amenities, function(amenity) {
                                var amenityLoc = amenity.location;
                                return pointInPolygon(amenityLoc, polygon);
                            });
                            mapping.set(polygon, filteredAmenities);
                        });
                        return mapping;
                    }


                    var processedRetrievedAmenities = function(specs, data) {
                        if(data.length > 0) {
                            //console.log('amenities in area ', boxAsArr.join(','));
                            //console.log('amenity : ', data);
                            var mapping = assignToPolygon(polygons, data);
                            //console.log(mapping);
                        } else {
                            //console.log('no amenities in area ', boxAsArr.join(','));
                            //console.log('result from call : ', data);
                        }
                    }

                    self._amenityReqest.retrieveData(totalBox, processedRetrievedAmenities);

                }

            });

        }


        /*
            Abstracts over the render functions of both the open street map layer
            and the renderable layer
            @param dc :  the DrawContext object to be passed to the two
                         constituent layers' render functions
         */
        OpenStreetMapLayer.prototype.render = function(dc) {
            var self = this;
            if(this._enabled) {
                this._baseLayer.render(dc);
                var currEyeAltitude = getEyeAltitude(dc);
                if(currEyeAltitude <= 5000) {
                    this._buildingLayer.render(dc);
                    if(this._buildingGrabIntervalID === null) {
                        this._buildingGrabIntervalID = setInterval(function() {
                            if(currEyeAltitude <= 1000) {
                                console.log('checking to render');
                                self.handleBuildingInfo(currEyeAltitude);
                                //if(self._renderOnce === true && self._hasRenderedOnce === false) {
                                //    self.handleBuildingInfo(currEyeAltitude);
                                //    self._hasRenderedOnce = true;
                                //} else if(self._renderOnce === false) {
                                //    self.handleBuildingInfo(currEyeAltitude);
                                //}
                            }
                        }, 5 * 1000);
                    }
                } else {
                    clearInterval(self._buildingGrabIntervalID);
                    self._buildingGrabIntervalID = null;
                    self._buildingLayer.clearBuildings();
                }
            }

        }


        OpenStreetMapLayer.prototype.getAllBoundingBoxes  = function() {
            var tiles = this._baseLayer.currentTiles;
            var boxes = tiles.map(function(tile) {
                var tileDimensions = tile.sector;
                var maxLongitude = tileDimensions.maxLongitude;
                var maxLatitude = tileDimensions.maxLatitude;
                var minLongitude = tileDimensions.minLongitude;
                var minLatitude = tileDimensions.minLatitude;
                // returns in format [up, left, down, right]
                var boundingBox = [maxLatitude, minLongitude, minLatitude, maxLongitude];
                return boundingBox;
            });
            return boxes;
        }


        function mapMaxOrMin(property, maxBy) {
            function extractMap(f) {
                return function(polgon) {
                    return _.map(f(polgon, property), property);
                }
            }
            if(maxBy === true) {
                return extractMap(_.max);
            }
            return extractMap(_.min)
        }


        OpenStreetMapLayer.prototype.polygonToBoundingBox = function(polygon) {
            console.log('Processing ', polygon);
            var maxLongitude = _.map(_.max(polygon, 'longitude'), 'longitude');
            var maxLatitude = _.map(_.max(polygon, 'latitude'), 'latitude');
            var minLongitude = _.map(_.min(polygon, 'longitude'), 'longitude');
            var minLatitude = _.map(_.min(polygon, 'latitude'), 'latitude');
            var boundingBox = [maxLatitude, minLongitude, minLatitude, maxLongitude];
            return boundingBox;
        }


        OpenStreetMapLayer.prototype.getEncompassingOfBoundingBoxes = function(boxes) {
            var boundingBoxes = boxes;

            function getArrayFromLoc(index) {
                return function(arr) {
                    return arr[index];
                }
            }

            var indicies = _.range(4);
            var accessFuns = _.map(indicies, getArrayFromLoc);
            var boundingBox = _.map(accessFuns, function(f) {
                return f(_.max(boundingBoxes, f));
            });
            return boundingBox;
        }


        OpenStreetMapLayer.prototype.getEncompassingBoundingBox = function() {
            var boundingBoxes = this.getAllBoundingBoxes();

            var first = boundingBoxes[0];
            var last = boundingBoxes[boundingBoxes.length  - 1];
            var boundingBox = [first[0], first[1], last[0], last[1]];

            //console.log('all bounding boxes ', boundingBoxes);
            //function getArrayFromLoc(index) {
            //    return function(arr) {
            //        return arr[index];
            //    }
            //}
            //
            //var indicies = _.range(4);
            //var accessFuns = _.map(indicies, getArrayFromLoc);
            //var boundingBox = _.map(accessFuns, function(f) {
            //   return f(_.max(boundingBoxes, f));
            //});
            return boundingBox;
        }


        /*
         if(currEyeAltitude <= this._config.drawHeight) {
         var center = dc.eyePosition;
         var boundingRect = this.getBoundingRectLocs(center);
         //console.log('center ' ,center);
         //console.log('going to box ', boundingRect);
         var key = this.createBoundingRectKey(boundingRect);
         if(this._set.contains(key)) {
         console.log('we have this key')
         self.resetVisibleNodes();
         self._visibleNodes = self._visibleNodes.concat(self.enableNodesToBeDrawn(center));
         self._drawLayer.render(dc);
         } else {
         this._overpassWrapper.getAllAmenitiesInBox(boundingRect, function(data) {

         console.log('data from overpass ', data);
         })
         //this._dataRetriever.requestOSMData(boundingRect, function(data){
         //    self._set.add(key);
         //    console.log(data, ' is ');
         //    self.resetVisibleNodes();
         //    self._visibleNodes = self._visibleNodes.concat(self.enableNodesToBeDrawn(center));
         //    self._drawLayer.render(dc);
         //});
         }
         } else {
         this.resetVisibleNodes();
         this._visibleNodes = [];
         }
         */



        Object.defineProperties(OpenStreetMapLayer.prototype, {
           enabled : {
               get: function() {
                   return this._enabled;
               },

               set: function(value) {
                   this._enabled = value;
               }
           },

            displayName: {
                get: function() {
                    return this._displayName;
                }
            },

            currentTiles: {
                get: function() {
                    var tiles = this._baseLayer.currentTiles;
                    return tiles;
                }
            }


        });



        return OpenStreetMapLayer;




});
