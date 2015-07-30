
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
        'OSMBuildingDataRetriever'],
    function(ww,
             OpenStreetMapLayer,
             OpenStreetMapConfig,
             $,
             OSMDataRetriever, RouteLayer, Route, RouteAPIWrapper, NaturalLanguageHandler, polyline, MapQuestGeocoder,
             NLForm, NLBuilder, HUD, OSMBuildingDataRetriever) {


        'use strict';

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        /*
        * Removes all special characters from a string
        *
        * @param str: any string
        *
        * @return: the input string with special characters ommitted.
         */
        function removeSpecials(str) {
            var lower = str.toLowerCase();
            var upper = str.toUpperCase();

            var res = "";
            for(var i=0; i<lower.length; ++i) {
                if(lower[i] != upper[i] || lower[i].trim() === '')
                    res += str[i];
            }
            return res;
        }

        var OpenStreetMapApp = function(worldwindow, amenity, address) {
            var self = this;

            this._wwd = worldwindow;
            this._wwd.addLayer(new OpenStreetMapLayer(this._wwd))

            this._animator = new WorldWind.GoToAnimator(self._wwd);

            //this._animator.goTo(self._config.startPosition);

            var naturalLanguageHandler = new NaturalLanguageHandler(self._wwd);

            var routeLayer = new RouteLayer();

            this._wwd.addLayer(routeLayer);

            var renderableLayer = new WorldWind.RenderableLayer('Pins');

            this._wwd.addLayer(renderableLayer);

            //amenity = 'cafe';
            //address = 'mountain view';
            var routeLayerRouteBuilder = new (this.RouteBuilder(routeLayer));

            //var test = new OSMBuildingDataRetriever();
            ////Unit test for osm buildings
            //test.requestOSMBuildingData([37.14008, -122.33139, 37.64008, -121.83139],function(data){
            //    console.log(data)
            //});

            //var HudTest = new HUDMaker('test', [150,150] );

            //(function selectionDisplay () {
            //    $("<style>")
            //        .prop("type", "text/css")
            //        .html("\ #layDiv2 {\
            //              position: fixed;\
            //                width: 100px;\
            //                background-color: black;\
            //                height: 140px;\
            //                z-index: 1;\
            //                right: 78px;\
            //                bottom: 22px;\
            //            }")
            //        .appendTo("head");
            //    var infoDisplay = $('<div>')
            //    infoDisplay.attr('id', 'layDiv2');
            //    infoDisplay.css('background-color','white');
            //    var IMGOD = $('<img>')
            //    IMGOD.attr('src','img/pin.png')
            //    IMGOD.attr('width','44')
            //    IMGOD.attr('height','46')
            //
            //    IMGOD.attr('alt','Pin')
            //    IMGOD.attr('longdesc','img/pin.png')
            //    infoDisplay.on('click', function (ev) {
            //        IMGOD.remove()
            //    })
            //    infoDisplay.append(IMGOD)
            //    $('body').append(infoDisplay)
            //})();

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
                        var hudID = removeSpecials(returnedRenderable.amenity._amenity.split(' ').join(''));
                        var HudTest = new HUD(
                            hudID,
                            [returnedRenderable.clickedEvent.x,returnedRenderable.clickedEvent.y]
                        );
                        //Sixth, add this point to the route layer and see if it is enough to build a route.
                        routeLayerRouteBuilder.processPoint(pointOfRenderable);
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

            /*
            * Draws the desired route onto the layer this routebuilder is bound to.
            *
            * @param routeArray: an array of the form [fromLatitude, fromLongitude, toLatitude, toLongitude]
             */
            RouteBuilderMod.prototype.drawRoute = function (routeArray) {
                var routeBuilder = this;
                self.routeFinder.getRouteData(routeArray, function(routeData) {
                    //console.log('routeInformation : ', routeData);
                    routeBuilder.routeLayer.addRoute(routeData);
                });
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
                placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude, 1e2, true, null));
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
