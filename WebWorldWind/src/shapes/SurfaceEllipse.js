/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfaceEllipse
 * @version $Id$
 */
define([
        '../geom/Angle',
        '../error/ArgumentError',
        '../geom/Location',
        '../util/Logger',
        '../shapes/ShapeAttributes',
        '../shapes/SurfaceShape',
        '../util/WWMath'
    ],
    function (Angle,
              ArgumentError,
              Location,
              Logger,
              ShapeAttributes,
              SurfaceShape,
              WWMath) {
        "use strict";

        /**
         * Constructs a surface ellipse with a specified center and radii and an optional attributes bundle.
         * @alias SurfaceEllipse
         * @constructor
         * @augments SurfaceShape
         * @classdesc Represents an ellipse draped over the terrain surface.
         * <p>
         * SurfaceEllipse uses the following attributes from its associated shape attributes bundle:
         * <ul>
         *         <li>Draw interior</li>
         *         <li>Draw outline</li>
         *         <li>Interior color</li>
         *         <li>Outline color</li>
         *         <li>Outline width</li>
         *         <li>Outline stipple factor</li>
         *         <li>Outline stipple pattern</li>
         * </ul>
         * @param {Location} center The ellipse's center location.
         * @param {Number} majorRadius The ellipse's major radius in meters.
         * @param {Number} minorRadius The ellipse's minor radius in meters.
         * @param {Number} heading The heading of the major axis in degrees.
         * @param {ShapeAttributes} attributes The attributes to apply to this shape. May be null, in which case
         * attributes must be set directly before the shape is drawn.
         * @throws {ArgumentError} If the specified center location is null or undefined or if either specified radii
         * is negative.
         */
        var SurfaceEllipse = function (center, majorRadius, minorRadius, heading, attributes) {
            if (!center) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceEllipse", "constructor", "missingLocation"));
            }

            if (majorRadius < 0 || minorRadius < 0) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceEllipse", "constructor", "Radius is negative."));
            }

            SurfaceShape.call(this, attributes);

            /**
             * This shape's center location.
             * @type {Location}
             */
            this.center = center;

            /**
             * This shape's major radius, in meters.
             * @type {Number}
             */
            this.majorRadius = majorRadius;

            /**
             * This shape's minor radius in meters.
             * @type {Number}
             */
            this.minorRadius = minorRadius;

            /**
             * The heading of the major axis, specified as degrees clockwise from North.
             * @type {number}
             * @default 0
             */
            this.heading = heading;

            /**
             * The number of intervals to generate locations for.
             * @type {number}
             * @default SurfaceEllipse.DEFAULT_NUM_INTERVALS
             */
            this.intervals = SurfaceEllipse.DEFAULT_NUM_INTERVALS;
        };

        SurfaceEllipse.prototype = Object.create(SurfaceShape.prototype);

        // Internal. Intentionally not documented.
        SurfaceEllipse.prototype.computeBoundaries = function(dc) {
            if (this.majorRadius == 0 && this.minorRadius == 0) {
                return null;
            }

            var globe = dc.globe,
                numLocations = 1 + Math.max(SurfaceEllipse.MIN_NUM_INTERVALS, this.intervals),
                da = (2 * Math.PI) / (numLocations - 1),
                globeRadius = globe.radiusAt(this.center.latitude, this.center.longitude);

            this._boundaries = new Array(numLocations);

            for (var i = 0; i < numLocations; i++) {
                var angle = (i != numLocations - 1) ? i * da : 0,
                    xLength = this.majorRadius * Math.cos(angle),
                    yLength = this.minorRadius * Math.sin(angle),
                    distance = Math.sqrt(xLength * xLength + yLength * yLength);

                // azimuth runs positive clockwise from north and through 360 degrees.
                var azimuth = (Math.PI / 2.0) -
                    (Math.acos(xLength / distance) * WWMath.signum(yLength) - this.heading * Angle.DEGREES_TO_RADIANS);

                this._boundaries[i] = Location.greatCircleLocation(this.center, azimuth * Angle.RADIANS_TO_DEGREES,
                    distance / globeRadius, new Location(0, 0));
            }
        };

        /**
         * The minimum number of intervals the ellipse generates.
         * @type {number}
         */
        SurfaceEllipse.MIN_NUM_INTERVALS = 8;

        /**
         * The default number of intervals the ellipse generates.
         * @type {number}
         */
        SurfaceEllipse.DEFAULT_NUM_INTERVALS = 64;

        return SurfaceEllipse;
    });