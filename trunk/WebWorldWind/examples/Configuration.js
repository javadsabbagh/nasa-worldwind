/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates the World Wind configuration options and how to set them. In order to have an effect, most configuration
 * options must be set before creating a World Window or any other World Wind object.
 *
 * @version $Id$
 */

requirejs(['../src/WorldWind',
        './LayerManager/LayerManager'],
    function (ww,
              LayerManager) {
        "use strict";

        // Configure the logging level.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Configure the amount of GPU memory to use.
        WorldWind.configuration.gpuCacheSize = 500e6; // 500 MB

        // Create a World Window and some layers to display.
        var wwd = new WorldWind.WorldWindow("canvasOne");
        wwd.addLayer(new WorldWind.BMNGOneImageLayer());
        wwd.addLayer(new WorldWind.BMNGLandsatLayer());
        wwd.addLayer(new WorldWind.BingWMSLayer());
        wwd.redraw();

        // Create a layer manager to control layer visibility.
        var layerManger = new LayerManager('divLayerManager', wwd);
    });