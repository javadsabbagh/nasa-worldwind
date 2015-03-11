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
            shapeAttributes = new WorldWind.ShapeAttributes(null),
            highlightShapeAttributes;

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

        highlightShapeAttributes = new WorldWind.ShapeAttributes(shapeAttributes);
        highlightShapeAttributes.interiorColor = WorldWind.Color.WHITE;
        surfacePolygonVancouverLondonTokyo.highlightAttributes = highlightShapeAttributes;

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

        highlightShapeAttributes = new WorldWind.ShapeAttributes(shapeAttributes);
        highlightShapeAttributes.interiorColor = WorldWind.Color.WHITE;
        surfacePolygonManilaLaSydney.highlightAttributes = highlightShapeAttributes;

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

        highlightShapeAttributes = new WorldWind.ShapeAttributes(shapeAttributes);
        highlightShapeAttributes.interiorColor = WorldWind.Color.WHITE;
        surfaceCircleMiami.highlightAttributes = highlightShapeAttributes;

        shapesLayer.addRenderable(surfaceCircleMiami);

        // Create a sector that corresponds to the state of Colorado.
        var surfaceSectorColorado = new WorldWind.SurfaceSector(new WorldWind.Sector(37, 41, -109, -102),
            new WorldWind.ShapeAttributes(shapeAttributes));

        highlightShapeAttributes = new WorldWind.ShapeAttributes(shapeAttributes);
        highlightShapeAttributes.interiorColor = WorldWind.Color.WHITE;
        surfaceSectorColorado.highlightAttributes = highlightShapeAttributes;

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

        highlightShapeAttributes = new WorldWind.ShapeAttributes(shapeAttributes);
        highlightShapeAttributes.interiorColor = WorldWind.Color.WHITE;
        surfaceRectangleAntarctica.highlightAttributes = new WorldWind.ShapeAttributes(highlightShapeAttributes);

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
        shapeAttributes.outlineColor = WorldWind.Color.YELLOW;
        surfacePolygonSeattleCenter.highlightAttributes = new WorldWind.ShapeAttributes(shapeAttributes);
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
        shapeAttributes.outlineColor = WorldWind.Color.YELLOW;
        surfaceRectangleKeyArena.highlightAttributes = new WorldWind.ShapeAttributes(shapeAttributes);
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
        shapeAttributes.outlineColor = WorldWind.Color.YELLOW;
        surfaceCircleSpaceNeedle.highlightAttributes = new WorldWind.ShapeAttributes(shapeAttributes);
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

        var shapesCirclePerfLayer = new WorldWind.RenderableLayer("SurfaceCircle Perf Test");
        perfTestBullseyes(shapesCirclePerfLayer);
        wwd.addLayer(shapesCirclePerfLayer);

        var shapesRectanglePerfLayer = new WorldWind.RenderableLayer("SurfaceRectangle Perf Test");
        perfTestSpiral(shapesRectanglePerfLayer);
        wwd.addLayer(shapesRectanglePerfLayer);

        var shapesPolygonPerfLayer = new WorldWind.RenderableLayer("SurfacePolygon Perf Test");
        perfTestSponge(shapesPolygonPerfLayer);
        wwd.addLayer(shapesPolygonPerfLayer);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager('divLayerManager', wwd);

        var firstX = -1,
            firstY = -1;

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
                    var shape = pickList.objects[p].userObject;
                    shape.highlighted = !shape.highlighted;
                }

                // Update the window.
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
    },

    perfTestBullseyes = function(layer) {
        var center = new WorldWind.Location(39.883635, -98.545936);

        var shapeAttributesRed = new WorldWind.ShapeAttributes(null);
        shapeAttributesRed.interiorColor = WorldWind.Color.RED;

        var shapeAttributesWhite = new WorldWind.ShapeAttributes(null);
        shapeAttributesWhite.interiorColor = WorldWind.Color.WHITE;

        var shapeAttributesYellow = new WorldWind.ShapeAttributes(null);
        shapeAttributesYellow.interiorColor = WorldWind.Color.YELLOW;

        var isRed = true,
            numCircles = 0;

        for (var radius = 1000000; radius > 10; radius *= 0.75) {
            var shapeCircle;
            if (isRed) {
                shapeCircle = new WorldWind.SurfaceCircle(center, radius, shapeAttributesRed);
                shapeCircle.highlightAttributes = shapeAttributesYellow;
            }
            else {
                shapeCircle = new WorldWind.SurfaceCircle(center, radius, shapeAttributesWhite);
                shapeCircle.highlightAttributes = shapeAttributesYellow;
            }
            layer.addRenderable(shapeCircle);

            isRed = !isRed;
            numCircles += 1;
        }

        // For debugging only.
        // console.log("Number of shapeCircles generated: " + numCircles.toString());
    },

    perfTestSpiral = function(layer) {
        var center = new WorldWind.Location(20.395127, -170.264684);

        var shapeAttributesRed = new WorldWind.ShapeAttributes(null);
        shapeAttributesRed.interiorColor = WorldWind.Color.RED;
        shapeAttributesRed.outlineColor = WorldWind.Color.BLACK;
        shapeAttributesRed.outlineWidth = 1;

        var shapeAttributesWhite = new WorldWind.ShapeAttributes(null);
        shapeAttributesWhite.interiorColor = WorldWind.Color.WHITE;
        shapeAttributesWhite.outlineColor = WorldWind.Color.BLACK;
        shapeAttributesWhite.outlineWidth = 1;

        var shapeAttributesYellow = new WorldWind.ShapeAttributes(null);
        shapeAttributesYellow.interiorColor = WorldWind.Color.YELLOW;

        var isRed = true,
            heading = 0;

        var numRectangles = 0;

        for (var radius = 5000000; radius > 10; radius *= 0.85) {
            var shapeRectangle;
            if (isRed) {
                shapeRectangle = new WorldWind.SurfaceRectangle(center, radius, radius, shapeAttributesRed);
                shapeRectangle.highlightAttributes = shapeAttributesYellow;
                shapeRectangle.heading = heading;
            }
            else {
                shapeRectangle = new WorldWind.SurfaceRectangle(center, radius, radius, shapeAttributesWhite);
                shapeRectangle.highlightAttributes = shapeAttributesYellow;
                shapeRectangle.heading = heading;
            }
            layer.addRenderable(shapeRectangle);

            isRed = !isRed;
            heading += 10;
            numRectangles += 1;
        }

        // For debugging only.
        // console.log("Number of ShapeEllipse generated: " + numRectangles.toString());
    },

    perfTestSponge = function(layer) {
        var shapeAttributesRed = new WorldWind.ShapeAttributes(null);
        shapeAttributesRed.interiorColor = WorldWind.Color.RED;
        shapeAttributesRed.outlineColor = WorldWind.Color.BLACK;
        shapeAttributesRed.outlineWidth = 1;

        var shapeAttributesWhite = new WorldWind.ShapeAttributes(null);
        shapeAttributesWhite.interiorColor = WorldWind.Color.WHITE;
        shapeAttributesWhite.outlineColor = WorldWind.Color.BLACK;
        shapeAttributesWhite.outlineWidth = 1;

        var shapeAttributesYellow = new WorldWind.ShapeAttributes(null);
        shapeAttributesYellow.interiorColor = WorldWind.Color.YELLOW;

        perfTestSpongeStep(layer, 6,
            new WorldWind.Location(28.047267, -75.841301),
            new WorldWind.Location(24.701435, -56.791009),
            new WorldWind.Location(38.440259, -62.855462),
            shapeAttributesRed, shapeAttributesWhite, shapeAttributesYellow);
    },

    perfTestSpongeStep = function(layer, depth, location0, location1, location2, shapeAttributeEven, shapeAttributeOdd, shapeAttributeHighlight) {
        var shapeBoundary = [
            location0,
            location1,
            location2
        ];

        var shapePolygon = new WorldWind.SurfacePolygon(shapeBoundary, shapeAttributeEven);
        shapePolygon.highlightAttributes = shapeAttributeHighlight;

        layer.addRenderable(shapePolygon);

        if (depth < 0) {
            return;
        }

        var location01 = new WorldWind.Location(0, 0),
            location12 = new WorldWind.Location(0, 0),
            location20 = new WorldWind.Location(0, 0);

        WorldWind.Location.interpolateGreatCircle(0.5, location0, location1, location01);
        WorldWind.Location.interpolateGreatCircle(0.5, location1, location2, location12);
        WorldWind.Location.interpolateGreatCircle(0.5, location2, location0, location20);

        perfTestSpongeStep(layer, depth - 1, location0, location01, location20, shapeAttributeOdd, shapeAttributeEven, shapeAttributeHighlight);
        perfTestSpongeStep(layer, depth - 1, location1, location12, location01, shapeAttributeOdd, shapeAttributeEven, shapeAttributeHighlight);
        perfTestSpongeStep(layer, depth - 1, location2, location20, location12, shapeAttributeOdd, shapeAttributeEven, shapeAttributeHighlight);
    }
);
