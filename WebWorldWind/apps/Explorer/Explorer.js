/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id$
 */
define(['../../src/WorldWind'],
    function (ww) {
        "use strict";

        var Explorer = function () {
            var thisExplorer = this;

            WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

            // Create the World Window.
            this.wwd = new WorldWind.WorldWindow("canvasOne");

            /**
             * Added imagery layers.
             */
            var layers = [
                {layer: new WorldWind.BMNGLayer(), enabled: true},
                {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
                {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
                {layer: new WorldWind.CompassLayer(), enabled: true},
                {layer: new WorldWind.ViewControlsLayer(this.wwd), enabled: true}
            ];

            for (var l = 0; l < layers.length; l++) {
                layers[l].layer.enabled = layers[l].enabled;
                this.wwd.addLayer(layers[l].layer);
            }

            this.wwd.redraw();

            this.roundGlobe = this.wwd.globe;

            $("#projectionDropdown").find(" li").on("click", function (e) {
                thisExplorer.onProjectionClick(e);
            });

            this.synchronizeLayerList();

            $("#layerList").find("a").on("click", function (e) {
                thisExplorer.onLayerClick($(this));
            });
        };

        Explorer.prototype.onProjectionClick = function (event) {
            var projectionName = event.target.innerText;
            $("#projectionDropdown").find("button").html(projectionName + ' <span class="caret"></span>');

            if (projectionName === "3D") {
                if (!this.roundGlobe) {
                    this.roundGlobe = new WorldWind.Globe(new WorldWind.EarthElevationModel());
                }

                if (this.wwd.globe !== this.roundGlobe) {
                    this.wwd.globe = this.roundGlobe;
                }
            } else {
                if (!this.flatGlobe) {
                    this.flatGlobe = new WorldWind.Globe2D();
                }

                if (projectionName === "Equirectangular") {
                    this.flatGlobe.projection = new WorldWind.ProjectionEquirectangular();
                } else if (projectionName === "Mercator") {
                    this.flatGlobe.projection = new WorldWind.ProjectionMercator();
                } else if (projectionName === "North Polar") {
                    this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("North");
                } else if (projectionName === "South Polar") {
                    this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("South");
                } else if (projectionName === "North UPS") {
                    this.flatGlobe.projection = new WorldWind.ProjectionUPS("North");
                } else if (projectionName === "South UPS") {
                    this.flatGlobe.projection = new WorldWind.ProjectionUPS("South");
                }

                if (this.wwd.globe !== this.flatGlobe) {
                    this.wwd.globe = this.flatGlobe;
                }
            }

            this.wwd.redraw();
        };

        Explorer.prototype.onLayerClick = function (layerItems) {
            var layerName = layerItems[0].innerText;

            // Update the layer state for the selected layer.
            for (var i = 0, len = this.wwd.layers.length; i < len; i++) {
                var layer = this.wwd.layers[i];
                if (layer.displayName === layerName) {
                    layer.enabled = !layer.enabled;
                    if (layer.enabled) {
                        layerItems.addClass("active");
                    } else {
                        layerItems.removeClass("active");
                    }
                    this.wwd.redraw();
                }
            }
        };

        Explorer.prototype.synchronizeLayerList = function () {
            var layerListItem = $("#layerList");

            layerListItem.remove('a');

            // Synchronize the displayed layer list with the World Window's layer list.
            for (var i = 0, len = this.wwd.layers.length; i < len; i++) {
                var layer = this.wwd.layers[i];
                var layerItem = $('<a href="#" class="list-group-item">' + layer.displayName + '</a>');
                layerListItem.append(layerItem);

                if (layer.enabled) {
                    layerItem.addClass("active");
                } else {
                    layerItem.removeClass("active");
                }
                this.wwd.redraw();
            }
        };

        return Explorer;
    });