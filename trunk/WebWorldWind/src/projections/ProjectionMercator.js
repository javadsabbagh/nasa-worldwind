/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ProjectionMercator
 * @version $Id$
 */
define([
        '../geom/Angle',
        '../error/ArgumentError',
        '../projections/GeographicProjection',
        '../util/Logger',
        '../geom/Sector',
        '../geom/Vec3'
    ],
    function (Angle,
              ArgumentError,
              GeographicProjection,
              Logger,
              Sector,
              Vec3) {
        "use strict";

        /**
         * Constructs a Mercator geographic projection.
         * @alias ProjectionMercator
         * @constructor
         * @augments GeographicProjection
         * @classdesc Represents a Mercator geographic projection.
         */
        var ProjectionMercator = function () {

            GeographicProjection.call(this, "Mercator", true, new Sector(-78, 78, -180, 180));
        };

        ProjectionMercator.prototype = Object.create(GeographicProjection.prototype);

        // Documented in base class.
        ProjectionMercator.prototype.geographicToCartesian = function (globe, latitude, longitude, elevation, offset, result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "geographicToCartesian", "missingGlobe"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "geographicToCartesian", "missingResult"));
            }

            result[0] = globe.equatorialRadius * longitude * Angle.DEGREES_TO_RADIANS + (offset ? offset[0] : 0);
            result[1] = globe.equatorialRadius * latitude * Angle.DEGREES_TO_RADIANS;
            result[2] = elevation;

            return result;
        };

        // Documented in base class.
        ProjectionMercator.prototype.geographicToCartesianGrid = function (globe, sector, numLat, numLon, elevations, offset, result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "geographicToCartesianGrid", "missingGlobe"));
            }

            if (!sector) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "geographicToCartesianGrid", "missingSector"));
            }

            if (!elevations || elevations.length < numLat * numLon) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "geographicToCartesianGrid",
                    "The specified elevations array is null, undefined or insufficient length"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "geographicToCartesianGrid", "missingResult"));
            }

            var eqr = globe.equatorialRadius,
                minLat = sector.minLatitude * Angle.DEGREES_TO_RADIANS,
                maxLat = sector.maxLatitude * Angle.DEGREES_TO_RADIANS,
                minLon = sector.minLongitude * Angle.DEGREES_TO_RADIANS,
                maxLon = sector.maxLongitude * Angle.DEGREES_TO_RADIANS,
                deltaLat = (maxLat - minLat) / (numLat > 1 ? numLat - 1 : 1),
                deltaLon = (maxLon - minLon) / (numLon > 1 ? numLon - 1 : 1),
                offset_x = offset ? offset[0] : 0,
                pos = 0,
                lat, lon, x, y, z;

            // Iterate over the latitude and longitude coordinates in the specified sector, computing the Cartesian point
            // corresponding to each latitude and longitude.
            lat = minLat;
            for (var j = 0; j < numLat; j++, lat += deltaLat) {
                if (j === numLat - 1) // explicitly set the last lat to the max latitude to ensure alignment
                    lat = maxLat;

                // Latitude is constant for each row. Values that are a function of latitude can be computed once per row.
                y = eqr * lat;

                lon = minLon;
                for (var i = 0; i < numLon; i++, lon += deltaLon) {
                    if (i === numLon - 1) // explicitly set the last lon to the max longitude to ensure alignment
                        lon = maxLon;

                    x = eqr * lon + offset_x;
                    z = elevations[pos];
                    result[pos++] = new Vec3(x, y, z);
                }
            }

            return result;
        };

        // Documented in base class.
        ProjectionMercator.prototype.cartesianToGeographic = function (globe, cartesian, offset, result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "cartesianToGeographic", "missingGlobe"));
            }

            if (!cartesian) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "cartesianToGeographic", "missingPoint"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionEquirectangular",
                    "cartesianToGeographic", "missingResult"));
            }

            result.latitude = cartesian[1] / globe.equatorialRadius;
            result.longitude = (cartesian[0] - (offset ? offset[0] : 0)) / globe.equatorialRadius;
            result.elevation = cartesian[2];

            return result;
        };

        return ProjectionMercator;
    });