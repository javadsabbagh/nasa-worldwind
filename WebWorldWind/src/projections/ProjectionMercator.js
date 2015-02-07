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
        '../geom/Vec3',
        '../util/WWMath'
    ],
    function (Angle,
              ArgumentError,
              GeographicProjection,
              Logger,
              Sector,
              Vec3,
              WWMath) {
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
        ProjectionMercator.prototype.geographicToCartesian = function (globe, latitude, longitude, elevation, offset,
                                                                       result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionMercator",
                    "geographicToCartesian", "missingGlobe"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionMercator",
                    "geographicToCartesian", "missingResult"));
            }

            if (latitude > this.projectionLimits.maxLatitude) {
                latitude = this.projectionLimits.maxLatitude;
            }
            if (latitude < this.projectionLimits.minLatitude) {
                latitude = this.projectionLimits.minLatitude;
            }

            // See "Map Projections: A Working Manual", page 44 for the source of the below formulas.

            var ecc = Math.sqrt(globe.eccentricitySquared),
                sinLat = Math.sin(latitude * Angle.DEGREES_TO_RADIANS),
                s = ((1 + sinLat) / (1 - sinLat)) * Math.pow((1 - ecc * sinLat) / (1 + ecc * sinLat), ecc);

            result[0] = globe.equatorialRadius * longitude * Angle.DEGREES_TO_RADIANS + (offset ? offset[0] : 0);
            result[1] = 0.5 * globe.equatorialRadius * Math.log(s);
            result[2] = elevation;

            return result;
        };

        Object.defineProperties(ProjectionMercator.prototype, {
            /**
             * A string identifying this projection's current state. Used to compare states during rendering to
             * determine whether globe-state dependent cached values must be updated. Applications typically do not
             * interact with this property.
             * @memberof ProjectionMercator.prototype
             * @readonly
             * @type {String}
             */
            stateKey: {
                get: function () {
                    return "projection mercator ";
                }
            }
        });

        // Documented in base class.
        ProjectionMercator.prototype.geographicToCartesianGrid = function (globe, sector, numLat, numLon, elevations,
                                                                           referenceCenter, result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionMercator",
                    "geographicToCartesianGrid", "missingGlobe"));
            }

            if (!sector) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionMercator",
                    "geographicToCartesianGrid", "missingSector"));
            }

            if (!elevations || elevations.length < numLat * numLon) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionMercator",
                    "geographicToCartesianGrid",
                    "The specified elevations array is null, undefined or insufficient length"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionMercator",
                    "geographicToCartesianGrid", "missingResult"));
            }

            var eqr = globe.equatorialRadius,
                ecc = Math.sqrt(globe.eccentricitySquared),
                minLat = sector.minLatitude * Angle.DEGREES_TO_RADIANS,
                maxLat = sector.maxLatitude * Angle.DEGREES_TO_RADIANS,
                minLon = sector.minLongitude * Angle.DEGREES_TO_RADIANS,
                maxLon = sector.maxLongitude * Angle.DEGREES_TO_RADIANS,
                deltaLat = (maxLat - minLat) / (numLat > 1 ? numLat : 1),
                deltaLon = (maxLon - minLon) / (numLon > 1 ? numLon : 1),
                minLatLimit = this.projectionLimits.minLatitude * Angle.DEGREES_TO_RADIANS,
                maxLatLimit = this.projectionLimits.maxLatitude * Angle.DEGREES_TO_RADIANS,
                sinLat, s, lat, lon, y,
                pos = 0, k = 0;

            // Iterate over the latitude and longitude coordinates in the specified sector, computing the Cartesian point
            // corresponding to each latitude and longitude.
            lat = minLat;
            for (var j = 0; j < numLat + 1; j++, lat += deltaLat) {
                if (j === numLat) // explicitly set the last lat to the max latitude to ensure alignment
                    lat = maxLat;
                lat = WWMath.clamp(lat, minLatLimit, maxLatLimit);

                // Latitude is constant for each row. Values that are a function of latitude can be computed once per row.
                sinLat = Math.sin(lat);
                s = ((1 + sinLat) / (1 - sinLat)) * Math.pow((1 - ecc * sinLat) / (1 + ecc * sinLat), ecc);
                y = eqr * Math.log(s) * 0.5 - referenceCenter[1];

                lon = minLon;
                for (var i = 0; i < numLon + 1; i++, lon += deltaLon) {
                    if (i === numLon) // explicitly set the last lon to the max longitude to ensure alignment
                        lon = maxLon;

                    result[k++] = eqr * lon - referenceCenter[0];
                    result[k++] = y;
                    result[k++] = elevations[pos++] - referenceCenter[2];
                }
            }

            return result;
        };

        // Documented in base class.
        ProjectionMercator.prototype.cartesianToGeographic = function (globe, x, y, z, offset, result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionMercator",
                    "cartesianToGeographic", "missingGlobe"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionMercator",
                    "cartesianToGeographic", "missingResult"));
            }

            // See "Map Projections: A Working Manual", pages 45 and 19 for the source of the below formulas.

            var ecc2 = globe.eccentricitySquared,
                ecc4 = ecc2 * ecc2,
                ecc6 = ecc4 * ecc2,
                ecc8 = ecc6 * ecc2,
                t = Math.pow(Math.E, - y / globe.equatorialRadius),
                A = Math.PI / 2 - 2 * Math.atan(t),
                B = ecc2 / 2 + 5 * ecc4 / 24 + ecc6 / 12 + 13 * ecc8 / 360,
                C = 7 * ecc4 / 48 + 29 * ecc6 / 240 + 811 * ecc8 / 11520,
                D = 7 * ecc6 / 120 + 81 * ecc8 / 1120,
                E = 4279 * ecc8 / 161280,
                Ap = A - C + E,
                Bp = B - 3 * D,
                Cp = 2 * C - 8 * E,
                Dp = 4 * D,
                Ep = 8 * E,
                s2p = Math.sin(2 * A),
                lat = Ap + s2p * (Bp + s2p * (Cp + s2p * (Dp + Ep * s2p)));

            result.latitude = lat * Angle.RADIANS_TO_DEGREES;
            result.longitude = ((x - (offset ? offset[0] : 0)) / globe.equatorialRadius) * Angle.RADIANS_TO_DEGREES;
            result.altitude = z;

            return result;
        };

        return ProjectionMercator;
    });