/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports BingAerialWithLabelsLayer
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
         * Constructs a Bing Aerial with Labels layer.
         * @alias BingAerialWithLabelsLayer
         * @constructor
         * @augments BingTiledImageLayer
         * @classdesc Displays a Bing Aerial layer with roads and labels.
         * See also {@link BingAerialLayer} and {@link BingRoadsLayer}.
         */
        var BingAerialWithLabelsLayer = function () {
            BingTiledImageLayer.call(this, "Bing Aerial with Labels");

            this.urlBuilder = new BingImageryUrlBuilder("AerialWithLabels", null);
        };

        BingAerialWithLabelsLayer.prototype = Object.create(BingTiledImageLayer.prototype);

        return BingAerialWithLabelsLayer;
    });