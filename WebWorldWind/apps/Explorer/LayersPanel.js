/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports LayersPanel
 * @version $Id$
 */
define(function () {
    "use strict";

    /**
     * Constructs a layers panel to manage the app's layer list.
     * @alias LayersPanel
     * @constructor
     * @classdesc Provides a list of buttons that control layer visibility.
     * @param {WorldWindow} worldWindow The World Window to associate this layers panel with.
     */
    var LayersPanel = function (worldWindow) {
        var thisLayersPanel = this;

        this.wwd = worldWindow;

        this.synchronizeLayerList();
    };

    LayersPanel.prototype.onLayerClick = function (layerButton) {
        var layerName = layerButton.text();

        // Update the layer state for the selected layer.
        for (var i = 0, len = this.wwd.layers.length; i < len; i++) {
            var layer = this.wwd.layers[i];
            if (layer.hide) {
                continue;
            }

            if (layer.displayName === layerName) {
                layer.enabled = !layer.enabled;
                if (layer.enabled) {
                    layerButton.addClass("active");
                } else {
                    layerButton.removeClass("active");
                }
                this.wwd.redraw();
            }
        }
    };

    LayersPanel.prototype.synchronizeLayerList = function () {
        var layerListItem = $("#layerList");

        layerListItem.find("button").off("click");
        layerListItem.find("button").remove();

        // Synchronize the displayed layer list with the World Window's layer list.
        for (var i = 0, len = this.wwd.layers.length; i < len; i++) {
            var layer = this.wwd.layers[i];
            if (layer.hide) {
                continue;
            }
            var layerItem = $('<button class="list-group-item btn btn-block">' + layer.displayName + '</button>');
            layerListItem.append(layerItem);

            if (layer.enabled) {
                layerItem.addClass("active");
            } else {
                layerItem.removeClass("active");
            }
            this.wwd.redraw();
        }

        var thisLayersPanel = this;
        layerListItem.find("button").on("click", function (e) {
            thisLayersPanel.onLayerClick($(this));
        });
    };

    return LayersPanel;
});