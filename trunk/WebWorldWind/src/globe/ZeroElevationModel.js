/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ZeroElevationModel
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../globe/ElevationModel',
        '../geom/Location',
        '../util/Logger',
        '../geom/Sector'],
    function (ArgumentError,
              ElevationModel,
              Location,
              Logger,
              Sector) {
        "use strict";

        /**
         * Constructs a Zero elevation model whose elevations are zero at every location.
         * @alias ZeroElevationModel
         * @constructor
         * @classdesc Represents an elevation model whose elevations are zero at all locations.
         * @augments ElevationModel
         */
        var ZeroElevationModel = function () {
            ElevationModel.call(this, Sector.FULL_SPHERE, new Location(45, 45), 1, " ", " ", 150, 150);

            /**
             * Indicates this elevation model's display name.
             * @type {string}
             * @default "Zero Elevations"
             */
            this.displayName = "Zero Elevations";

            /**
             * Indicates the last time this elevation model changed. Since a zero elevation model never changes, this
             * property always returns the date and time at which the elevation model was constructed, in milliseconds
             * since midnight Jan 1, 1970.
             * @type {number}
             * @default Date.getTime() at construction
             * @readonly
             */
            this.timestamp = Date.now();

            /**
             * This elevation model's minimum elevation, which is always zero.
             * @type {number}
             * @default 0
             * @readonly
             */
            this.minElevation = 0;

            /**
             * This elevation model's maximum elevation, which is always zero.
             * @type {number}
             * @default 0
             * @readonly
             */
            this.maxElevation = 0;
        };

        // Inherit from the abstract elevation model class.
        ZeroElevationModel.prototype = Object.create(ElevationModel.prototype);

        /**
         * Returns the minimum and maximum elevations within a specified sector.
         * @param {Sector} sector The sector for which to determine extreme elevations.
         * @returns {Number[]} An array containing the minimum and maximum elevations.
         * @throws {ArgumentError} If the specified sector is null or undefined.
         */
        ZeroElevationModel.prototype.minAndMaxElevationsForSector = function (sector) {
            if (!sector) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ZeroElevationModel", "minAndMaxElevationsForSector",
                        "missingSector"));
            }

            return [0, 0];
        };

        /**
         * Returns the elevation at a specified location.
         * @param {Number} latitude The location's latitude in degrees.
         * @param {Number} longitude The location's longitude in degrees.
         * @returns {Number} The elevation at the specified location.
         */
        ZeroElevationModel.prototype.elevationAtLocation = function (latitude, longitude) {
            return 0;
        };

        /**
         * Returns the elevations at locations within a specified sector.
         * @param {Sector} sector The sector for which to determine the elevations.
         * @param {Number} numLatitude The number of latitudinal sample locations within the sector.
         * @param {Number} numLongitude The number of longitudinal sample locations within the sector.
         * @param {Number} targetResolution The desired elevation resolution.
         * @param {Number[]} result An array of size numLatitude x numLongitude to contain the requested elevations.
         * This array must be allocated when passed to this function.
         * @returns {Number} The resolution actually achieved, which may be greater than that requested if the
         * elevation data for the requested resolution is not currently available.
         * @throws {ArgumentError} If the specified sector or result array is null or undefined, if either of the
         * specified numLatitude or numLongitude values is less than 1, or the result array is not of sufficient length
         * to hold numLatitude x numLongitude values.
         */
        ZeroElevationModel.prototype.elevationsForGrid = function (sector, numLatitude, numLongitude, targetResolution,
                                                                   result) {
            if (!sector) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ZeroElevationModel", "elevationsForSector", "missingSector"));
            }

            if (numLatitude <= 0 || numLongitude <= 0) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ZeroElevationModel",
                    "elevationsForSector", "numLatitude or numLongitude is less than 1"));
            }

            if (!result || result.length < numLatitude * numLongitude) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ZeroElevationModel",
                    "elevationsForSector", "missingArray"));
            }

            for (var i = 0, len = result.length; i < len; i++) {
                result[i] = 0;
            }

            return 0;
        };

        return ZeroElevationModel;
    });