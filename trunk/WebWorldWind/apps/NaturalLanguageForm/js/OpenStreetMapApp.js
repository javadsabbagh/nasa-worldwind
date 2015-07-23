
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
        'MapQuestGeocoder'],
    function(ww,
             OpenStreetMapLayer,
             OpenStreetMapConfig,
             $,
             OSMDataRetriever, RouteLayer, Route, RouteAPIWrapper, NaturalLanguageHandler, polyline, MapQuestGeocoder) {


        'use strict';

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var OpenStreetMapApp = function(amenity, address) {
            var self = this;

            this._config = new OpenStreetMapConfig();
            
            /*
             Changes the size of the canvas that renders the world wind globe
             */
            $(this._config.canvasIDString).
                attr('width',
                this._config.canvasWidth);
            $(this._config.canvasIDString).
                attr('height',
                this._config.canvasHeight);

            this._wwd = new WorldWind.WorldWindow(this._config.canvasName);

            this._layers = [new OpenStreetMapLayer(this._wwd),
                new WorldWind.CompassLayer(this._wwd), new WorldWind.ViewControlsLayer(this._wwd)];

            this._layers.forEach(function (layer) {
                self._wwd.addLayer(layer);
            });

            var self = this;

            this._animator = new WorldWind.GoToAnimator(self._wwd);

            //this._animator.goTo(self._config.startPosition);

            var naturalLanguageHandler = new NaturalLanguageHandler(self._wwd);

            var routeLayer = new RouteLayer();

            this._wwd.addLayer(routeLayer);

            var routeFinder = new RouteAPIWrapper();

            var renderableLayer = new WorldWind.RenderableLayer('Pins');

            this._wwd.addLayer(renderableLayer);

            //This also handles Highlighting for the renderable layer.
            function listenForHighlight(o){
                var worldWindow = self._wwd,
                    highlightedItems = [];
                // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
                // the mouse or tap location.
                var x = o.clientX,
                    y = o.clientY;
                var redrawRequired = renderableLayer.renderables.length > 0; // must redraw if we de-highlight previous shapes
                // De-highlight any previously highlighted shapes.
                renderableLayer.renderables.forEach(function(renderable){
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
            }

            /*
             Calls the callback with the amenity associated with the highlighted placemark as a parameter.
             */
            function waitForSelect(callback) {
                var scopedCallback = callback;
                //Create a highlightcontroller
                self._wwd.addEventListener('mousemove', listenForHighlight);
                //Create the route selection
                self._wwd.addEventListener('mousedown', function(o){
                    console.log(o);
                    console.log('Click Detected');
                    var res;
                    renderableLayer.renderables.forEach(function(renderable){
                        if (renderable.highlighted){
                            console.log(renderable);
                            res =  renderable.amenity;
                            return
                        }
                    });
                    console.log(res);
                    scopedCallback(res)
                });
            }

            /*
            Puts placemarks on the map for each amenity with the name of the amenity as a name. This binds each
                amenity to the corrosponding renderable in <renderable>.amenity

            @param arrayofamenities: the array of amenities returned from the OSM call.
             */
            function buildPlacemarkLayer(arrayofamenities) {
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
                    placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude, 1e2), true, null);
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
            }

            function processUserInput(specs, data) {
                console.log(specs);
                console.log(data);
                var fromLatitude = specs.startPosition[0];
                var fromLongitude = specs.startPosition[1];

                buildPlacemarkLayer(data);

                /*
                Calls the function once the user clicks on a placemark. It then calls the OSRM to find the route to
                    that placemark from the start location and displays it once it is returned.
                 */
                waitForSelect(function(returnedData){
                    console.log('Selection Occured');
                    if (returnedData){
                        routeLayer.removeAllRenderables();
                        var toLocation = returnedData.location;
                        var toLatitude = toLocation.latitude;
                        var toLongitude = toLocation.longitude;
                        var locationArray = [fromLatitude, fromLongitude, toLatitude, toLongitude];
                        routeFinder.getRouteData(locationArray, function(routeData) {
                            console.log('routeInformation : ', routeData);
                            routeLayer.addRoute(routeData);
                        });
                    }
                })
            }

            //var address = 'Piazza Leonardo da Vinci, 32, 20133 Milano, Italy';
            //
            //var amenityType = 'cafe';

            function callGeocoder(amenityType, address) {

                var geocoder = new MapQuestGeocoder();
                geocoder.getLatitudeAndLong(address, function(location) {
                    console.log('Como, Italy is at');
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

                    naturalLanguageHandler.receiveInput(specs, processUserInput);

                });

            }

            callGeocoder('cafe', address);


        };

        return OpenStreetMapApp;


});


///*
//
// naturalLanguageHandler.receiveInput(['Near Me', 'name', 'Wallmart'], function(data) {
//
// // Something to go to and draw directions.
// // Matt's House
// var defaultLoc = [42.0362415,-88.3450904];
//
// // Create a layer to draw routes on.
// var routeLayer = new RouteLayer();
//
// // initData initialized. This is so that the BoundingBox can be added
// //          as a property of the data for use later.
// var initData = data;
//
// // If there is ONE place returned, this draws a route to it.
// // The NLH should filter this data.features to one entry.
// // Check if data is returned.
// if (data.features) {
//
// // If data is returned, check if any features in data.features.
// if (data.features.length != 0) {
//
// // This array contains the start point and end point of the route.
// // Currently the array ALWAYS starts at Matt's house.
// // The destination changes based on the data returned.
// var routeArray = [
// defaultLoc[0],
// defaultLoc[1],
// data.features[0].geometry.coordinates[1],
// data.features[0].geometry.coordinates[0]];
//
// /* Creates a callback function that goes to the position of the route drawn. This gets
// *        called when the route polyline is returned from the routing API.
// *
// * @param data: Data is the return from the Routing API. See that for structure.
// **/
//
//var callback = function (data) {
//    var goToRoute = new WorldWind.GoToAnimator(self._wwd);
//    goToRoute.goTo(new WorldWind.Position(
//        data['via_points'][0][0],
//        data['via_points'][0][1],
//        1e4
//    ));
//
//    routeLayer.addRoute(data);
//}
//
//}
//
//routeFinder.getRouteData(callback, routeArray)
//}
//
//// Polyline for the bounding box to be drawn.
//var drawBox = [
//    [initData.boundingBox[0], initData.boundingBox[1]],
//    [initData.boundingBox[0], initData.boundingBox[3]],
//    [initData.boundingBox[2], initData.boundingBox[3]],
//    [initData.boundingBox[2], initData.boundingBox[1]],
//    [initData.boundingBox[0], initData.boundingBox[1]]
//];
//// Either way, if a feature is returned or not, draw the bounding box.
//routeLayer.addRoutesByPolyline(drawBox);
//self._wwd.addLayer(routeLayer);
//})
//
// */