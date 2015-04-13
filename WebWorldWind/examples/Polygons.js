/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates how to display and pick Polygons.
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
        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
            {layer: new WorldWind.CompassLayer(), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

        // Create a layer to hold the polygons.
        var polygonsLayer = new WorldWind.RenderableLayer();
        polygonsLayer.displayName = "Polygons";
        wwd.addLayer(polygonsLayer);

        // Define an outer and an inner boundary to make a polygon with a hole.
        var boundaries = [];
        boundaries[0] = []; // outer boundary
        boundaries[0].push(new WorldWind.Position(40, -100, 1e5));
        boundaries[0].push(new WorldWind.Position(45, -110, 1e5));
        boundaries[0].push(new WorldWind.Position(40, -120, 1e5));
        boundaries[1] = []; // inner boundary
        boundaries[1].push(new WorldWind.Position(41, -103, 1e5));
        boundaries[1].push(new WorldWind.Position(44, -110, 1e5));
        boundaries[1].push(new WorldWind.Position(41, -117, 1e5));

        // Create the polygon and assign its attributes.

        var polygon = new WorldWind.Polygon(boundaries);
        polygon.altitudeMode = WorldWind.ABSOLUTE;
        polygon.extrude = true; // extrude the polygon edges to the ground

        var polygonAttributes = new WorldWind.ShapeAttributes(null);
        polygonAttributes.drawInterior = true;
        polygonAttributes.drawOutline = true;
        polygonAttributes.outlineColor = WorldWind.Color.BLUE;
        polygonAttributes.interiorColor = new WorldWind.Color(0, 1, 1, 0.5);
        polygonAttributes.drawVerticals = polygon.extrude;
        polygon.attributes = polygonAttributes;
        var highlightAttributes = new WorldWind.ShapeAttributes(polygonAttributes);
        highlightAttributes.outlineColor = WorldWind.Color.RED;
        highlightAttributes.interiorColor = new WorldWind.Color(1, 1, 1, 0.5);
        polygon.highlightAttributes = highlightAttributes;

        // Add the polygon to the layer and the layer to the World Window's layer list.
        polygonsLayer.addRenderable(polygon);

        // Create a textured polygon with extruded and textured sides.
        boundaries = [];
        boundaries[0] = []; // outer boundary
        boundaries[0].push(new WorldWind.Position(40, -90, 1e5));
        boundaries[0].push(new WorldWind.Position(40, -80, 1e5));
        boundaries[0].push(new WorldWind.Position(45, -80, 1e5));
        boundaries[0].push(new WorldWind.Position(45, -90, 1e5));

        polygon = new WorldWind.Polygon(boundaries);
        polygon.altitudeMode = WorldWind.ABSOLUTE;
        polygon.extrude = true;
        polygon.textureCoordinates = [
            [new WorldWind.Vec2(0, 0), new WorldWind.Vec2(1, 0), new WorldWind.Vec2(1, 1), new WorldWind.Vec2(0, 1)]
        ];

        polygonAttributes = new WorldWind.ShapeAttributes(null);
        // Specify a texture for the polygon and its four extruded sides.
        polygonAttributes.imageSource = [
            "../images/400x230-splash-nww.png", // polygon texture image
            "../images/400x230-splash-nww.png", // first-side texture image
            "../images/400x230-splash-nww.png", // second-side texture image
            "../images/400x230-splash-nww.png", // third-side texture image
            "../images/400x230-splash-nww.png"  // fourth-side texture image
        ];
        polygonAttributes.drawInterior = true;
        polygonAttributes.drawOutline = true;
        polygonAttributes.outlineColor = WorldWind.Color.BLUE;
        polygonAttributes.interiorColor = WorldWind.Color.WHITE;
        polygonAttributes.drawVerticals = polygon.extrude;
        polygon.attributes = polygonAttributes;
        highlightAttributes = new WorldWind.ShapeAttributes(polygonAttributes);
        highlightAttributes.outlineColor = WorldWind.Color.RED;
        polygon.highlightAttributes = highlightAttributes;

        polygonsLayer.addRenderable(polygon);

        // Create a textured polygon with a hole in it. Don't extrude the sides.
        boundaries = [];
        boundaries[0] = []; // outer boundary
        boundaries[0].push(new WorldWind.Position(30, -100, 1e5));
        boundaries[0].push(new WorldWind.Position(30, -90, 1e5));
        boundaries[0].push(new WorldWind.Position(35, -90, 1e5));
        boundaries[0].push(new WorldWind.Position(35, -100, 1e5));
        boundaries[1] = []; // inner boundary
        boundaries[1].push(new WorldWind.Position(32, -96, 1e5));
        boundaries[1].push(new WorldWind.Position(32, -94, 1e5));
        boundaries[1].push(new WorldWind.Position(33, -94, 1e5));
        boundaries[1].push(new WorldWind.Position(33, -96, 1e5));

        polygon = new WorldWind.Polygon(boundaries);
        polygon.altitudeMode = WorldWind.ABSOLUTE;
        polygon.extrude = false;
        polygon.textureCoordinates = [
            [new WorldWind.Vec2(0, 0), new WorldWind.Vec2(1, 0), new WorldWind.Vec2(1, 1), new WorldWind.Vec2(0, 1)],
            [new WorldWind.Vec2(0.4, 0.4), new WorldWind.Vec2(0.6, 0.4), new WorldWind.Vec2(0.6, 0.6),
                new WorldWind.Vec2(0.4, 0.6)]
        ];

        polygonAttributes = new WorldWind.ShapeAttributes(null);
        polygonAttributes.imageSource = "../images/400x230-splash-nww.png";
        polygonAttributes.drawInterior = true;
        polygonAttributes.drawOutline = true;
        polygonAttributes.outlineColor = WorldWind.Color.BLUE;
        polygonAttributes.interiorColor = WorldWind.Color.WHITE;
        polygonAttributes.drawVerticals = polygon.extrude;
        polygon.attributes = polygonAttributes;
        highlightAttributes = new WorldWind.ShapeAttributes(polygonAttributes);
        highlightAttributes.outlineColor = WorldWind.Color.RED;
        polygon.highlightAttributes = highlightAttributes;

        polygonsLayer.addRenderable(polygon);

        // Create a textured polygon with a hole at the north pole. Extrude the boundaries but don't texture them.
        boundaries = [];
        boundaries[0] = []; // outer boundary
        boundaries[0].push(new WorldWind.Position(85, -45, 1e5));
        boundaries[0].push(new WorldWind.Position(85, +45, 1e5));
        boundaries[0].push(new WorldWind.Position(85, +135, 1e5));
        boundaries[0].push(new WorldWind.Position(85, -135, 1e5));
        boundaries[1] = []; // inner boundary
        boundaries[1].push(new WorldWind.Position(89, -45, 1e5));
        boundaries[1].push(new WorldWind.Position(89, +45, 1e5));
        boundaries[1].push(new WorldWind.Position(89, +135, 1e5));
        boundaries[1].push(new WorldWind.Position(89, -135, 1e5));

        polygon = new WorldWind.Polygon(boundaries);
        polygon.altitudeMode = WorldWind.ABSOLUTE;
        polygon.extrude = true;
        polygon.textureCoordinates = [
            [new WorldWind.Vec2(0, 0), new WorldWind.Vec2(1, 0), new WorldWind.Vec2(1, 1), new WorldWind.Vec2(0, 1)],
            [new WorldWind.Vec2(0.4, 0.4), new WorldWind.Vec2(0.6, 0.4), new WorldWind.Vec2(0.6, 0.6),
                new WorldWind.Vec2(0.4, 0.6)]
        ];

        polygonAttributes = new WorldWind.ShapeAttributes(null);
        polygonAttributes.imageSource = "../images/400x230-splash-nww.png";
        polygonAttributes.drawInterior = true;
        polygonAttributes.drawOutline = true;
        polygonAttributes.outlineColor = WorldWind.Color.BLUE;
        polygonAttributes.interiorColor = WorldWind.Color.WHITE;
        polygonAttributes.drawVerticals = polygon.extrude;
        polygon.attributes = polygonAttributes;
        highlightAttributes = new WorldWind.ShapeAttributes(polygonAttributes);
        highlightAttributes.outlineColor = WorldWind.Color.RED;
        polygon.highlightAttributes = highlightAttributes;

        polygonsLayer.addRenderable(polygon);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager('divLayerManager', wwd);

        // Now set up to handle picking.

        var highlightedItems = [];

        // The pick-handling callback function.
        var handlePick = function (o) {
            // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
            // the mouse or tap location.
            var x = o.clientX,
                y = o.clientY;

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

        // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
        wwd.addEventListener("mousemove", handlePick);

        // Listen for taps on mobile devices and highlight the placemarks that the user taps.
        var tapRecognizer = new WorldWind.TapRecognizer(wwd);
        tapRecognizer.addGestureListener(handlePick);
    });