/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports LayersPanel
 * @version $Id: LayersPanel.js 3185 2015-06-12 19:12:09Z tgaskins $
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
    var CommandsPanel = function (wwd,layer) {
        this.buttons = [
            ['CPanelUp','Greater Magnitude'],
            ['CPanelDown','Lesser Magnitude'],
            ['CPanelRight','Newer Earthquake'],
            ["CPanelLeft",'Older Earthquake']
        ];

        this.layer = layer;
        var self = this;
        this.FocusedEarthquake = 0;

        function sortWithIndeces(toSortI,property) {
            var toSort = toSortI.slice();
            for (var i = 0; i < toSort.length; i++) {
                toSort[i] = [toSort[i], i];
            }
            if (property){toSort.sort(function (left, right) {
                return left[0][property] < right[0][property] ? -1 : 1;
            });
            } else {
                toSort.sort(function (left, right) {
                    return left[0] < right[0] ? -1 : 1;
                });
            }

            toSort.sortIndices = [];
            for (var j = 0; j < toSort.length; j++) {
                toSort.sortIndices.push(toSort[j][1]);
                toSort[j] = toSort[j][0];
            }
            return toSort;
        }

        var indexis = sortWithIndeces(layer.Manage.ParsedData,'magnitude').sortIndices;
        console.log(indexis)
        var OrIndexMtD = function (ind) {
            return indexis[ind];
        };
        var indexis2 = sortWithIndeces(indexis).sortIndices;
        console.log(indexis2)
        var OrIndexDtM = function (ind) {
            return indexis2[ind];
        };
        this.resetData = function() {
            this.FocusedEarthquake = 0;
            indexis = sortWithIndeces(layer.Manage.ParsedData,'magnitude').sortIndices;
            indexis2 = sortWithIndeces(indexis).sortIndices;
        }
        var goToAnimator = new WorldWind.GoToAnimator(wwd);
        var ShowChanges = function (INDEX) {
            var layer = self.layer;
            var display = $('#eData');
            display.empty();
            display.append('<p>' + layer.Manage.ParsedData[INDEX].info + '</p>');
            layer.Manage.Animations.animate(layer.renderables[INDEX])
            var positionAlias = Object.create(layer.Manage.ParsedData[INDEX].position);
            positionAlias.altitude = 2000000;
            goToAnimator.cancel();
            goToAnimator.goTo(positionAlias);

        };

        this.bfunctions = [
            function () {
                if (OrIndexDtM(self.FocusedEarthquake)+1 < self.layer.Manage.ParsedData.length){
                    self.FocusedEarthquake = OrIndexMtD(OrIndexDtM(self.FocusedEarthquake) + 1);
                };
                ShowChanges(self.FocusedEarthquake);
                console.log(self.FocusedEarthquake);
            },
            function () {
                if (OrIndexDtM(self.FocusedEarthquake) > 0){
                    self.FocusedEarthquake = OrIndexMtD(OrIndexDtM(self.FocusedEarthquake) - 1);
                };
                ShowChanges(self.FocusedEarthquake);
            },
            function () {
                if (self.FocusedEarthquake+1 < self.layer.Manage.ParsedData.length){
                    self.FocusedEarthquake = self.FocusedEarthquake + 1;
                }
                ShowChanges(self.FocusedEarthquake);
            },
            function () {
                if (self.FocusedEarthquake > 0){
                    self.FocusedEarthquake = self.FocusedEarthquake - 1;
                }
                ShowChanges(self.FocusedEarthquake);
            }
        ];

        this.synchronizeLayerList();
    };

    CommandsPanel.prototype.onLayerClick = function (layerButton) {
        var layerName = layerButton.text();
    };

    CommandsPanel.prototype.synchronizeLayerList = function () {
        var layerListItem = $("#CPanel");
        var self = this
        /*
        layerListItem.find("button").off("click");
        layerListItem.find("button").remove();
        */
        // Synchronize the displayed layer list with the World Window's layer list.
        for (var i = 0; i < this.buttons.length; i++) {
            var d = $("<div>");
            d.attr("class","btn-group btn-group-justified");
            var d1 = $("<div>");
            d1.attr("class", "btn-group");
            var d2 = $('<button>');
            d2.attr("class","btn btn-primary");
            d2.attr("id","Button " + this.layer.displayName + ' ' + this.buttons[i][1]);
            d2.text(this.buttons[i][1]);
            d2.on("click", self.bfunctions[i]);
            d1.append(d2);
            d.append(d1);
            layerListItem.append(d);
            if (i === this.buttons.length-1){
                var d = $("<div>");
                d.attr("class","btn-group btn-group-justified");
                var d1 = $("<div>");
                d1.attr("class", "btn-group");
                var d2 = $('<button>')
                d2.attr("class","btn btn-primary");
                d2.attr("id","Button " + this.layer.displayName + ' ' + this.buttons[i][1]);
                d2.css("background-color", 'red')
                d1.append(d2)
                d.append(d1)
                layerListItem.append(d)
            }
        };
    };

    return CommandsPanel;
});
