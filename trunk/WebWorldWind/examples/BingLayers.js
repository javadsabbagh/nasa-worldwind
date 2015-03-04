/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Shows how to create and install the World Wind Bing layers.
 *
 * @version $Id$
 */

requirejs(['../src/WorldWind',
        './LayerManager/LayerManager'],
    function (ww,
              LayerManager) {
        "use strict";

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var wwd = new WorldWind.WorldWindow("canvasOne");

        // Add the Blue Marble layer.
        wwd.addLayer(new WorldWind.BMNGLayer());

        // Add the Bing Aerial layer but turn it off by default.
        var layer = new WorldWind.BingAerialLayer();
        layer.enabled = false;
        wwd.addLayer(layer);

        // Add the Bing Aerial with Labels layer and leave it on by default.
        wwd.addLayer(new WorldWind.BingAerialWithLabelsLayer());

        // Add the Bing Roads layer but turn it off by default.
        layer = new WorldWind.BingRoadsLayer();
        layer.enabled = false;
        wwd.addLayer(layer);

        // Add a compass.
        wwd.addLayer(new WorldWind.CompassLayer);

        wwd.redraw();

        var layerManger = new LayerManager('divLayerManager', wwd);
    });