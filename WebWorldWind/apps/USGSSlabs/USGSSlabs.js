/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id: USGSSlabs.js$
 */
define(['../../src/WorldWind',
        '../util/GoToBox',
        '../util/LayersPanel',
        '../util/ProjectionMenu',
        '../util/TerrainOpacityController'],
    function (ww,
              GoToBox,
              LayersPanel,
              ProjectionMenu,
              TerrainOpacityController) {
        "use strict";

        var USGSSlabs = function () {
            WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

            // Create the World Window.
            this.wwd = new WorldWind.WorldWindow("canvasOne");

            /**
             * Added imagery layers.
             */
            var layers = [
                {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
                {layer: new WorldWind.OpenStreetMapImageLayer(null), enabled: false},
                {layer: new WorldWind.CompassLayer(), enabled: true, hide: true},
                {layer: new WorldWind.CoordinatesDisplayLayer(this.wwd), enabled: true, hide: true},
                {layer: new WorldWind.ViewControlsLayer(this.wwd), enabled: true, hide: true}
            ];

            for (var l = 0; l < layers.length; l++) {
                layers[l].layer.enabled = layers[l].enabled;
                layers[l].layer.hide = layers[l].hide;
                this.wwd.addLayer(layers[l].layer);
            }

            // Enable sub-surface rendering for the World Window.
            this.wwd.subsurfaceMode = true;

            // Start the view pointing to a longitude within the current time zone.
            this.wwd.navigator.lookAtLocation.latitude = 30;
            this.wwd.navigator.lookAtLocation.longitude = -(180 / 12) * ((new Date()).getTimezoneOffset() / 60);

            this.goToBox = new GoToBox(this.wwd);
            this.layersPanel = new LayersPanel(this.wwd);
            this.projectionMenu = new ProjectionMenu(this.wwd);
            this.terrainOpacityController = new TerrainOpacityController(this.wwd);

            this.layersPanel.synchronizeLayerList();

            this.loadSlabData();
        };

        USGSSlabs.prototype.loadSlabData = function () {
            var dataLocation = "http://worldwindserver.net/webworldwind/data/usgs/",
                url = dataLocation + "sol_slab1.0_clip.xyz";

            var xhr = new XMLHttpRequest();

            xhr.open("GET", url, true);
            xhr.onreadystatechange = (function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        this.parse(xhr.responseText);
                    }
                    else {
                        Logger.log(Logger.LEVEL_WARNING,
                            "Slab data retrieval failed (" + xhr.statusText + "): " + url);
                    }
                }
            }).bind(this);

            xhr.onerror = function () {
                Logger.log(Logger.LEVEL_WARNING, "Slab data retrieval failed: " + url);
            };

            xhr.ontimeout = function () {
                Logger.log(Logger.LEVEL_WARNING, "Slab data retrieval timed out: " + url);
            };

            xhr.send(null);
        };

        USGSSlabs.prototype.parse = function (responseText) {
            var lines = responseText.split("\n"),
                positions = [];

            for (var i = 0; i < lines.length; i++) {
                if (lines[i].trim().length === 0) {
                    continue;
                }

                if (i % 1001 === 0) {
                    if (positions.length === 33)
                        break;
                    positions[positions.length] = [];
                }

                var rawPosition = lines[i].split("\t"),
                    longitude = parseFloat(rawPosition[0]),
                    latitude = parseFloat(rawPosition[1]),
                    altitude = rawPosition[2] === "NaN" ? 0 : parseFloat(rawPosition[2]) * 1e2,
                    position = new WorldWind.Position(latitude, longitude, altitude);

                positions[positions.length - 1].push(position);
            }

            var meshAttributes = new WorldWind.ShapeAttributes(null);
            meshAttributes.outlineColor = WorldWind.Color.BLUE;
            meshAttributes.interiorColor = new WorldWind.Color(1, 1, 0, 0.7);
            meshAttributes.applyLighting = true;

            var highlightAttributes = new WorldWind.ShapeAttributes(meshAttributes);
            highlightAttributes.outlineColor = WorldWind.Color.WHITE;

            var mesh = new WorldWind.GeographicMesh(positions, meshAttributes);
            mesh.highlightAttributes = highlightAttributes;

            var meshLayer = new WorldWind.RenderableLayer();
            meshLayer.displayName = "Slab";
            meshLayer.addRenderable(mesh);
            this.wwd.addLayer(meshLayer);
            this.layersPanel.synchronizeLayerList();
            this.wwd.redraw();
        };

        return USGSSlabs;
    });