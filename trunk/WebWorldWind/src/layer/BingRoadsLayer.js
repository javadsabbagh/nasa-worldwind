/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports BingRoadsLayer
 * @version $Id$
 */
define([
        '../geom/Location',
        '../geom/Sector',
        '../layer/BingTiledImageLayer',
        '../util/BingImageryUrlBuilder'
    ],
    function (Location,
              Sector,
              BingTiledImageLayer,
              BingImageryUrlBuilder) {
        "use strict";

        /**
         * Constructs a Bing Roads layer.
         * @alias BingAerialLayer
         * @constructor
         * @classdesc Displays a Bing Roads layer.
         */
        var BingRoadsLayer = function () {
            BingTiledImageLayer.call(this, "Bing Roads");

            this.urlBuilder = new BingImageryUrlBuilder("Road", null);

            // Disable blank-image detection.
            this.detectBlankImages = false;
        };

        BingRoadsLayer.prototype = Object.create(BingTiledImageLayer.prototype);

        return BingRoadsLayer;
    });