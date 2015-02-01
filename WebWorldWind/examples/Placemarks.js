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
        wwd.addLayer(new WorldWind.BMNGLandsatLayer());
        wwd.addLayer(new WorldWind.BingWMSLayer());

        var images = [
            "plain-black.png",
            "plain-blue.png",
            "plain-brown.png",
            "plain-gray.png",
            "plain-green.png",
            "plain-orange.png",
            "plain-purple.png",
            "plain-red.png",
            "plain-teal.png",
            "plain-white.png",
            "plain-yellow.png",
            "castshadow-black.png",
            "castshadow-blue.png",
            "castshadow-brown.png",
            "castshadow-gray.png",
            "castshadow-green.png",
            "castshadow-orange.png",
            "castshadow-purple.png",
            "castshadow-red.png",
            "castshadow-teal.png",
            "castshadow-white.png"
        ];

        var pinLibrary = "http://worldwindserver.net/webworldwind/images/pushpins/",
            placemark,
            placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
            highlightAttributes,
            placemarkLayer = new WorldWind.RenderableLayer(),
            latitude = 47.684444,
            longitude = -122.129722;

        placemarkAttributes.imageScale = 1;
        placemarkAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 0.0);
        placemarkAttributes.imageColor = WorldWind.Color.WHITE;
        placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 1.0);
        placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;

        for (var i = 0, len = images.length; i < len; i++) {
            placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude + i, 1e2));
            placemark.label = "Placemark " + i.toString() + "\n"
            + "Lat " + latitude.toPrecision(4).toString() + "\n"
            + "Lon " + longitude.toPrecision(5).toString();
            placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
            placemarkAttributes.imagePath = pinLibrary + images[i];
            highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
            highlightAttributes.imageScale = 1.2;
            placemark.attributes = placemarkAttributes;
            placemark.highlightAttributes = highlightAttributes;
            placemarkLayer.addRenderable(placemark);
        }

        placemarkLayer.displayName = "Placemarks";
        wwd.addLayer(placemarkLayer);

        wwd.redraw();

        var layerManger = new LayerManager('divLayerManager', wwd);

        var canvas = document.getElementById("canvasOne"),
            highlightedItems = [];

        canvas.addEventListener("mousemove", function (e) {
            handlePick(e.clientX, e.clientY);
        }, false);

        var tapRecognizer = new WorldWind.TapRecognizer(canvas);
        tapRecognizer.addGestureListener(function (recognizer) {
            var location = recognizer.location();
            handlePick(location[0], location[1]);
        });

        var handlePick = function (x, y) {
            var redrawRequired = highlightedItems.length > 0;

            // De-highlight any highlighted placemarks.
            for (var h = 0; h < highlightedItems.length; h++) {
                highlightedItems[h].highlighted = false;
            }
            highlightedItems = [];

            // Perform the pick.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
            if (pickList.objects.length > 0) {
                redrawRequired = true;
            }

            // Highlight the items picked.
            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    pickList.objects[p].userObject.highlighted = true;
                    highlightedItems.push(pickList.objects[p].userObject);

                    if (pickList.objects[p].labelPicked) {
                        console.log("Label picked");
                    }
                }
            }

            // Update the window if we changed anything.
            if (redrawRequired) {
                wwd.redraw(); // redraw to make the highlighting changes take effect on the screen
            }
        };
    });