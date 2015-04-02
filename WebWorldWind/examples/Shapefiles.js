/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id$
 */

requirejs(['../src/WorldWind',
        './LayerManager/LayerManager'],
    function (ww,
              LayerManager) {
        "use strict";

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var wwd = new WorldWind.WorldWindow("canvasOne");

        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: true},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

        var attributeCallback = function(attributes, record) {
            if (record.isPolylineType()) {
                var pathAttributes = new WorldWind.PathAttributes(null);
                return pathAttributes;
            }
            else if (record.isPolygonType()) {
                // Fill the polygon with a random pastel color.
                var polygonAttributes = new WorldWind.ShapeAttributes(null);
                var interiorColor = new WorldWind.Color(
                    0.375 + 0.5 * Math.random(),
                    0.375 + 0.5 * Math.random(),
                    0.375 + 0.5 * Math.random(),
                    1.0);
                polygonAttributes.interiorColor = interiorColor;
                polygonAttributes.outlineColor = WorldWind.Color.WHITE;
                return polygonAttributes;
            }
            else if (record.isPointType()) {
                var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
                return placemarkAttributes;
            }
            else {
                // This should never be reached.
                alert("Invalid record type was encountered!");
                return null;
            }

        };

        var worldLoadCallback = function() {
            worldShapefile.addRenderablesForShapefile(worldShapefileLayer);
        };

        var usLoadCallback = function() {
            usShapefile.addRenderablesForShapefile(usShapefileLayer);
        };

        var shapefileLibrary = WorldWind.WWUtil.currentUrlSansFilePart() + "/../shapefiles/"; // location of the shapefiles

        var worldShapefileLayer = new WorldWind.RenderableLayer("World Countries Shapefile");
        var worldShapefile = new WorldWind.Shapefile(shapefileLibrary + "/ne_110m_admin_0_countries/ne_110m_admin_0_countries.shp");
        worldShapefile.load(worldLoadCallback, attributeCallback);
        wwd.addLayer(worldShapefileLayer);

        var usShapefileLayer = new WorldWind.RenderableLayer("US States Shapefile");
        var usShapefile = new WorldWind.Shapefile(shapefileLibrary + "/ne_110m_admin_1_states_provinces_lakes/ne_110m_admin_1_states_provinces_lakes.shp");
        usShapefile.load(usLoadCallback, attributeCallback);
        wwd.addLayer(usShapefileLayer);

        wwd.redraw();

        var layerManger = new LayerManager('divLayerManager', wwd);
    });