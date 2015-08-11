/*
 * Author: Inzamam Rahaman
 */
define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapConfig',
        'OSMBuildingDataRetriever',
        'rbush',
        'OSMDataRetriever',
        'OverpassAPIWrapper',
        'lodash',
        'AnyAmenityRequestProxy',
        'buckets',
        'Building',
        'BuildingFactory',
        '../js/polyline',
        'Route'],
    function(ww,
             OpenStreetMapConfig,
             OSMBuildingDataRetriever,
             rbush,
             OSMDataRetriever,
             OverpassAPIWrapper,
             _,
             AnyAmenityRequestProxy,
             buckets,
             Building,
             BuildingFactory,
             polyline,
             Route) {

        'use strict';

        function bBoxToPolyline (bBox) {
            return [
                [bBox[0],bBox[1]],
                [bBox[0],bBox[3]],
                [bBox[2],bBox[3]],
                [bBox[2],bBox[1]],
                [bBox[0],bBox[1]]
            ]
        };

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
            this._set = new buckets.Set();
            this._overpassWrapper = new OverpassAPIWrapper();
            this._osmBuildingRetriever = new OSMBuildingDataRetriever();
            this._amenityReqest = new AnyAmenityRequestProxy();
            this._buildingGrabIntervalID = null;
            this._urlSet = new buckets.Set();
            this._renderOnce = true;
            this._hasRenderedOnce = false;
            this._renderableLayer = new WorldWind.RenderableLayer('Buildings');
            this._buildingFactory = new BuildingFactory();
            this.listOfBuildingsStoredByID = []
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

        OpenStreetMapLayer.prototype.buildingFromDatum = function(buildingData) {
            var id = buildingData['id'];
            var geometry = buildingData['geometry'];
            var coordinates = geometry['coordinates'];
            var points = coordinates[0];
            var polygon = _.map(points, function(point) {
                return new WorldWind.Position(point[1], point[0], 100);
            });
            var building = this._buildingFactory.createBuilding(id, polygon, undefined);
            return building;
            //return new Building(id, polygon, undefined);
        };

        /*
        * Calls the osmbuilding api to request all the buildings inside a bounding box. It then calls a second
        *   osmbuildings api to get information about each building. Upon response from the first api, it checks if each
        *   building is already drawn before proceeding with the second call and drawing it. The layer will not make
        *   another call until self.isInCall is false which only occurs once all building responses have returned.
        *
        * Bounding box required here is in the form [Low Lat, high long, high lat, low long]
        *
        * @param eyeAltitude: ...
         */

        OpenStreetMapLayer.prototype.handleBuildingInfo = function(drawContext) {
            var self = this;
            var jQueryDoc = $(window.document),
                viewHeight = jQueryDoc.height(),
                viewWidth = jQueryDoc.width(),
                currEyeAltitude = getEyeAltitude(drawContext);
            console.log('Eye alt', currEyeAltitude)
            console.log('view height', viewHeight)
            //var boundingBox = this.getEncompassingBoundingBox();
            var eyeLatitude = drawContext.eyePosition.latitude,
                eyeLongitude = drawContext.eyePosition.longitude,
                box = [
                    eyeLatitude-Math.atan(viewHeight*100/(2*(currEyeAltitude + 6371000))),
                    eyeLongitude+Math.atan(viewWidth*100/(2*(currEyeAltitude + 6371000))),
                    eyeLatitude+Math.atan(viewHeight*100/(2*(currEyeAltitude + 6371000))),
                    eyeLongitude-Math.atan(viewWidth*100/(2*(currEyeAltitude + 6371000)))
                ];
            //console.log('bounding box returned ', boundingBox);
            //var box = [boundingBox[0], boundingBox[3], boundingBox[2], boundingBox[1]];
            var route = new Route(bBoxToPolyline(box), {});
            self._renderableLayer.addRenderable(route);
            // If a call has not returned yet it does not get called again.
            if (!self.isInCall) {
                //console.log('Call to buildings made')
                this._osmBuildingRetriever.requestOSMBuildingData(box, function (buildingData) {
                    var numberOfBuildingsDrawSoFar = 0;
                    buildingData.forEach(function (buildingDatum) {
                        var building = self.buildingFromDatum(buildingDatum);
                        if (self.listOfBuildingsStoredByID.indexOf(building.id) === -1){
                            self.listOfBuildingsStoredByID.push(building.id);
                            self._osmBuildingRetriever.requestBuildingInfoById(building.id, function (data) {
                                var features = data['features'];
                                var first = features[0];
                                var properties = first['properties'];
                                // console.log('prop ', properties);
                                var tags = properties['tags'];
                                var buildingType = tags['building'];
                                building.buildingType = buildingType;
                                //console.log('building info for,', building.id, ': ', data, ' is ', buildingType);

                                self._renderableLayer.addRenderable(building);

                                numberOfBuildingsDrawSoFar++;
                                console.log(numberOfBuildingsDrawSoFar, 'of', buildingData.length);
                                // Wait until all the buildings are drawn to call the api again.
                                if (numberOfBuildingsDrawSoFar === buildingData.length) {
                                    self.isInCall = false;
                                }
                            });
                        } else {
                            numberOfBuildingsDrawSoFar++;
                            console.log('Building Already Drawn')
                            console.log(numberOfBuildingsDrawSoFar, 'of', buildingData.length);
                            // Wait until all the buildings are drawn to call the api again.
                            if (numberOfBuildingsDrawSoFar === buildingData.length) {
                                self.isInCall = false;
                            }
                        }


                        //console.log(numberOfBuildingsDrawSoFar, 'of', buildingData.length);
                        //// Wait until all the buildings are drawn to call the api again.
                        //if (numberOfBuildingsDrawSoFar === buildingData.length) {
                        //    self.isInCall = false;
                        //}
                    });



                });
            } else {
                console.log('Another Call Attempted')
            }

            self.isInCall = true;
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
                if(currEyeAltitude <= 3000) {
                    this._renderableLayer.render(dc);
                    if(this._buildingGrabIntervalID === null) {
                        this._buildingGrabIntervalID = setInterval(function() {
                            if(currEyeAltitude <= 1000) {
                                self.handleBuildingInfo(dc);
                            }
                        }, 5 * 1000);
                    }
                } else {
                    clearInterval(self._buildingGrabIntervalID);
                    self._buildingGrabIntervalID = null;
                    //self._buildingLayer.clearBuildings();
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

            return boundingBox;
        }


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
