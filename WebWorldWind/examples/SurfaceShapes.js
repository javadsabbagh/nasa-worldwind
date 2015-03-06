/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates how to display SurfaceShapes.
 *
 * @version $Id$
 */

requirejs([
        '../src/WorldWind',
        './LayerManager/LayerManager'
    ],
    function (ww,
              LayerManager) {
        "use strict";

        // Tell World Wind to log only warnings.
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
            {layer: new WorldWind.CompassLayer(), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }
        
        var shapesLayer = new WorldWind.RenderableLayer("Surface Shapes"),
            shapeAttributes = new WorldWind.ShapeAttributes(null);

        // Set up the common shape attributes.
        shapeAttributes.imageScale = 1;
        shapeAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 0.0);
        shapeAttributes.imageColor = WorldWind.Color.WHITE;
        shapeAttributes.outlineWidth = 2;

        // Set up some shape attributes to customize for the next shape.
        shapeAttributes.interiorColor = WorldWind.Color.RED;
        shapeAttributes.outlineColor = WorldWind.Color.BLUE;

        // Create a polygon that contains the north pole.
        var shapeBoundariesVancouverLondonTokyo = [
            new WorldWind.Location(49.195599, -123.193309), // Vancouver
            new WorldWind.Location(51.510483, -0.115675), // London
            new WorldWind.Location(35.549284, 139.779834) // Tokyo
        ];
        var surfacePolygonVancouverLondonTokyo = new WorldWind.SurfacePolygon(shapeBoundariesVancouverLondonTokyo,
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfacePolygonVancouverLondonTokyo);

        // Set up some shape attributes to customize for the next shape.
        shapeAttributes.interiorColor = WorldWind.Color.GREEN;
        shapeAttributes.outlineColor = WorldWind.Color.RED;
        shapeAttributes.outlineStipplePattern = 0x663c; // A ".._" pattern.
        shapeAttributes.outlineStippleFactor = 1;

        // Create a polygon that straddles the ante-meridian.
        var shapeBoundariesManilaLaSydney = [
            new WorldWind.Location(14.597656, 120.980476), // Manila
            new WorldWind.Location(34.054070, -118.217412), // LA
            new WorldWind.Location(-33.869823, 151.204867) // Sydney
        ];
        var surfacePolygonManilaLaSydney = new WorldWind.SurfacePolygon(shapeBoundariesManilaLaSydney,
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfacePolygonManilaLaSydney);

        // Set up some shape attributes to customize for the next shape.
        shapeAttributes.interiorColor = WorldWind.Color.GREEN;
        shapeAttributes.outlineColor = WorldWind.Color.RED;
        shapeAttributes.outlineWidth = 1;
        shapeAttributes.outlineStipplePattern = 0xffff;
        shapeAttributes.outlineStippleFactor = 1;

        // Create a 10 km circle centered on Miami.
        var surfaceCircleMiami = new WorldWind.SurfaceCircle(new WorldWind.Location(25.769185, -80.194173), 10000,
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfaceCircleMiami);

        // Create a sector that corresponds to the state of Colorado.
        var surfaceSectorColorado = new WorldWind.SurfaceSector(new WorldWind.Sector(37, 41, -109, -102),
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfaceSectorColorado);

        // Set up some shape attributes to customize for the next shape.
        shapeAttributes.interiorColor = WorldWind.Color.BLUE;
        shapeAttributes.outlineColor = WorldWind.Color.BLACK;
        shapeAttributes.outlineWidth = 1;
        shapeAttributes.outlineStipplePattern = 0xffff;
        shapeAttributes.outlineStippleFactor = 1;

        // Create a 1000x2000 rectangle near the south pole.
        var surfaceRectangleAntarctica = new WorldWind.SurfaceRectangle(new WorldWind.Location(-88, 45), 1000000, 2000000,
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfaceRectangleAntarctica);

        //
        // A more elaborate example with overlapping shapes: the Seattle Center.
        //

        // Set up some shape attributes to outline the Seattle Center.
        shapeAttributes.outlineColor = WorldWind.Color.WHITE;
        shapeAttributes.drawInterior = false;
        shapeAttributes.outlineWidth = 2;
        shapeAttributes.outlineStipplePattern = 0x3333;
        shapeAttributes.outlineStippleFactor = 1;

        var shapeBoundarySeattleCenter = [
            new WorldWind.Location(47.624551, -122.354006),
            new WorldWind.Location(47.624551, -122.348942),
            new WorldWind.Location(47.623350, -122.348942),
            new WorldWind.Location(47.623350, -122.347655),
            new WorldWind.Location(47.620718, -122.347655),
            new WorldWind.Location(47.618592, -122.350380),
            new WorldWind.Location(47.618621, -122.352890),
            new WorldWind.Location(47.620921, -122.352805),
            new WorldWind.Location(47.620935, -122.354092),
            new WorldWind.Location(47.619764, -122.354178),
            new WorldWind.Location(47.619793, -122.355444),
            new WorldWind.Location(47.623293, -122.355444),
            new WorldWind.Location(47.623264, -122.354092)
        ];
        var surfacePolygonSeattleCenter = new WorldWind.SurfacePolygon(shapeBoundarySeattleCenter, new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfacePolygonSeattleCenter);

        // Shape attributes for the Key Arena.
        shapeAttributes.outlineColor = WorldWind.Color.RED;
        shapeAttributes.drawInterior = false;
        shapeAttributes.outlineWidth = 1;
        shapeAttributes.outlineStipplePattern = 0xffff;
        shapeAttributes.outlineStippleFactor = 0;

        // Create a rectangle around Key Arena.
        var surfaceRectangleKeyArena = new WorldWind.SurfaceRectangle(new WorldWind.Location(47.622105, -122.354009), 125, 125,
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfaceRectangleKeyArena);

        // Shape attributes for the Space Needle.
        shapeAttributes.outlineColor = WorldWind.Color.GREEN;
        shapeAttributes.drawInterior = false;
        shapeAttributes.outlineWidth = 1;
        shapeAttributes.outlineStipplePattern = 0xffff;
        shapeAttributes.outlineStippleFactor = 0;

        // Create a 30m circle around the Space Needle in Seattle.
        var surfaceCircleSpaceNeedle = new WorldWind.SurfaceCircle(new WorldWind.Location(47.620504, -122.349277), 30,
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfaceCircleSpaceNeedle);

        // Set up some shape attributes to customize for the next shape.
        shapeAttributes.lineWidth = 8;
        shapeAttributes.outlineColor = WorldWind.Color.WHITE;

        var shapePolyline = [
            new WorldWind.Location(-45, -90),
            new WorldWind.Location(45, 90)
        ];
        var surfacePolylineSpanTheGlobe = new WorldWind.SurfacePolyline(shapePolyline, new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfacePolylineSpanTheGlobe);

        // Add the shapes layer to the World Window's layer list.
        wwd.addLayer(shapesLayer);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager('divLayerManager', wwd);

        var firstX = -1,
            firstY = -1;

        var indicateShape = function(shape) {
            var kindOfShape;
            if (shape instanceof WorldWind.SurfaceCircle) {
                kindOfShape = "A surface circle";
            }
            else if (shape instanceof WorldWind.SurfaceEllipse) {
                kindOfShape = "A surface ellipse";
            }
            else if (shape instanceof WorldWind.SurfacePolygon) {
                kindOfShape = "A surface polygon";
            }
            else if (shape instanceof WorldWind.SurfacePolyline) {
                kindOfShape = "A surface polyline";
            }
            else if (shape instanceof WorldWind.SurfaceRectangle) {
                kindOfShape = "A surface rectangle";
            }
            else if (shape instanceof WorldWind.SurfaceSector) {
                kindOfShape = "A surface sector";
            }
            else {
                kindOfShape = "No shape";
            }

            alert(kindOfShape + " was picked!");
        };

        var handleMouseUp = function (o) {
            // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
            // the mouse or tap location.
            var x = o.clientX,
                y = o.clientY;

            if (x != firstX || y != firstY) {
                return;
            }

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var pickPoint = wwd.canvasCoordinates(x, y);

            var pickList = wwd.pick(pickPoint);

            // Highlight the items picked.
            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    indicateShape(pickList.objects[p].userObject);
                }
            }
            else {
                indicateShape(null);
            }

            // Update the window if we changed anything.
            if (pickList.objects.length > 0) {
                wwd.redraw();
            }
        };

        var handleMouseDown = function(o) {
            firstX = o.clientX;
            firstY = o.clientY;
        };

        var handlePick = function(o) {
            firstX = o.clientX;
            firstY = o.clientY;

            handleMouseUp(o);
        };

        // Listen for mouse  and swap the colors of the shape outline and interior.
        wwd.addEventListener("mouseup", handleMouseUp);
        wwd.addEventListener("mousedown", handleMouseDown);

        // Listen for taps on mobile devices and highlight the placemarks that the user taps.
        var tapRecognizer = new WorldWind.TapRecognizer(wwd);
        tapRecognizer.addGestureListener(handlePick);
    });