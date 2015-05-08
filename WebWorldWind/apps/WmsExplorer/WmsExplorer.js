/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id$
 */
define(['../../src/WorldWind',
        '../../examples/CoordinateController'],
    function (ww,
              CoordinateController) {
        "use strict";

        var WmsExplorer = function () {
            var thisExplorer = this;

            WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

            // Create the World Window.
            this.wwd = new WorldWind.WorldWindow("canvasOne");

            // Create a coordinate controller to update the coordinate overlay elements.
            this.coordinateController = new CoordinateController(this.wwd);

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

            $("#projection").on("change", function (e) {
                thisExplorer.onProjectionChange(e);
            });

            var worldWindow = this.wwd;
            $("#divLayerManager").fancytree({
                    source: this.createLayerNodes(),
                    click: function (event, data) {
                        var node = data.node;
                        var layer = node.data.layer;

                        if (layer) {
                            node.setSelected(!layer.enabled);
                            return false;
                        }
                    },
                    select: function (event, data) {
                        var node = data.node;
                        var layer = node.data.layer;
                        if (layer) {
                            layer.enabled = node.selected;
                        } else if (node.selected && node.data.layerCaps && node.data.layerCaps.name) {
                            node.data.layer = thisExplorer.addLayer(node.data.layerCaps);
                        }

                        worldWindow.redraw();
                        return false;
                    }
                }
            );
            $("#divLayerManager").fancytree("option", "checkbox", true);
            $("#divLayerManager").fancytree("option", "icons", false);

            $("form").submit(false);

            $("#addServerButton").click(function (e) {
                thisExplorer.addServer($("#addServerUrl").val());
            });
        };

        WmsExplorer.prototype.createLayerNodes = function () {
            var nodes = [];

            for (var i = 0; i < this.wwd.layers.length; i++) {
                var layer = this.wwd.layers[i];

                nodes.push({
                    title: layer.displayName,
                    selected: layer.enabled,
                    layer: layer
                });
            }

            var baseNode = {
                title: "Base Layers",
                selected: false,
                expanded: true,
                unselectable: true,
                hideCheckbox: true,
                folder: true,
                children: nodes
            };

            return [baseNode];
        };

        WmsExplorer.prototype.onProjectionChange = function (event) {
            var projectionName = event.target.value;

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

        WmsExplorer.prototype.addServer = function (wmsServer) {
            if (!wmsServer) {
                return;
            }

            wmsServer = wmsServer.trim();

            if (wmsServer.lastIndexOf("http", 0) != 0) {
                wmsServer = "http://" + wmsServer;
            }

            var thisExplorer = this,
                request = new XMLHttpRequest(),
                url = WorldWind.WmsUrlBuilder.fixGetMapString(wmsServer);

            url += "service=WMS&request=GetCapabilities&vers";

            request.open("GET", url, true);
            request.onreadystatechange = function () {
                if (request.readyState === 4 && request.status === 200) {
                    var xmlDom = request.responseXML;

                    if (!xmlDom && request.responseText.indexOf("<?xml") === 0) {
                        xmlDom = new window.DOMParser().parseFromString(request.responseText, "text/xml");
                    }

                    if (!xmlDom) {
                        alert(wmsServer + " retrieval failed. It is probably not a WMS server.");
                        return;
                    }

                    var wmsCapsDoc = new WorldWind.WmsCapabilities(xmlDom);

                    if (wmsCapsDoc.version) { // if no version, then the URL doesn't point to a caps doc.
                        var treeRoot = $("#divLayerManager").fancytree("getRootNode");
                        treeRoot.addChildren([
                            {
                                title: wmsCapsDoc.service.title,
                                selected: false,
                                expanded: true,
                                unselectable: true,
                                hideCheckbox: true,
                                folder: true,
                                children: thisExplorer.assembleLayers(wmsCapsDoc.capability.layers, [])
                            }
                        ]);
                    } else {
                        alert(wmsServer +
                        " WMS capabilities document invalid. The server is probably not a WMS server.");
                    }
                } else if (request.readyState === 4) {
                    if (request.statusText) {
                        alert(request.responseURL + " " + request.status + " (" + request.statusText + ")");
                    } else {
                        alert("Failed to retrieve WMS capabilities from " + wmsServer + ".");
                    }
                }
            };

            request.send(null);
        };

        WmsExplorer.prototype.assembleLayers = function (layers, result) {

            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i],
                    subLayers = null,
                    node = {
                        title: layer.title,
                        layerCaps: layer
                    };

                if (layer.layers && layer.layers.length > 0) {
                    subLayers = this.assembleLayers(layer.layers, []);
                }

                if (layer.name) {

                } else {
                    node.expanded = true;
                    node.unselectable = true;
                    node.hideCheckbox = true;
                    node.folder = true;
                }

                if (subLayers) {
                    node.children = subLayers;
                }

                result.push(node);
            }

            return result;
        };

        WmsExplorer.prototype.addLayer = function (layerCaps) {
            if (layerCaps.name) {
                var config = WorldWind.WmsLayer.formLayerConfiguration(layerCaps, null);
                var layer = new WorldWind.WmsLayer(config);

                layer.enabled = true;
                this.wwd.addLayer(layer);
                this.wwd.redraw();

                return layer;
            }

            return null;
        };

        return WmsExplorer;
    });