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
        '../util/Logger'
    ],
    function (ArgumentError,
              Logger) {
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

            //// Retrieve the metadata for the imagery set.
            //
            //var xhr = new XMLHttpRequest(),
            //    url = "http://dev.virtualearth.net/REST/V1/Imagery/Metadata/" + imagerySet + "/0,0?zl=1&key="
            //        + bingMapsKey;
            //
            //xhr.open("GET", url, true);
            //xhr.response = "arrayBuffer";
            //xhr.onreadystatechange = function () {
            //    if (xhr.readyState === 4 && xhr.status === 200) {
            //        var contentType = xhr.getResponseHeader("content-type"),
            //            response = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(xhr.response)));
            //        console.log(response);
            //    }
            //};
            //
            //xhr.onerror = function () {
            //    console.log("Error for " + url);
            //};
            //
            //xhr.ontimeout = function () {
            //    console.log("Timeout for " + url);
            //};
            //
            //xhr.send(null);
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

            var sb = "http://ecn.t3.tiles.virtualearth.net/tiles/";

            if (this.imagerySet === "Aerial") {
                sb += "a";
            } else if (this.imagerySet === "AerialWithLabels") {
                sb += "h";
            } else if (this.imagerySet === "Road") {
                sb += "r";
            } else {
                sb += "a";
            }

            sb += this.quadKeyFromLevelRowColumn(tile.level.levelNumber, tile.row, tile.column);

            sb += ".jpeg?g=3299";

            return sb;
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