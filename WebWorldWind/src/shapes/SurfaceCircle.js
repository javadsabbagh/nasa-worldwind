/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfaceCircle
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../shapes/ShapeAttributes',
        '../shapes/SurfaceEllipse'
    ],
    function (ArgumentError,
              Logger,
              ShapeAttributes,
              SurfaceEllipse) {
        "use strict";

        /**
         * Constructs a surface circle with a specified center and radius and an optional attributes bundle.
         * @alias SurfaceCircle
         * @constructor
         * @augments SurfaceEllipse
         * @classdesc Represents a circle draped over the terrain surface.
         * <p>
         *     SurfaceCircle uses the following attributes from its associated shape attributes bundle:
         *     <ul>
         *         <li>Draw interior</li>
         *         <li>Draw outline</li>
         *         <li>Interior color</li>
         *         <li>Outline color</li>
         *         <li>Outline width</li>
         *         <li>Outline stipple factor</li>
         *         <li>Outline stipple pattern</li>
         *     </ul>
         * @param {Location} center The circle's center location.
         * @param {Number} radius The circle's radius in meters.
         * @param {ShapeAttributes} attributes The attributes to apply to this shape. May be null, in which case
         * attributes must be set directly before the shape is drawn.
         * @throws {ArgumentError} If the specified center location is null or undefined or the specified radius
         * is negative.
         */
        var SurfaceCircle = function (center, radius, attributes) {
            if (!center) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceCircle", "constructor", "missingLocation"));
            }

            if (radius < 0) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceCircle", "constructor", "Radius is negative"));
            }

            SurfaceEllipse.call(this, center, radius, radius, 0, attributes);

            /**
             * This shape's radius, in meters.
             * @type {Number}
             */
            this.radius = radius;
        };

        SurfaceCircle.prototype = Object.create(SurfaceEllipse.prototype);

        return SurfaceCircle;
    });