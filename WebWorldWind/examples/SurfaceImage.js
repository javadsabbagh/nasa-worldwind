/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates how to display and pick SurfaceImage.
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
        wwd.addLayer(new WorldWind.BMNGLandsatLayer()); // Blue Marble + Landsat
        wwd.addLayer(new WorldWind.BingWMSLayer()); // Bing
        wwd.addLayer(new WorldWind.CompassLayer);

        var surfaceImage = new WorldWind.SurfaceImage(new WorldWind.Sector(40, 50, -120, -100),
            "../images/400x230-splash-nww.png");

        // Add the surface image to a layer and the layer to the World Window's layer list.
        var surfaceImageLayer = new WorldWind.RenderableLayer();
        surfaceImageLayer.displayName = "Surface Image";
        surfaceImageLayer.addRenderable(surfaceImage);
        wwd.addLayer(surfaceImageLayer);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager('divLayerManager', wwd);

        // Now set up to handle picking.

        // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
        wwd.addEventListener("mousemove", function (e) {
            handlePick(e.clientX, e.clientY);
        });

        // Listen for taps on mobile devices and highlight the placemarks that the user taps.
        var tapRecognizer = new WorldWind.TapRecognizer(wwd);
        tapRecognizer.addGestureListener(function (recognizer) {
            var location = recognizer.location();
            handlePick(location[0], location[1]);
        });

        // The common pick-handling function.
        var handlePick = function (x, y) {
            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));

            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    if (pickList.objects[p].userObject instanceof WorldWind.SurfaceImage) {
                        console.log("Surface image picked");
                    }
                }
            }
        }
    });