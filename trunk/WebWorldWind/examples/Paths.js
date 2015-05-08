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
        './LayerManager',
        './CoordinateController'],
    function (ww,
              LayerManager,
              CoordinateController) {
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

        var pathPositions = [];
        pathPositions.push(new WorldWind.Position(40, -100, 1e4));
        pathPositions.push(new WorldWind.Position(45, -110, 1e4));
        pathPositions.push(new WorldWind.Position(46, -122, 1e4));
        var path = new WorldWind.Path(pathPositions);
        path.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
        path.followTerrain = true;
        path.extrude = true;
        path.useSurfaceShapeFor2D = true;

        var pathAttributes = new WorldWind.ShapeAttributes(null);
        pathAttributes.outlineColor = WorldWind.Color.BLUE;
        pathAttributes.interiorColor = new WorldWind.Color(0, 1, 1, 0.5);
        pathAttributes.drawVerticals = path.extrude; // draw verticals only when extruding
        path.attributes = pathAttributes;
        var highlightAttributes = new WorldWind.ShapeAttributes(pathAttributes);
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
        var layerManger = new LayerManager(wwd);

        // Create a coordinate controller to update the coordinate overlay elements.
        var coordinateController = new CoordinateController(wwd);

        // Now set up to handle highlighting.
        var highlightController = new WorldWind.HighlightController(wwd);
    });