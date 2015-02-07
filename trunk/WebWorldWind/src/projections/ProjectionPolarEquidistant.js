/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ProjectionPolarEquidistant
 * @version $Id: ProjectionPolarEquidistant.js 2746 2015-02-06 18:51:30Z tgaskins $
 */
define([
        '../geom/Angle',
        '../error/ArgumentError',
        '../projections/GeographicProjection',
        '../util/Logger'
    ],
    function (Angle,
              ArgumentError,
              GeographicProjection,
              Logger) {
        "use strict";

        /**
         * Constructs a polar equidistant geographic projection.
         * @alias ProjectionPolarEquidistant
         * @constructor
         * @augments GeographicProjection
         * @classdesc Represents an polar equidistant geographic projection.
         * @param {String} pole Indicates the north or south aspect. Specify "North" for the north aspect or "South"
         * for the south aspect.
         */
        var ProjectionPolarEquidistant = function (pole) {

            GeographicProjection.call(this, "Polar", false, null);

            this.pole = pole;

            this.north = !(pole === "South");

            this.displayName = this.north ? "North Polar" : "South Polar";
        };

        ProjectionPolarEquidistant.prototype = Object.create(GeographicProjection.prototype);

        // Documented in base class.
        ProjectionPolarEquidistant.prototype.geographicToCartesian = function (globe, latitude, longitude, elevation,
                                                                              offset, result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "geographicToCartesian", "missingGlobe"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "geographicToCartesian", "missingResult"));
            }

            // Formulae taken from "Map Projections -- A Working Manual", Snyder, USGS paper 1395, pg. 195.

            if ((this.north && latitude === 90) || (!this.north && latitude === -90)) {
                result[0] = 0;
                result[1] = 0;
                result[2] = elevation;
            } else {
                var northSouthFactor = this.north ? -1 : 1,
                    a = globe.equatorialRadius * (Math.PI / 2 + latitude * Angle.DEGREES_TO_RADIANS * northSouthFactor);

                result[0] = a * Math.sin(longitude * Angle.DEGREES_TO_RADIANS);
                result[1] = a * Math.cos(longitude * Angle.DEGREES_TO_RADIANS) * northSouthFactor;
                result[2] = elevation;
            }

            return result;
        };

        // Documented in base class.
        ProjectionPolarEquidistant.prototype.geographicToCartesianGrid = function (globe, sector, numLat, numLon,
                                                                                  elevations, referenceCenter,
                                                                                  result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "geographicToCartesianGrid", "missingGlobe"));
            }

            if (!sector) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "geographicToCartesianGrid", "missingSector"));
            }

            if (!elevations || elevations.length < numLat * numLon) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "geographicToCartesianGrid",
                    "The specified elevations array is null, undefined or insufficient length"));
            }

            if (!referenceCenter) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "geographicToCartesianGrid", "The specified reference center is null or undefined."));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "geographicToCartesianGrid", "missingResult"));
            }

            var eqr = globe.equatorialRadius,
                minLat = sector.minLatitude * Angle.DEGREES_TO_RADIANS,
                maxLat = sector.maxLatitude * Angle.DEGREES_TO_RADIANS,
                minLon = sector.minLongitude * Angle.DEGREES_TO_RADIANS,
                maxLon = sector.maxLongitude * Angle.DEGREES_TO_RADIANS,
                deltaLat = (maxLat - minLat) / (numLat > 1 ? numLat : 1),
                deltaLon = (maxLon - minLon) / (numLon > 1 ? numLon : 1),
                northSouthFactor = this.north ? -1 : 1,
                pi_2 = Math.PI / 2,
                pos = 0, k = 0,
                cosLon = [], sinLon = [],
                lat, lon, a;

            // Iterate over the longitude coordinates in the specified sector and compute the cosine and sine of each
            // longitude value required to compute Cartesian points for the specified sector. This eliminates the need to
            // re-compute the same cosine and sine results for each row of constant latitude (and varying longitude).
            lon = minLon;
            for (var l = 0; l < numLon + 1; l++, lon += deltaLon) {
                if (l === numLon){
                    lon = maxLon;
                }

                cosLon[l] = Math.cos(lon);
                sinLon[l] = Math.sin(lon);
            }

            // Iterate over the latitude and longitude coordinates in the specified sector, computing the Cartesian point
            // corresponding to each latitude and longitude.
            lat = minLat;
            for (var j = 0; j < numLat + 1; j++, lat += deltaLat) {
                if (j === numLat) // explicitly set the last lat to the max latitude to ensure alignment
                    lat = maxLat;

                a = eqr * (pi_2 + lat * northSouthFactor);
                if ((this.north && lat === pi_2) || (!this.north && lat === -pi_2)) {
                    a = 0;
                }

                for (var i = 0; i < numLon + 1; i++) {

                    result[k++] = a * sinLon[i] - referenceCenter[0];
                    result[k++] = a * cosLon[i] * northSouthFactor - referenceCenter[1];
                    result[k++] = elevations[pos++] - referenceCenter[2];
                }
            }

            return result;
        };

        // Documented in base class.
        ProjectionPolarEquidistant.prototype.cartesianToGeographic = function (globe, x, y, z, offset, result) {
            if (!globe) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "cartesianToGeographic", "missingGlobe"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "cartesianToGeographic", "missingResult"));
            }

            // Formulae taken from "Map Projections -- A Working Manual", Snyder, USGS paper 1395, pg. 196.

            var rho = Math.sqrt(x * x + y * y),
                c = rho / globe.equatorialRadius;

            if (rho < 1.0e-4) {
                result.latitude = this.north ? 90 : -90;
                result.longitude = 0;
                result.altitude = z;
            } else {
                if (c > Math.PI) {
                    c = Math.PI; // map cartesian points beyond the projection's radius to the edge of the projection
                }

                result.latitude = Math.asin(Math.cos(c) * this.north ? 1 : -1);
                result.longitude = Math.atan2(x, y * this.north ? -1 : 1); // use atan2(x,y) instead of atan(x/y)
                result.altitude = z;
            }

            return result;
        };

        // Documented in base class.
        ProjectionPolarEquidistant.prototype.northTangentAtLocation = function (globe, latitude, longitude, result) {
            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ProjectionPolarEquidistant",
                    "northTangentAtLocation", "missingResult"));
            }

            // The north pointing tangent depends on the pole. With the south pole, the north pointing tangent points in the
            // same direction as the vector returned by cartesianToGeographic. With the north pole, the north pointing
            // tangent has the opposite direction.

            result[0] = Math.sin(longitude * Angle.DEGREES_TO_RADIANS) * (this.north ? -1 : 1);
            result[1] = Math.cos(longitude * Angle.DEGREES_TO_RADIANS);
            result[2] = 0;

            return result;
        };

        return ProjectionPolarEquidistant;
    });