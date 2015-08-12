/*
 * Author: Inzamam Rahaman
 */
define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapConfig',
        'OSMBuildingDataRetriever',
        'rbush',
        'OverpassAPIWrapper',
        'lodash',
        'Building',
        'BuildingFactory',
        '../js/polyline',
        'Route'],
    function(ww,
             OpenStreetMapConfig,
             OSMBuildingDataRetriever,
             rbush,
             OverpassAPIWrapper,
             _,
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
            this._osmBuildingRetriever = new OSMBuildingDataRetriever();
            this._buildingGrabIntervalID = null;
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

        OpenStreetMapLayer.prototype.getBoundingRectLocs = function(center, grid) {
            var jQueryDoc = $(window.document),
                jQH = jQueryDoc.height(),
                jQW = jQueryDoc.width(),
                R = jQH/jQW,
                size = (grid ||.002);
            //grid = (grid || .01);
            //center.latitude = Math.round(center.latitude/grid)*grid;
            //center.longitude = Math.round(center.longitude/grid)*grid;
            center.latitude = Math.round(center.latitude/(2*size))*(2*size);
            center.longitude = Math.round(center.longitude/(2*size/R))*(2*size/R);

            //console.log(R);
            return [
                center.latitude + size,
                center.longitude - size/R,
                center.latitude - size,
                center.longitude + size/R
            ];

        };

        /*
            Uses a center point and the default configuration for the drawable bounding rectangle's
            size to get all of the nodes from the RTree to draw said nodes
            @param center: the center point of the bounding rectangle
            @return: the RTree nodes that need to be considered to be drawn
         */
        OpenStreetMapLayer.prototype.getAllNodesToDraw = function(center) {
            var boundingRectangle = this.getBoundingRectLocs(center);
            //console.log(boundingRectangle)
            var rTreeNodesToBeConsidered = this._tree.search(boundingRectangle);
            //console.log(rTreeNodesToBeConsidered)
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
            var self = this;
            nodes.forEach(function(node) {
                console.log('node is ', node);
                var renderableObject = node[node.length - 1];
                renderableObject.enabled = enabled;
                if (enabled) {
                    self._visibleNodes.push(renderableObject);
                }
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
            //console.log(rTreeNodesToBeConsidered)
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
            //console.log(boundingRect)
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
            //console.log('Eye alt', currEyeAltitude)
            //console.log('view height', viewHeight)
            //var boundingBox = this.getEncompassingBoundingBox();
            var eyeLatitude = drawContext.eyePosition.latitude,
                eyeLongitude = drawContext.eyePosition.longitude;

            var bboxCenter = {
                latitude: eyeLatitude,
                longitude: eyeLongitude
            };
            //
            var boundingBox = self.getBoundingRectLocs(bboxCenter);

            // var   boundingBox2 = [
            //        eyeLatitude +.75*Math.atan(viewHeight*100/(2*(currEyeAltitude + 6371000))),
            //        eyeLongitude-.75*Math.atan(viewWidth*100/(2*(currEyeAltitude + 6371000))),
            //        eyeLatitude-.75*Math.atan(viewHeight*100/(2*(currEyeAltitude + 6371000))),
            //        eyeLongitude+.75*Math.atan(viewWidth*100/(2*(currEyeAltitude + 6371000)))
            //    ];
            //console.log('this works',boundingBox2)
            //console.log('before',boundingBox)
            var box = [boundingBox[0], boundingBox[3], boundingBox[2], boundingBox[1]];
            //console.log('after',box)
            // If a call has not returned yet it does not get called again.
            if (!self.isInCall) {
                var route = new Route(bBoxToPolyline(box), {});
                self._drawLayer.addRenderable(route);
                this._osmBuildingRetriever.requestOSMBuildingData(box, function (buildingData) {
                    var numberOfBuildingsDrawSoFar = 0;
                    buildingData.forEach(function (buildingDatum) {
                        var building = self.buildingFromDatum(buildingDatum);
                        // Call the building data if that building id has not already been retrieved.
                        if (self.listOfBuildingsStoredByID.indexOf(building.id) === -1){
                            self.listOfBuildingsStoredByID.push(building.id);
                            self._osmBuildingRetriever.requestBuildingInfoById(building.id, function (data) {
                                var features = data['features'];
                                if (features){
                                    var first = features[0];
                                }
                                if (first){
                                    var properties = first['properties'];
                                }
                                if (properties){
                                    var tags = properties['tags'];
                                }
                                if (tags) {
                                    var buildingType = tags['building'];
                                }
                                if (buildingType) {
                                    building.buildingType = buildingType;
                                }
                                if (building.buildingType){
                                    building.bbox = box;
                                    self.addRenderable(building, function(renderable){return renderable.bbox})
                                }
                                numberOfBuildingsDrawSoFar++;
                                //console.log(numberOfBuildingsDrawSoFar, 'of', buildingData.length);
                                // Wait until all the buildings are drawn to call the api again.
                                if (numberOfBuildingsDrawSoFar >= buildingData.length-5) {
                                    self.isInCall = false;
                                }
                            });
                        } else {
                            numberOfBuildingsDrawSoFar++;
                            //console.log('Building Already Drawn' , numberOfBuildingsDrawSoFar, 'of', buildingData.length);
                            // Wait until all the buildings are drawn to call the api again.


                            if (numberOfBuildingsDrawSoFar === buildingData.length) {
                                self.isInCall = false;
                            }
                        }
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
                    self._drawLayer.render(dc);
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
