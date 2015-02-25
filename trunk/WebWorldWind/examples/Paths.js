/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates how to display and pick Paths.
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

        var pathPositions = [];
        pathPositions.push(new WorldWind.Position(40, -100, 1e4));
        pathPositions.push(new WorldWind.Position(45, -110, 1e4));
        pathPositions.push(new WorldWind.Position(46, -122, 1e4));
        var path = new WorldWind.Path(pathPositions);
        path.altitudeMode = WorldWind.ABSOLUTE;
        path.followTerrain = false;

        var pathAttributes = new WorldWind.PathAttributes(null);
        pathAttributes.outlineColor = WorldWind.Color.BLUE;
        pathAttributes.interiorColor = new WorldWind.Color(0, 1, 1, 0.5);
        pathAttributes.drawVerticals = true;
        path.attributes = pathAttributes;
        var highlightAttributes = new WorldWind.PathAttributes(pathAttributes);
        highlightAttributes.outlineColor = WorldWind.Color.RED;
        highlightAttributes.interiorColor = new WorldWind.Color(1, 1, 1, 0.5);
        path.highlightAttributes = highlightAttributes;

        // Add the surface image to a layer and the layer to the World Window's layer list.
        var pathsLayer = new WorldWind.RenderableLayer();
        pathsLayer.displayName = "Paths";
        pathsLayer.addRenderable(path);
        wwd.addLayer(pathsLayer);

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

        var highlightedItems = [];

        // The common pick-handling function.
        var handlePick = function (x, y) {
            var redrawRequired = highlightedItems.length > 0; // must redraw if we de-highlight previously picked items

            // De-highlight any previously highlighted placemarks.
            for (var h = 0; h < highlightedItems.length; h++) {
                highlightedItems[h].highlighted = false;
            }
            highlightedItems = [];

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
            if (pickList.objects.length > 0) {
                redrawRequired = true;
            }

            // Highlight the items picked by simply setting their highlight flag to true.
            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    pickList.objects[p].userObject.highlighted = true;

                    // Keep track of highlighted items in order to de-highlight them later.
                    highlightedItems.push(pickList.objects[p].userObject);
                }
            }

            // Update the window if we changed anything.
            if (redrawRequired) {
                wwd.redraw(); // redraw to make the highlighting changes take effect on the screen
            }
        };
    });