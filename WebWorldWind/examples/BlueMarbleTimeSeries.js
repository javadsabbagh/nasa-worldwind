/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Displays a time series of the 12 months of Blue Marble imagery.
 *
 * @version $Id$
 */

requirejs(['../src/WorldWind',
        './LayerManager',
        './CoordinateController'],
    function (ww,
              LayerManager,
              CoordinateController) {
        "use strict";

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var wwd = new WorldWind.WorldWindow("canvasOne");

        // Use two layers to fade between.

        var layerANumber = 0, layerBNumber = 1,
            layerAOpacity = 1, layerBOpacity = 0;

        var layerA = new WorldWind.BlueMarbleLayer(null, WorldWind.BlueMarbleLayer.availableTimes[layerANumber]);
        var layerB = new WorldWind.BlueMarbleLayer(null, WorldWind.BlueMarbleLayer.availableTimes[layerBNumber]);
        layerA.opacity = layerAOpacity;
        layerB.opacity = layerBOpacity;
        wwd.addLayer(layerA);
        wwd.addLayer(layerB);

        // Create a compass and view controls.
        wwd.addLayer(new WorldWind.CompassLayer());
        wwd.addLayer(new WorldWind.ViewControlsLayer(wwd));

        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager(wwd);

        // Create a coordinate controller to update the coordinate overlay elements.
        var coordinateController = new CoordinateController(wwd);

        window.setInterval(function () {
            layerB.opacity += 0.5;

            if (layerB.opacity > 1) {
                // Swap layer B to layer A and use a new layer B.
                layerANumber = layerBNumber;
                layerBNumber = (layerBNumber + 1) % WorldWind.BlueMarbleLayer.availableTimes.length;
                layerA.opacity = 1;
                layerB.opacity = 0;
                layerA.time = WorldWind.BlueMarbleLayer.availableTimes[layerANumber];
                layerB.time = WorldWind.BlueMarbleLayer.availableTimes[layerBNumber];
            }

            wwd.redraw();

        }, 100);
    });