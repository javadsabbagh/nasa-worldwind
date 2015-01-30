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

        var pinLibrary =  "http://worldwindserver.net/webworldwind/images/pushpins/",
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

        for (var i = 0, len = images.length; i < len; i++) {
            placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude + i, 1e2));
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

        var unHighlight = function () {
            for (var h = 0, lenh = highlightedItems.length; h < lenh; h++) {
                highlightedItems[h].highlighted = false;
            }
            highlightedItems = [];
        };

        var highlight = function (pickList) {
            if (pickList.objects.length > 0) {
                for (var i = 0, len = pickList.objects.length; i < len; i++) {
                    pickList.objects[i].userObject.highlighted = true;
                    highlightedItems.push(pickList.objects[i].userObject);
                }
            }
        };

        canvas.addEventListener("mousemove", function (e) {
            var redrawRequired = highlightedItems.length > 0;
            unHighlight();

            var pickList = wwd.pick(wwd.canvasCoordinates(e.clientX, e.clientY));
            if (pickList.objects.length > 0) {
                redrawRequired = true;
            }
            highlight(pickList);

            if (redrawRequired) {
                wwd.redraw(); // redraw to make the highlighting changes take effect on the screen
            }
        }, false);

        var tapRecognizer = new WorldWind.TapGestureRecognizer(canvas);
        tapRecognizer.addGestureListener(function (recognizer) {
            var redrawRequired = highlightedItems.length > 0;
            unHighlight();

            var location = recognizer.location(),
                pickList = wwd.pick(wwd.canvasCoordinates(location[0], location[1]));
            if (pickList.objects.length > 0) {
                redrawRequired = true;
            }
            highlight(pickList);

            if (redrawRequired) {
                wwd.redraw();
            }
        });


    });