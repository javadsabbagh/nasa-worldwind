/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfaceShape
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../render/Renderable',
        '../shapes/ShapeAttributes',
        '../error/UnsupportedOperationError'
    ],
    function (ArgumentError,
              Logger,
              Renderable,
              ShapeAttributes,
              UnsupportedOperationError) {
        "use strict";

        /**
         * Constructs a surface shape with an optionally specified bundle of default attributes.
         * @alias SurfaceShape
         * @constructor
         * @augments Renderable
         * @abstract
         * @classdesc Represents a surface shape. This is an abstract base class and is meant to be instantiated
         * only by subclasses.
         * <p>
         *     Surface shapes other than [SurfacePolyline]{SurfacePolyline} have an interior and an outline and utilize
         *     the corresponding attributes in their associated [ShapeAttributes]{ShapeAttributes}. They do not
         *     utilize image-related attributes.
         * @param {ShapeAttributes} attributes The attributes to apply to this shape. May be null, in which case
         * attributes must be set directly before the shape is drawn.
         */
        var SurfaceShape = function (attributes) {

            Renderable.call(this);

            /**
             * The shape's display name and label text.
             * @type {string}
             * @default Surface Shape
             */
            this.displayName = "Surface Shape";

            /**
             * The shape's attributes. If null and this shape is not highlighted, this shape is not drawn.
             * @type {ShapeAttributes}
             * @default see [ShapeAttributes]{@link ShapeAttributes}
             */
            this.attributes = attributes ? attributes : new ShapeAttributes(null);

            /**
             * The attributes used when this shape's 'highlighted' flag is <code>true</code>. If null and the
             * highlighted flag is true, this shape's normal attributes are used. If they, too, are null, this
             * shape is not drawn.
             * @type {ShapeAttributes}
             * @default null
             */
            this.highlightAttributes = null;

            /**
             * Indicates whether this shape displays with its highlight attributes rather than its normal attributes.
             * @type {boolean}
             * @default false
             */
            this.highlighted = false;

            /**
             * Indicates whether this shape is drawn.
             * @type {boolean}
             * @default true
             */
            this.enabled = true;

            /**
             * The path type to used to interpolate between locations on this shape. Recognized values are
             * [WorldWind.GREAT_CIRCLE]{@link WorldWind.GREAT_CIRCLE},
             * [WorldWind.RHUMB_LINE]{@link WorldWind.RHUMB_LINE},
             * or [WorldWind.LINEAR]{@link WorldWind.LINEAR},
             * @type {string}
             * @default WorldWind.GREAT_CIRCLE
             */
            this.pathType = WorldWind.GREAT_CIRCLE;

            /**
             * Indicates the object to return as the owner of this shape when picked.
             * @type {Object}
             * @default null
             */
            this.pickDelegate = null;

            /**
             * Indicates the size of edge intervals computed to form the edges of this shape. Each shape type
             * defines what an edge is, but it is generally the line between implicit or specified shape locations.
             * @type {number}
             * @default 50
             */
            this.texelsPerEdgeInterval = 50;

            this.minAndMaxEdgeIntervals = [0, 100]; // TODO: Is this property necessary? How does it relate to above?
        };

        SurfaceShape.prototype = Object.create(Renderable.prototype);

        /**
         * Returns this shape's area in square meters.
         * @param {Globe} globe The globe on which to compute the area.
         * @param {Boolean} terrainConformant If <code>true</code> the returned area is that of the terrain,
         * including its hillsides and other undulations. If <code>false</code> the returned area is the shape's
         * projected area.
         */
        SurfaceShape.prototype.area = function (globe, terrainConformant) {
            throw new UnsupportedOperationError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceShape", "area", "abstractInvocation"));
        };

        return SurfaceShape;
    });