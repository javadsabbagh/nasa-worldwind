
/*
    This module acts as the application entry point
 */

define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapLayer',
        'OpenStreetMapConfig',
        'jquery'],
    function(ww,
             OpenStreetMapLayer,
             OpenStreetMapConfig,
             $) {


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

        }


        return OpenStreetMapApp;




});
