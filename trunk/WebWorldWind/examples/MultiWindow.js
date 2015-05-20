/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates the use of multiple World Windows on the same page.
 *
 * @version $Id$
 */

requirejs(['../src/WorldWind'], function () {
    "use strict";

    WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

    // Make a layer that shows a Path and is shared among the World Windows.
    var makePathLayer = function () {
        var pathAttributes = new WorldWind.ShapeAttributes(null);
        pathAttributes.interiorColor = WorldWind.Color.CYAN;
        pathAttributes.outlineColor= WorldWind.Color.BLUE;

        var pathPositions = [
            new WorldWind.Position(40, -100, 1e4),
            new WorldWind.Position(45, -110, 1e4),
            new WorldWind.Position(46, -122, 1e4)
        ];
        var path = new WorldWind.Path(pathPositions);
        path.attributes = pathAttributes;
        path.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
        path.followTerrain = true;

        var pathLayer = new WorldWind.RenderableLayer("Path Layer");
        pathLayer.addRenderable(path);

        return pathLayer;
    };

    var pathLayer = makePathLayer(),
        imageryLayer = new WorldWind.BingAerialWithLabelsLayer(null), // Create the shared imagery layer
        compassLayer;

    var wwd1 = new WorldWind.WorldWindow("canvasOne");
    wwd1.addLayer(imageryLayer);
    wwd1.addLayer(pathLayer);
    wwd1.addLayer(new WorldWind.ViewControlsLayer(wwd1));
    // Create a compass layer. Must have one compass layer per world window.
    compassLayer = new WorldWind.CompassLayer;
    compassLayer.compass.imageScale = 0.2;
    wwd1.addLayer(compassLayer);
    wwd1.redraw();

    var wwd2 = new WorldWind.WorldWindow("canvasTwo");
    wwd2.addLayer(imageryLayer);
    wwd2.addLayer(pathLayer);
    wwd2.addLayer(new WorldWind.ViewControlsLayer(wwd2));
    compassLayer = new WorldWind.CompassLayer;
    compassLayer.compass.imageScale = 0.2;
    wwd2.addLayer(compassLayer);
    wwd2.redraw();

    var wwd3 = new WorldWind.WorldWindow("canvasThree");
    wwd3.addLayer(imageryLayer);
    wwd3.addLayer(pathLayer);
    wwd3.addLayer(new WorldWind.ViewControlsLayer(wwd3));
    compassLayer = new WorldWind.CompassLayer;
    compassLayer.compass.imageScale = 0.2;
    wwd3.addLayer(compassLayer);
    wwd3.redraw();
});