
/*
* Author: Inzamam Rahaman
* Extended by Matt Evers
*/
/*
    This module acts as the application entry point
 */

define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapLayer',
        'OpenStreetMapConfig',
        'jquery',
        'OSMDataRetriever','RouteLayer', 'Route','RouteAPIWrapper','NaturalLanguageHandler', 'polyline',
        'MapQuestGeocoder',
        'nlform',
        'nlbuilder',
        'HUDMaker',
        'OSMBuildingDataRetriever', 'DrainageBasinLayer'],
    function(ww,
             OpenStreetMapLayer,
             OpenStreetMapConfig,
             $,
             OSMDataRetriever, RouteLayer, Route, RouteAPIWrapper, NaturalLanguageHandler, polyline, MapQuestGeocoder,
             NLForm, NLBuilder, HUDMaker, OSMBuildingDataRetriever, DrainageBasinLayer) {


        'use strict';

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);


        var OpenStreetMapApp = function(worldwindow, argumentarray) {
            var self = this,
            amenity = argumentarray[0],
            address = argumentarray[1];
            console.log(amenity, address)

            this._osmBuildingRetriever = new OSMBuildingDataRetriever();
            this._wwd = worldwindow;

            var openStreetMapLayer = new OpenStreetMapLayer(this._wwd);

            this._wwd.addLayer(openStreetMapLayer);

            //var drainageBasins = new DrainageBasinLayer();
            //
            //this._wwd.addLayer(drainageBasins);

            this._animator = new WorldWind.GoToAnimator(self._wwd);

            //this._animator.goTo(self._config.startPosition);

            var naturalLanguageHandler = new NaturalLanguageHandler(self._wwd);

            var routeLayer = new RouteLayer();

            this._wwd.addLayer(routeLayer);


            var renderableLayer = new WorldWind.RenderableLayer(argumentarray[0]);

            this._wwd.addLayer(renderableLayer);

            console.log(this._wwd);
            //
            //var polygonLayer = new WorldWind.RenderableLayer('Building Layers');
            //
            //this._wwd.addLayer(polygonLayer);
            //this.DIDCALL = false;
            //if (!this.DIDCALL){
            //    this._osmBuildingRetriever.requestOSMBuildingData([0,0,0,0], function(buildingData) {
            //        //console.log('building data for ', boundingBox);
            //        console.log(buildingData);
            //        buildingData.forEach(function (building){
            //            var geometries = building.geometry.coordinates;
            //            // Turn the raw lat long data into worldwind positions
            //            building.geometry.worldWindCoordinates = [];
            //            geometries.forEach(function (boundary) {
            //                var boundaryToPush = [];
            //                boundary.forEach(function (point){
            //                    boundaryToPush.push(new WorldWind.Position(point[1], point[0], 5e1))
            //                });
            //                building.geometry.worldWindCoordinates.push(boundaryToPush)
            //            })
            //        });
            //        console.log(buildingData)
            //
            //        buildingData.forEach(function (building) {
            //            self.drawPolygon(polygonLayer, building.geometry.worldWindCoordinates)
            //        })
            //    });
            //    this.DIDCALL = true;
            //}

            //amenity = 'cafe';
            //address = 'mountain view';
            var routeLayerRouteBuilder = new (this.RouteBuilder(routeLayer));

            //First, geocode the address
            this.callGeocoder(address, amenity, function(returnedSpecs) {
                // Second, call the natural language handler with the specs.
                // This calls the callback with data corrosponding to all the amenities of the given
                // amenity type inside a bounding box around the address provided. (returned Specs is the geocoded address)
                naturalLanguageHandler.receiveInput(returnedSpecs, function(newSpecs, returnedData){
                    // Third, build the layer.
                    self.buildPlacemarkLayer(renderableLayer, returnedData);
                    // Fourth, add the selection controller to the layer.
                    self.HighlightAndSelectController(renderableLayer, function (returnedRenderable){
                        var pointOfRenderable = self.getPointFromRenderableSelection(returnedRenderable.amenity);
                        var hudID = returnedRenderable.amenity._amenity;

                        // Build an overlay when a placemark is clicked on.
                        var HudTest = new HUDMaker(
                            hudID,
                            [returnedRenderable.clickedEvent.x,returnedRenderable.clickedEvent.y]
                        );


                        //Sixth, add this point to the route layer and see if it is enough to build a route.
                        if (routeLayerRouteBuilder.routeArray.length === 0){
                            HudTest.assembleDisplay(
                                'Get directions',
                                'from Here',
                                function(o){routeLayerRouteBuilder.processPoint(pointOfRenderable); HudTest.close()})
                        } else {
                            HudTest.assembleDisplay(
                                'Get directions',
                                'to Here',
                                function(o){routeLayerRouteBuilder.processPoint(pointOfRenderable); HudTest.close()})
                        }
                    })

                })


            });



        };

        /*
        * Constructs a routeBuilder and returns it. This module waits for the selection of two points and then
        * draws a route between those two points.
        *
        * @param routeLayer: The desired layer for this routebuilder to be bound.
         */
        OpenStreetMapApp.prototype.RouteBuilder = function (routeLayer) {
            var self = this;
             var RouteBuilderMod = function  (){
                 var routeBuilder = this;
                 //This should eventually look like [fromLatitude, fromLongitude, toLatitude, toLongitude]
                 // This refers to RouteBuilder
                 routeBuilder.routeArray = [];
                 routeBuilder.routeLayer = routeLayer;

                 // A singleton routefinder.
                 if (!self.routeFinder) {
                 self.routeFinder = new RouteAPIWrapper();
                 }
             };

             /*
             * Concatenates a pointArray of the form [lat, lon] to the attribute routeBuilder.routeArray. Then if
             * the routeArray has 2 points (i.e. a start and stop) then it calls the function to draw the route on the
             * layer.
             *
             * @param pointArray: a pointArray of the form [lat, lon]
             */
            RouteBuilderMod.prototype.processPoint = function (pointArray) {
                var routeBuilder = this;

                routeBuilder.routeArray = routeBuilder.routeArray.concat(pointArray);

                if (routeBuilder.routeArray.length === 4) {
                    routeBuilder.drawRoute(routeBuilder.routeArray);
                    routeBuilder.routeArray = [];
                }
            };

            RouteBuilderMod.prototype.displayInstructions = function (text) {
                var jQueryDoc = $(window.document);
                var directionDisplay = new HUDMaker(
                    'Route Instructions',
                    [jQueryDoc.width() *.3, 0]
                );
                directionDisplay.assembleDisplay(text)
            };

            /*
            * Draws the desired route onto the layer this routebuilder is bound to.
            *
            * @param routeArray: an array of the form [fromLatitude, fromLongitude, toLatitude, toLongitude]
            */
            RouteBuilderMod.prototype.drawRoute = function (routeArray) {
                var routeBuilder = this;
                self.routeFinder.getRouteData(routeArray, function(routeData) {
                    console.log('routeInformation : ', routeData);
                    routeBuilder.displayInstructions(routeBuilder.buildTextInstructions(routeData['route_instructions']));
                    routeBuilder.routeLayer.addRoute(routeData);
                });
            };

            RouteBuilderMod.prototype.decodeRouteAngle = function (angle) {
                var routeBuilder = this;

                for (var i = 0; i < angle.length; i++){
                    var character = angle[i];
                    if (character === '-'){
                        return routeBuilder.decodeRouteAngle(angle.slice(0,i)) + ' then ' +
                            routeBuilder.decodeRouteAngle(angle.slice(i+1,angle.length))
                    }
                }

                if (angle == 1) {
                    return 'Go Straight';
                } else if (angle == 2) {
                    return 'Turn Slight Right';
                } else if (angle == 3) {
                    return 'Turn Right';
                } else if (angle == 4) {
                    return 'Turn Sharp Right';
                } else if (angle == 5) {
                    return 'U-Turn';
                } else if (angle == 6) {
                    return 'Turn Sharp Left';
                } else if (angle == 7) {
                    return 'Turn Left';
                } else if (angle == 8) {
                    return 'Turn Slight Left';
                } else if (angle == 9) {
                    return 'Reach Via Location';
                } else if (angle == 10) {
                    return 'Head On';
                } else if (angle == 11) {
                    return 'Enter Round About';
                } else if (angle == 12) {
                    return 'Leave Round About';
                } else if (angle == 13) {
                    return 'Stay on Round About';
                } else if (angle == 14) {
                    return 'Start at End of Street';
                } else if (angle == 15) {
                    return 'Arrive at Your Destination'
                }


            };
            //["10", "Castro Street", 280, 0, 18, "280m", "NE", 27, 1]
            RouteBuilderMod.prototype.buildTextInstructions = function (arrayOfInstructions) {
                var routeBuilder = this;
                var instructions = '';
                arrayOfInstructions.forEach(function(instruction) {
                    var instructionst = routeBuilder.decodeRouteAngle(instruction[0]);
                    if (instruction[1]){
                        instructionst += ' onto ' + instruction[1];
                    }
                    if (instruction[5] && instruction[5] != '0m'){
                        instructionst += ' for ' + instruction[5];
                    }
                    instructionst += '<br>';
                    instructions += instructionst
                });
                console.log(instructions);
                return instructions
            };

            return RouteBuilderMod

        };

        /*
        * Creates a mouse listener that highlights placemarks on a layer if the mouse is over that placemark.
        *
        * @param renderableLayer: Layer to add the listener to. The highlight controller will only highlight placemarks
        *                           on this layer.
        */
        OpenStreetMapApp.prototype.HighlightController = function (renderableLayer) {
            var self = this;
            var ListenerForHighlightOnLayer = function(o) {
                var worldWindow = self._wwd,
                    highlightedItems = [];
                // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
                // the mouse or tap location.
                var x = o.clientX,
                    y = o.clientY;
                var redrawRequired = renderableLayer.renderables.length > 0; // must redraw if we de-highlight previous shapes
                // De-highlight any previously highlighted shapes.
                renderableLayer.renderables.forEach(function (renderable) {
                    renderable.highlighted = false
                });
                // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
                // relative to the upper left corner of the canvas rather than the upper left corner of the page.
                var pickList = worldWindow.pick(worldWindow.canvasCoordinates(x, y));
                if (pickList.objects.length > 0) {
                    redrawRequired = true;
                }
                // Highlight the items picked by simply setting their highlight flag to true.
                if (pickList.objects.length > 0) {
                    for (var p = 0; p < pickList.objects.length; p++) {
                        if (!pickList.objects[p].isTerrain) {
                            pickList.objects[p].userObject.highlighted = true;
                            // Keep track of highlighted items in order to de-highlight them later.
                            highlightedItems.push(pickList.objects[p].userObject);
                        }
                    }
                }
                // Update the window if we changed anything.
                if (redrawRequired) {
                    worldWindow.redraw(); // redraw to make the highlighting changes take effect on the screen
                }
            };
            self._wwd.addEventListener('mousemove', ListenerForHighlightOnLayer);
        };

        /*
         * Creates a mouse listener that highlights placemarks on a layer if the mouse is over that placemark.
         *
         * @param callback: What function to call when a placemark is clicked on. The callback is called with the
         *                      the renderable as a param (with the amenity info in renderable.amenity and clickevent
         *                      in renderable.clickedEvent).
         * @param renderableLayer: Layer to add the listener to. The highlight controller will only highlight placemarks
         *                           on this layer.
         */
        OpenStreetMapApp.prototype.HighlightAndSelectController = function (renderableLayer, callback, callbackWithMouse) {
            var self = this;

            //Create a highlight controller for the layer.
            self.HighlightController(renderableLayer);

            var ListenerForClickOnPlacemark = function (o) {
                // Calls the callback for each highlighted placemark. There should only be one so this shouldn't be
                //  an issue.
                renderableLayer.renderables.forEach(function(renderable){
                    if (renderable.highlighted){
                        renderable.clickedEvent = o;
                        callback(renderable);
                    }
                });

            };
            self._wwd.addEventListener('mousedown', ListenerForClickOnPlacemark);
        };

        /*
        *   Populates a layer with placemarks given in an array of ammenities.
        *
        * @param arrayofamenities: An array containing elements geographical location and a name.
        * @param renderableLayer: A worldwind layer to populate.
        */
        OpenStreetMapApp.prototype.buildPlacemarkLayer = function (renderableLayer, arrayofamenities) {
            var pinImgLocation = '../NaturalLanguageForm/img/pin.png' , // location of the image files
                placemark,
                placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
                highlightAttributes,
                placemarkLayer = renderableLayer,
                latitude,
                longitude;

            // Set up the common placemark attributes.
            placemarkAttributes.imageScale = 1;
            placemarkAttributes.imageOffset = new WorldWind.Offset(
                WorldWind.OFFSET_FRACTION, 0.3,
                WorldWind.OFFSET_FRACTION, 0.0);
            placemarkAttributes.imageColor = WorldWind.Color.WHITE;
            placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
                WorldWind.OFFSET_FRACTION, 0.5,
                WorldWind.OFFSET_FRACTION, 1.0);
            placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
            //placemarkAttributes.drawLeaderLine = true;
            placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;

            arrayofamenities.forEach(function(amenity){
                latitude = amenity['_location']['latitude'];
                longitude = amenity['_location']['longitude'];
                // Create the placemark and its label.
                placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude, 1e1, true, null));
                placemark.label = amenity['_amenity'];
                placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

                // Create the placemark attributes for this placemark. Note that the attributes differ only by their
                // image URL.
                placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                placemarkAttributes.imageScale = .1;
                placemarkAttributes.imageSource = pinImgLocation;
                placemark.attributes = placemarkAttributes;

                // Create the highlight attributes for this placemark. Note that the normal attributes are specified as
                // the default highlight attributes so that all properties are identical except the image scale. You could
                // instead vary the color, image, or other property to control the highlight representation.
                highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                highlightAttributes.imageScale = .12;
                placemark.highlightAttributes = highlightAttributes;

                //So we can refer to this loc later
                placemark.amenity = amenity;

                // Add the placemark to the layer.
                placemarkLayer.addRenderable(placemark);
            });
        };

        /*
        * Extracts the lat and long information from a given renderable.
        *
        * @param selectedRenderable: A renderable with lat, long information.
        *
        * @return: an array of the form [latitude, longitude] corrosponding to the renderable.
         */
        OpenStreetMapApp.prototype.getPointFromRenderableSelection = function (selectedRenderable) {
            if (selectedRenderable) {
                var toLocation = selectedRenderable.location;
                var toLatitude = toLocation.latitude;
                var toLongitude = toLocation.longitude;
                return [toLatitude, toLongitude]
            }
        };

        /*
        *   Calls the callback function with the geocoded address as a parameter. This also creates a singleton
        *   of the mapquest geocoder.
        *
        *   @param callback: Callback function. This is called with geocoded 'specs' as the parameter.
        *   @param address: Name of location such as 'Mountain View'
        */
        OpenStreetMapApp.prototype.callGeocoder = function (address, amenityType, callback) {
            var self = this;

            // A singleton
            if (!self.Geocoder) {
                self.Geocoder = new MapQuestGeocoder();
            }

            self.Geocoder.getLatitudeAndLong(address, function(location) {
                var worldWindLoc = new WorldWind.Position(location.latitude, location.longitude, 1e3);
                var animator = new WorldWind.GoToAnimator(self._wwd);
                animator.goTo(worldWindLoc);

                var specs = {
                    longitude : location.longitude,
                    latitude : location.latitude,
                    useCurrentLocationForNavigation : false,
                    overpassKey : 'amenity',
                    overpassValue : amenityType
                };

                callback(specs)

            });

        };

        return OpenStreetMapApp;

});
