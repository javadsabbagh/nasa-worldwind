/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfaceEllipse
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../shapes/ShapeAttributes',
        '../shapes/SurfaceShape'
    ],
    function (ArgumentError,
              Logger,
              ShapeAttributes,
              SurfaceShape) {
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
         * @param {ShapeAttributes} attributes The attributes to apply to this shape. May be null, in which case
         * attributes must be set directly before the shape is drawn.
         * @throws {ArgumentError} If the specified center location is null or undefined or if either specified radii
         * is negative.
         */
        var SurfaceEllipse = function (center, majorRadius, minorRadius, attributes) {
            if (!center) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceEllipse", "constructor", "missingLocation"));
            }

            if (majorRadius < 0 || minorRadius < 0) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceEllipse", "constructor", "Radius is negative"));
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
        };

        SurfaceEllipse.prototype = Object.create(SurfaceShape.prototype);

        return SurfaceEllipse;
    });