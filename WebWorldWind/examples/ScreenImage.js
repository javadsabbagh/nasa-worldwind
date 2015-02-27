/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates how to display and pick ScreenImage.
 *
 * @version $Id$
 */

requirejs(['../src/WorldWind',
        './LayerManager/LayerManager'],
    function (ww,
              LayerManager) {
        "use strict";

        // Tell World Wind to log only warnings and errors.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Create the World Window.
        var wwd = new WorldWind.WorldWindow("canvasOne");

        /**
         * Added imagery layers.
         */
        wwd.addLayer(new WorldWind.BMNGOneImageLayer());
        wwd.addLayer(new WorldWind.BMNGLandsatLayer()); // Blue Marble + Landsat
        wwd.addLayer(new WorldWind.BingWMSLayer()); // Bing
        wwd.addLayer(new WorldWind.CompassLayer);

        var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 1, WorldWind.OFFSET_FRACTION, 0);
        var screenImage = new WorldWind.ScreenImage(screenOffset, "../images/400x230-splash-nww.png");
        screenImage.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 1, WorldWind.OFFSET_FRACTION, 0);
        screenImage.imageScale = 0.3;

        // Add the screen image to a layer and the layer to the World Window's layer list.
        var screenImageLayer = new WorldWind.RenderableLayer();
        screenImageLayer.displayName = "Screen Image";
        screenImageLayer.addRenderable(screenImage);
        wwd.addLayer(screenImageLayer);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager('divLayerManager', wwd);

        // Now set up to handle picking.

        // The common pick-handling function.
        var handlePick = function (o) {
            // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
            // the mouse or tap location.
            var x = o.clientX,
                y = o.clientY;

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));

            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    if (pickList.objects[p].userObject instanceof WorldWind.Compass) {
                        wwd.navigator.heading = 0;
                        wwd.redraw();
                    }
                    else if (pickList.objects[p].userObject instanceof WorldWind.ScreenImage) {
                        console.log("Screen image picked");
                    }
                }
            }
        }

        // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
        wwd.addEventListener("mousemove", handlePick);

        // Listen for taps on mobile devices and highlight the placemarks that the user taps.
        var tapRecognizer = new WorldWind.TapRecognizer(wwd);
        tapRecognizer.addGestureListener(handlePick);
    });