/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports LayersPanel
 * @version $Id: LayersPanel.js 3185 2015-06-12 19:12:09Z tgaskins $
 */
define(['Tour', 'TourManager'], function (Tour,
                                          TourManager) {
    "use strict";
    /**
     * Constructs a layers panel to manage the app's layer list.
     * @alias LayersPanel
     * @constructor
     * @classdesc Provides a list of buttons that control layer visibility.
     * @param {WorldWindow} worldWindow The World Window to associate this layers panel with.
     */
    var CommandsPanel = function (wwd,layer) {
        //this is all connected to the earthquake layer. You will need to entirely rewrite this section for different functionality.

        //list of buttons id,name
        this.buttons = [
            ['CPanelUp','Greater Magnitude'],
            ['CPanelDown','Lesser Magnitude'],
            ['CPanelRight','Newer Earthquake'],
            ["CPanelLeft",'Older Earthquake'],
            ['StartTour','Start Tour'],
            ['NewestEarth','Newest Earthquake']
        ];

        this.layer = layer;
        var self = this;
        //the earthquake that we are looking at. The index of its location in the layer's parsed earthquake array.
        this.FocusedEarthquake = 0;

        //function that sorts an array and tracks the indexes change
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

        //create a 1-1 map from the indexes of the array sorted by time to the array sorted by magnitude
        var indexis = sortWithIndeces(layer.Manage.ParsedData,'magnitude').sortIndices;
        var OrIndexMtD = function (ind) {
            return indexis[ind];
        };
        //the inverse function
        var indexis2 = sortWithIndeces(indexis).sortIndices;
        var OrIndexDtM = function (ind) {
            return indexis2[ind];
        };
        //recalculate the mapping
        this.resetData = function() {
            this.FocusedEarthquake = 0;
            indexis = sortWithIndeces(layer.Manage.ParsedData,'magnitude').sortIndices;
            indexis2 = sortWithIndeces(indexis).sortIndices;
        };
        //used to animate the movements
        var goToAnimator = new WorldWind.GoToAnimator(wwd);
        //repeated code for buttons
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


        var quakesInTour = layer.Manage.ParsedData.filter(function(quake) {
            return quake.magnitude >= 5;
        });

        function getQuakePosition(quake) {
            return new WorldWind.Position(quake.lat, quake.long, 100000);
        }

        var magnitudeTour = new Tour('Magnitude Tour',quakesInTour, getQuakePosition, function(q1, q2) {
            return Math.ceil(q1.magnitude - q2.magnitude);
        });
        var magnitudeTourManager = new TourManager(magnitudeTour, goToAnimator);

        var timeTour = new Tour('Time tour', quakesInTour, getQuakePosition, function(q1, q2) {
            var t1 = q1.time;
            var t2 = q2.time;
            if(t1 < t2) {
                return -1;
            } else if (t1 > t2) {
                return 1;
            }
            return 0;
        });
        var timeTourManager = new TourManager(timeTour, goToAnimator);

        //this variable contains the functions that will be applied in the same order as the buttons are in the array.
        this.bfunctions = [
            function (event) {
                if (OrIndexDtM(self.FocusedEarthquake)+1 < self.layer.Manage.ParsedData.length){
                    self.FocusedEarthquake = OrIndexMtD(OrIndexDtM(self.FocusedEarthquake) + 1);
                }
                ShowChanges(self.FocusedEarthquake);
            },
            function (event) {
                if (OrIndexDtM(self.FocusedEarthquake) > 0){
                    self.FocusedEarthquake = OrIndexMtD(OrIndexDtM(self.FocusedEarthquake) - 1);
                }
                ShowChanges(self.FocusedEarthquake);
            },
            function (event) {
                if (self.FocusedEarthquake+1 < self.layer.Manage.ParsedData.length){
                    self.FocusedEarthquake = self.FocusedEarthquake + 1;
                }
                ShowChanges(self.FocusedEarthquake);
            },
            function (event) {
                if (self.FocusedEarthquake - 1 > 0) {
                    self.FocusedEarthquake = self.FocusedEarthquake - 1;
                }
                ShowChanges(self.FocusedEarthquake);
            },
            function (event) {
                if (!magnitudeTourManager.tourRun) {
                    magnitudeTourManager.startTour();
                    console.log('running');
                    $(event.target).attr('class','btn btn-danger');
                    $(event.target).text("Stop Touring");
                    magnitudeTourManager.addCallback(function(t){
                        $(event.target).attr('class','btn btn-primary');
                        $(event.target).text("Start Tour");
                    });
                }else{
                    magnitudeTourManager.stopTour();
                    console.log('stopped');
                    $(event.target).attr('class','btn btn-primary');
                    $(event.target).text("Start Tour");
                }

            },
            function(event){
                ShowChanges(self.FocusedEarthquake = 0);
            }
        ];


        //whenever you click on an earthquake, it zooms in on that.
        document.getElementById("canvasOne").onmousedown = function tss (e) {
            console.log(e)
            if (e.which === 1 && e.type === 'mousedown'){
                for (var i in layer.renderables) {
                    if (layer.renderables[i].highlighted) {
                        console.log('hi')
                        ShowChanges(i)
                    }

                }
            }
        };

        this.synchronizeLayerList();
    };

    CommandsPanel.prototype.onLayerClick = function (layerButton) {
        var layerName = layerButton.text();
    };

    CommandsPanel.prototype.synchronizeLayerList = function () {
        var layerListItem = $("#CPanel");
        var self = this;
        /*
        layerListItem.find("button").off("click");
        layerListItem.find("button").remove();
        */
        // Synchronize the displayed layer list with the World Window's layer list.
        for (var i = 0; i < this.buttons.length; i++) {
            var index = i
            var self = this
            var d = $("<div>");
            d.attr("class","btn-group btn-group-justified");
            var d1 = $("<div>");
            d1.attr("class", "btn-group");
            var d2 = $('<button>');
            d2.attr("class","btn btn-primary");
            d2.attr("id","Button " + self.layer.displayName + ' ' + self.buttons[i][1]);
            d2.text(this.buttons[i][1]);
            d2.on("click",
                self.bfunctions[index]
            );
            d1.append(d2);
            d.append(d1);
            layerListItem.append(d);
            if (i === this.buttons.length-1){
                var d = $("<div>");
                d.attr("class","btn-group btn-group-justified");
                var d1 = $("<div>");
                d1.attr("class", "btn-group");
                var d2 = $('<button>')
                d2.attr("class","btn btn-danger");
                d2.attr("id","Button " + this.layer.displayName + ' ' + this.buttons[i][1]);
                d1.append(d2)
                d.append(d1)
                layerListItem.append(d)
            }
        };
    };

    return CommandsPanel;
});
