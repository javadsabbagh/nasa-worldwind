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

    var wwd1 = new WorldWind.WorldWindow("canvasOne");
    wwd1.addLayer(new WorldWind.BMNGLandsatLayer());
    wwd1.addLayer(new WorldWind.BingWMSLayer());
    wwd1.redraw();

    var wwd2 = new WorldWind.WorldWindow("canvasTwo");
    wwd2.addLayer(new WorldWind.BMNGLandsatLayer());
    wwd2.addLayer(new WorldWind.BingWMSLayer());
    wwd2.redraw();

    var wwd3 = new WorldWind.WorldWindow("canvasThree");
    wwd3.addLayer(new WorldWind.BMNGLandsatLayer());
    wwd3.addLayer(new WorldWind.BingWMSLayer());
    wwd3.redraw();
});