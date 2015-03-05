/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports BingAerialLayer
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
         * Constructs a Bing Aerial layer.
         * @alias BingAerialLayer
         * @constructor
         * @classdesc Displays the Bing Aerial layer.
         */
        var BingAerialLayer = function () {
            BingTiledImageLayer.call(this, "Bing Aerial");

            this.urlBuilder = new BingImageryUrlBuilder("Aerial", null);
        };

        BingAerialLayer.prototype = Object.create(BingTiledImageLayer.prototype);

        return BingAerialLayer;
    });