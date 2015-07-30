/**
 * Created by Matthew on 7/29/2015.
 */

define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapConfig'],
    function(ww,
             OpenStreetMapConfig){
    'use strict';

    WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

    var WorldWindBase = function ( window ) {
        var newBody = $('<canvas>');
        newBody.attr('id', 'globe');
        $('body').append(newBody);

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
//new OpenStreetMapLayer(this._wwd),
        this._layers = [
            new WorldWind.CompassLayer(this._wwd), new WorldWind.ViewControlsLayer(this._wwd)];

        this._layers.forEach(function (layer) {
            self._wwd.addLayer(layer);
        });

        // add this to the global namespace for the form to play with.
        return this._wwd
    }


    return WorldWindBase
})