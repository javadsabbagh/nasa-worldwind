
/*
    This module acts as the application entry point
 */

define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapLayer',
        'OpenStreetMapConfig',
        'jquery',
        'OSMDataRetriever','RouteLayer','RouteAPIWrapper','NaturalLanguageHandler', 'polyline'],
    function(ww,
             OpenStreetMapLayer,
             OpenStreetMapConfig,
             $,
             OSMDataRetriever, RouteLayer, RAW, NaturalLanguageHandler, polyline) {


        'use strict';

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var OpenStreetMapApp = function() {
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
            /*
             var RaP = new RAW();
             var routeData;
             RaP.getRouteData(function(data){
             routeData = data;
             console.log(data)
             var goToRoute = new WorldWind.GoToAnimator(self._wwd)
             goToRoute.goTo(new WorldWind.Position(
             data['via_points'][0][0],
             data['via_points'][0][1],
             1e4
             ))
             var routeLayer = new RouteLayer();
             console.log(routeLayer)
             routeLayer.addRoute(data)
             self._wwd.addLayer(routeLayer);
             });
             */
            /*
             //TEST CODE FOR ROUTE
             $.get('http://router.project-osrm.org/viaroute?loc=42.036241,-88.345090&loc=42.025845,-88.341743&instructions=true',
             function(data){
             var rr = polyline.decode(data["route_geometry"])
             console.log(data)
             var goToRoute = new WorldWind.GoToAnimator(self._wwd)
             goToRoute.goTo(new WorldWind.Position(
             data['via_points'][0][0],
             data['via_points'][0][1],
             1e4
             ))
             var routeLayer = new RouteLayer();
             console.log(routeLayer)
             routeLayer.addRoute(data)
             self._wwd.addLayer(routeLayer);
             })
             */
            //42.00 -88.35 42.15 -88.2

            /*
             var TEST = new OSMDataRetriever();
             TEST.requestOSMData([42.00,-88.35,42.15,-88.2],'name',function(datam){
             console.log(datam);
             datam.features.forEach(function(nameX, index){
             console.log(index ,nameX.properties.tags.name ,nameX.geometry.coordinates[0], nameX.geometry.coordinates[1])
             })
             var arr = [
             datam.features[214].geometry.coordinates[1], datam.features[214].geometry.coordinates[0],
             datam.features[239].geometry.coordinates[1], datam.features[239].geometry.coordinates[0]
             ]
             console.log(arr)
             var RaP = new RAW();
             var routeData;
             RaP.getRouteData(function(data){
             routeData = data;
             console.log(data)
             var goToRoute = new WorldWind.GoToAnimator(self._wwd)
             goToRoute.goTo(new WorldWind.Position(
             data['via_points'][0][0],
             data['via_points'][0][1],
             1e4
             ))
             var routeLayer = new RouteLayer();
             console.log(routeLayer)
             routeLayer.addRoute(data)
             self._wwd.addLayer(routeLayer);
             },
             arr
             );

             })

             */
            var naturalLanguageTether = new NaturalLanguageHandler(self._wwd);
            var routeFinder = new RAW();
            naturalLanguageTether.receiveInput(['Starbucks','Near Me'],function(data){
                // Something to go to and draw directions.
                // Matt's House
                var defaultLoc = [42.0362415,-88.3450904];
                var routeArray = [
                    defaultLoc[0],
                    defaultLoc[1],
                    data.features[0].geometry.coordinates[1],
                    data.features[0].geometry.coordinates[0]]//defaultLoc.concat(data.features[0].geometry.coordinates)

                var callback = function(data){
                    var rr = polyline.decode(data["route_geometry"])
                    var goToRoute = new WorldWind.GoToAnimator(self._wwd)
                    goToRoute.goTo(new WorldWind.Position(
                        data['via_points'][0][0],
                        data['via_points'][0][1],
                        1e4
                    ))
                    var routeLayer = new RouteLayer();
                    console.log(routeLayer)
                    routeLayer.addRoute(data)
                    self._wwd.addLayer(routeLayer);
                }


                routeFinder.getRouteData(callback, routeArray)
            })





        }

        return OpenStreetMapApp;


});
