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
        wwd.addLayer(new WorldWind.BMNGLandsatLayer()); // Blue Marble + Landsat
        wwd.addLayer(new WorldWind.BingWMSLayer()); // Bing
        
        var shapesLayer = new WorldWind.RenderableLayer("Surface Shapes"),
            shapeAttributes = new WorldWind.ShapeAttributes(null);

        // Set up the common shape attributes.
        shapeAttributes.imageScale = 1;
        shapeAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 0.0);
        shapeAttributes.imageColor = WorldWind.Color.WHITE;
        shapeAttributes.outlineWidth = 100000; // 100 km

        // Set up some shape attributes to customize for the next shape.
        shapeAttributes.interiorColor = WorldWind.Color.RED;
        shapeAttributes.outlineColor = WorldWind.Color.BLUE;

        // Create a polygon that contains the north pole.
        var shapeBoundariesSeattleLondonTokyo = [
            new WorldWind.Location(47.592830, -122.331506), // Seattle
            new WorldWind.Location(51.510483, -0.115675), // London
            new WorldWind.Location(35.687008, 139.772529) // Tokyo
        ];
        var surfacePolygonSeattleLondonTokyo = new WorldWind.SurfacePolygon(shapeBoundariesSeattleLondonTokyo,
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfacePolygonSeattleLondonTokyo);

        // Set up some shape attributes to customize for the next shape.
        shapeAttributes.interiorColor = WorldWind.Color.GREEN;
        shapeAttributes.outlineColor = WorldWind.Color.CYAN;
        shapeAttributes.outlineStipplePattern = 0x663c; // A ".._" pattern.
        shapeAttributes.outlineStippleFactor = 0.25; // Tighten the dot spacing.

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
        shapeAttributes.outlineWidth = 1000;
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

        // Create a 1000x2000 rectangle near the south pole.
        var surfaceRectangleAntarctica = new WorldWind.SurfaceRectangle(new WorldWind.Location(-88, 45), 1000000, 2000000,
            new WorldWind.ShapeAttributes(shapeAttributes));
        shapesLayer.addRenderable(surfaceRectangleAntarctica);

        // Add the shapes layer to the World Window's layer list.
        wwd.addLayer(shapesLayer);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager('divLayerManager', wwd);
    });