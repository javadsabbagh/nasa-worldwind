/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Globe2D
 * @version $Id$
 */
define([
        '../geom/Angle',
        '../error/ArgumentError',
        '../geom/BoundingBox',
        '../projections/ProjectionEquirectangular',
        '../projections/GeographicProjection',
        '../globe/Globe',
        '../util/Logger',
        '../geom/Sector',
        '../geom/Vec3',
        '../globe/ZeroElevationModel'
    ],
    function (Angle,
              ArgumentError,
              BoundingBox,
              ProjectionEquirectangular,
              GeographicProjection,
              Globe,
              Logger,
              Sector,
              Vec3,
              ZeroElevationModel) {
        "use strict";

        /**
         * Constructs 2D globe.
         * @alias Globe2D
         * @constructor
         * @augments Globe
         * @classdesc Represents a 2D flat globe. Depending on the projection, the globe may be continuously
         * scrolling longitudinally.
         *
         * @param {ElevationModel} elevationModel The elevation model to use for the globe.
         * @throws {ArgumentError} If the specified elevation model is null or undefined.
         */
        var Globe2D = function () {
            Globe.call(this, new ZeroElevationModel());

            // Internal. Intentionally not documented.
            this._projection = new ProjectionEquirectangular();

            // Internal. Intentionally not documented.
            this._offset = 0;

            // Internal. Intentionally not documented.
            this.offsetVector = new Vec3(0, 0, 0);
        };

        Globe2D.prototype = Object.create(Globe.prototype);

        Object.defineProperties(Globe2D.prototype, {
            /**
             * Indicates whether this projection is continuous with itself -- that it should scroll continuously
             * horizontally.
             * @memberof Globe2D.prototype
             * @readonly
             * @type {Boolean}
             */
            continuous: {
                get: function () {
                    return this.projection.continuous;
                }
            },

            /**
             * The projection used by this 2D globe.
             * @memberof Globe2D.prototype
             * @default {@link ProjectionEquirectangular}
             * @type {GeographicProjection}
             */
            projection: {
                get: function () {
                    return this._projection;
                },
                set: function (projection) {
                    if (!projection) {
                        throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe2D",
                            "projection", "missingProjection"));
                    }
                    this._projection = projection;
                }
            },

            /**
             * An offset to apply to this globe when translating between Geographic positions and Cartesian points.
             * Used during scrolling to position points appropriately.
             * Applications typically do not access this property. It is used by the associated globe.
             * @memberof Globe2D.prototype
             * @type {Number}
             */
            offset: {
                get: function () {
                    return this._offset;
                },
                set: function (offset) {
                    this._offset = offset;
                    this.offsetVector[0] = offset * 2 * Math.PI * this.equatorialRadius;
                }
            },

            /**
             * An object identifying this globe's current state. Used to compare states during rendering to
             * determine whether globe-state dependent cached values must be updated. Applications typically do not
             * interact with this property.
             * @memberof Globe2D.prototype
             * @readonly
             * @type {{}}
             * @see [sameState]{@link Globe2D#sameState}
             */
            stateKey: {
                get: function () {
                    return {
                        globe: this,
                        elevationModel: this.elevationModel,
                        projection: this.projection,
                        offset: this.offset
                    };
                }
            }
        });

        // Documented in superclass.
        Globe2D.prototype.sameState = function (stateKey) {
            return stateKey
                && this === stateKey.globe
                && this.elevationModel === stateKey.elevationModel
                && this._projection == stateKey.projection
                && this._offset === stateKey.offset;
        };

        /**
         * Computes a Cartesian point from a specified position.
         * The coordinate system used varies with the projection.
         * @param {Number} latitude The position's latitude.
         * @param {Number} longitude The position's longitude.
         * @param {Number} altitude The position's altitude.
         * @param {Vec3} result A reference to a pre-allocated {@link Vec3} instance to contain the computed X,
         * Y and Z Cartesian coordinates.
         * @returns {Vec3} The result argument.
         * @throws {ArgumentError} If the specified result is null or undefined.
         */
        Globe2D.prototype.computePointFromPosition = function (latitude, longitude, altitude, result) {
            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe2D", "computePointFromPosition",
                    "missingResult"));
            }

            return this.projection.geographicToCartesian(this, latitude, longitude, altitude, this.offsetVector, result);
        };

        // Documented in superclass.
        Globe2D.prototype.computePointsForSector = function (sector, tileWidth, tileHeight, elevations,
                                                             referencePoint, resultPoints) {

            return this.projection.geographicToCartesianGrid(this, sector, tileWidth, tileHeight, elevations,
                referencePoint, resultPoints);
        };

        /**
         * Computes a geographic position from a specified Cartesian point.
         * The coordinate system used varies with the projection.
         *
         * @param {Number} x The X coordinate.
         * @param {Number} y The Y coordinate.
         * @param {Number} z The Z coordinate.
         * @param {Position} result A pre-allocated {@link Position} instance in which to return the computed position.
         * @returns {Position} The specified result position.
         * @throws {ArgumentError} If the specified result is null or undefined.
         */
        Globe2D.prototype.computePositionFromPoint = function (x, y, z, result) {
            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe2D", "computePositionFromPoint",
                    "missingResult"));
            }

            this.projection.cartesianToGeographic(this, x, y, z, this.offsetVector, result);

            // Wrap if the globe is continuous.
            if (result.longitude < -180) {
                result.longitude += 360;
            } else if (result.longitude > 180) {
                result.longitude -= 360;
            }

            return result;
        };

        // Documented in superclass.
        Globe2D.prototype.surfaceNormalAtLocation = function (latitude, longitude, result) {
            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe2D", "surfaceNormalAtLocation",
                    "missingResult"));
            }

            result[0] = 0;
            result[1] = 0;
            result[2] = 1;

            return result;
        };

        // Documented in superclass.
        Globe2D.prototype.surfaceNormalAtPoint = function (x, y, z, result) {
            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe", "surfaceNormalAtPoint",
                    "missingResult"));
            }

            result[0] = 0;
            result[1] = 0;
            result[2] = 1;

            return result;
        };

        // Documented in superclass.
        Globe2D.prototype.northTangentAtLocation = function (latitude, longitude, result) {
            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe", "northTangentAtLocation",
                    "missingResult"));
            }

            return this.projection.northTangentAtLocation(this, latitude, longitude, result);
        };

        // Documented in superclass.
        Globe2D.prototype.northTangentAtPoint = function (x, y, z, result) {
            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe2D", "northTangentAtPoint",
                    "missingResult"));
            }

            return this.projection.northTangentAtPoint(this, x, y, z, result);
        };

        // Documented in superclass.
        Globe2D.prototype.intersectsFrustum = function (frustum) {
            if (!frustum) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe2D",
                    "intersectsFrustum", "missingFrustum"));
            }
            var bbox = new BoundingBox(Sector.FULL_SPHERE, this, this.elevationModel.minElevation,
                this.elevationModel.maxElevation);

            return bbox.intersectsFrustum(frustum);
        };

        // Documented in superclass.
        Globe2D.prototype.intersectsLine = function (line, result) {
            if (!line) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Globe", "intersectWithRay", "missingLine"));
            }

            if (!result) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Globe", "intersectsLine", "missingResult"));
            }

            var normal = new Vec3(0, 1, 0);

            return Math.abs(line.origin.dot(normal)) != 1;
        };

        return Globe2D;
    });