/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates how to display text at screen positions. Uses offsets to align the text relative to its position.
 *
 * @version $Id$
 */

requirejs(['../src/WorldWind',
        './LayerManager/LayerManager'],
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
            {layer: new WorldWind.BingAerialWithLabelsLayer(), enabled: true},
            {layer: new WorldWind.CompassLayer(), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

        var screenText,
            textAttributes = new WorldWind.TextAttributes(null),
            textLayer = new WorldWind.RenderableLayer("Screen Text"),
            canvasWidth = wwd.canvas.width,
            canvasHeight = wwd.canvas.height;

        // Set up the common text attributes.
        textAttributes.color = WorldWind.Color.YELLOW;

        // Create a screen text shape and its attributes.
        screenText = new WorldWind.ScreenText(new WorldWind.Vec2(0, 0), "Upper Left");
        textAttributes = new WorldWind.TextAttributes(textAttributes);
        // Use offset to position the upper left corner of the text string at the shape's screen position (0, 0).
        textAttributes.offset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 1);
        screenText.attributes = textAttributes;
        textLayer.addRenderable(screenText);

        screenText = new WorldWind.ScreenText(new WorldWind.Vec2(0, canvasHeight), "Lower Left");
        textAttributes = new WorldWind.TextAttributes(textAttributes);
        // Use offset to position the lower left corner of the text string at the shape's screen position (0, height).
        textAttributes.offset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 0);
        screenText.attributes = textAttributes;
        textLayer.addRenderable(screenText);

        screenText = new WorldWind.ScreenText(new WorldWind.Vec2(canvasWidth, 0), "Upper Right");
        textAttributes = new WorldWind.TextAttributes(textAttributes);
        // Use offset to position the upper right corner of the text string at the shape's screen position (width, 0).
        textAttributes.offset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 1, WorldWind.OFFSET_FRACTION, 1);
        screenText.attributes = textAttributes;
        textLayer.addRenderable(screenText);

        screenText = new WorldWind.ScreenText(new WorldWind.Vec2(canvasWidth, canvasHeight), "Lower Right");
        textAttributes = new WorldWind.TextAttributes(textAttributes);
        // Use offset to position the lower right corner of the text string at the shape's screen position (width, height).
        textAttributes.offset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 1, WorldWind.OFFSET_FRACTION, 0);
        screenText.attributes = textAttributes;
        textLayer.addRenderable(screenText);

        screenText = new WorldWind.ScreenText(new WorldWind.Vec2(canvasWidth / 2, canvasHeight / 2), "Center");
        textAttributes = new WorldWind.TextAttributes(textAttributes);
        // Use offset to position the center of the text string at the shape's screen position (width/2, height/2).
        textAttributes.offset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
        screenText.attributes = textAttributes;
        textLayer.addRenderable(screenText);

        // Add the text layer to the World Window's layer list.
        wwd.addLayer(textLayer);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager('divLayerManager', wwd);
    });