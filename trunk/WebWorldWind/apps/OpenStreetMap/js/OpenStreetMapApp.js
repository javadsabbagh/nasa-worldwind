
/*
    This module acts as the application entry point
 */

define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapLayer',
        'OpenStreetMapConfig',
        'jquery',
        'OSMDataRetriever','RouteLayer','polyline'],
    function(ww,
             OpenStreetMapLayer,
             OpenStreetMapConfig,
             $,
             OSMDataRetriever, RouteLayer, polyline) {


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

            this._layers.forEach(function(layer) {
               self._wwd.addLayer(layer);
            });
            //TEST CODE FOR ROUTE
            $.get('http://router.project-osrm.org/viaroute?loc=52.503033,13.420526&loc=52.516582,13.429290&instructions=true',
                function(data){
                    var rr = polyline.decode(data["alternative_geometries"][0])
                    console.log(data['via_points'])
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
        }




        return OpenStreetMapApp;


});
