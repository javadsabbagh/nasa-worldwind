/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports BingImageryUrlBuilder
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../util/WWUtil'
    ],
    function (ArgumentError,
              Logger,
              WWUtil) {
        "use strict";

        /**
         * Constructs a URL builder for Bing imagery.
         * @alias BingImageryUrlBuilder
         * @constructor
         * @classdesc Provides a factory to create URLs for Bing image requests.
         * @param {String} imagerySet The name of the imagery set to display.
         * @param {String} bingMapsKey The Bing Maps key to use for the image requests.
         *
         */
        var BingImageryUrlBuilder = function (imagerySet, bingMapsKey) {
            if (!bingMapsKey) {
                bingMapsKey = "AkttWCS8p6qzxvx5RH3qUcCPgwG9nRJ7IwlpFGb14B0rBorB5DvmXr2Y_eCUNIxH";
            }

            this.imagerySet = imagerySet;

            // Retrieve the metadata for the imagery set.

            var url = "http://dev.virtualearth.net/REST/V1/Imagery/Metadata/" + imagerySet + "/0,0?zl=1&key="
                + bingMapsKey;

            // Use JSONP to request the metadata. Can't use XmlHTTPRequest because the virtual earth server doesn't
            // allow cross-origin requests for metadata retrieval.
            var thisObject = this;
            WWUtil.jsonp(url, "jsonp", function (jsonData) {
                thisObject.imageUrl = jsonData.resourceSets[0].resources[0].imageUrl;

                // Send an event to request a redraw.
                var e = document.createEvent('Event');
                e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
                window.dispatchEvent(e);
            })
        };

        /**
         * Creates the URL string for a WMS Get Map request.
         * @param {Tile} tile The tile for which to create the URL.
         * @param {String} imageFormat The image format to request.
         * @throws {ArgumentError} If the specified tile or image format are null or undefined.
         */
        BingImageryUrlBuilder.prototype.urlForTile = function (tile, imageFormat) {
            if (!tile) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "BingImageryUrlBuilder", "urlForTile", "missingTile"));
            }

            if (!imageFormat) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "BingImageryUrlBuilder", "urlForTile",
                        "The image format is null or undefined."));
            }

            if (!this.imageUrl) {
                // Can't do anything until we get the metadata back from the server.
                return null;
            }

            // The quad key identifies the specific image tile for the requested tile.
            var quadKey = this.quadKeyFromLevelRowColumn(tile.level.levelNumber, tile.row, tile.column),
                url;

            // Modify the original image URL to request the tile.
            if (this.imagerySet === "Aerial") {
                url = this.imageUrl.replace(/a3/, "a" + quadKey);
            } else if (this.imagerySet === "AerialWithLabels") {
                url = this.imageUrl.replace(/h3/, "h" + quadKey);
            } else if (this.imagerySet === "Road") {
                url = this.imageUrl.replace(/r3/, "r" + quadKey);
            }

            return url;
        };

        BingImageryUrlBuilder.prototype.quadKeyFromLevelRowColumn = function (levelNumber, row, column) {
            var digit, mask, key = "";

            for (var i = levelNumber + 1; i > 0; i--) {
                digit = 0;
                mask = 1 << (i - 1);

                if ((column & mask) != 0) {
                    digit += 1;
                }

                if ((row & mask) != 0) {
                    digit += 2;
                }

                key += digit.toString();
            }

            return key;
        };

        return BingImageryUrlBuilder;
    });