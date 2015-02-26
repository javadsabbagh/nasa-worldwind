/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports AbstractShape
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../geom/Matrix',
        '../render/Renderable',
        '../shapes/ShapeAttributes',
        '../error/UnsupportedOperationError',
        '../geom/Vec3'
    ],
    function (ArgumentError,
              Logger,
              Matrix,
              Renderable,
              ShapeAttributes,
              UnsupportedOperationError,
              Vec3) {
        "use strict";

        /**
         * Constructs an abstract shape instance. Meant to be called only by subclasses.
         * @alias AbstractShape
         * @constructor
         * @augments Renderable
         * @protected
         * @classdesc Provides a base class for shapes other than surface shapes. Implements common attribute handling
         * and rendering flow. This is an abstract class and is meant to be instantiated only by subclasses.
         * <p>
         *     In order to support simultaneous use of this shape by multiple windows, this shape maintains a cache
         *     of data computed relative to the globe displayed in each window. During rendering, the data for the
         *     currently active globe, as indicated in the draw context, is made current. Subsequently called methods
         *     rely on the existence of the data cache entry.
         */
        var AbstractShape = function () {

            Renderable.call(this);

            /**
             * This shape's normal (non-highlight) attributes.
             * @type {ShapeAttributes}
             */
            this.attributes = new ShapeAttributes(null);

            /**
             * This shape's highlight attributes.
             * @type {ShapeAttributes}
             * @default null
             */
            this.highlightAttributes = null;

            /**
             * Indicates whether this shape uses its normal attributes or its highlight attributes when displayed.
             * If true, the highlight attributes are used, otherwise the normal attributes are used. The normal
             * attributes are also used if no highlight attributes have been specified.
             * @type {boolean}
             * @default false
             */
            this.highlighted = false;

            // Private. See defined property below for documentation.
            this._altitudeMode = WorldWind.ABSOLUTE;

            // Internal use only. Intentionally not documented.
            // A position used to compute relative coordinates for the shape.
            this.referencePosition = null;

            // Internal use only. Intentionally not documented.
            // Holds the per-globe data generated during makeOrderedRenderable.
            this.shapeDataCache = {};

            // Internal use only. Intentionally not documented.
            // The shape-data-cache data that is for the currently active globe. This field is made current prior to
            // calls to makeOrderedRenderable and doRenderOrdered.
            this.currentData = null;

            // Internal use only. Intentionally not documented.
            this.activeAttributes = null;

            /**
             * Indicates how long to use terrain-specific shape data before regenerating it, in milliseconds. A value
             * of zero specifies that shape data should be regenerated every frame. While this causes the shape to
             * adapt more frequently to the terrain, it decreases performance.
             * @type {number}
             * @default 2000 (milliseconds)
             */
            this.expirationInterval = 2000;
        };

        AbstractShape.prototype = Object.create(Renderable.prototype);

        Object.defineProperties(AbstractShape.prototype, {
            /**
             * The altitude mode to use when drawing this shape. Recognized values are:
             * <ul>
             *     <li>[WorldWind.ABSOLUTE]{@link WorldWind#ABSOLUTE}</li>
             *     <li>[WorldWind.RELATIVE_TO_GROUND]{@link WorldWind#RELATIVE_TO_GROUND}</li>
             *     <li>[WorldWind.CLAMP_TO_GROUND]{@link WorldWind#CLAMP_TO_GROUND}</li>
             * </ul>
             * @type {String}
             * @default WorldWind.ABSOLUTE
             * @memberof AbstractShape.prototype
             */
            altitudeMode: {
                get: function () {
                    return this._altitudeMode;
                },
                set: function (altitudeMode) {
                    if (!altitudeMode) {
                        throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "AbstractShape",
                            "altitudeMode", "missingAltitudeMode"));
                    }

                    this._altitudeMode = altitudeMode;
                    this.reset();
                }
            }
        });

        AbstractShape.prototype.reset = function () {
            this.shapeDataCache = {};
        };

        AbstractShape.prototype.render = function (dc) {
            if (!this.enabled) {
                return;
            }

            this.establishCurrentData(dc);

            if (dc.globe.projectionLimits && !this.isWithinProjectionLimits(dc)) {
                return;
            }

            this.determineActiveAttributes(dc);
            if (!this.activeAttributes) {
                return;
            }

            var orderedRenderable = this.makeOrderedRenderable(dc);
            if (orderedRenderable) {

                if (!this.intersectsFrustum(dc)) {
                    return;
                }

                if (dc.isSmall(this.currentData.extent, 1)) {
                    return;
                }

                orderedRenderable.layer = dc.currentLayer;
                dc.addOrderedRenderable(orderedRenderable);
            }
        };

        /**
         * Draws this shape during ordered rendering. This method is called by the draw context and is not intended to
         * be called by applications.
         * @param {DrawContext} dc The current draw context.
         */
        AbstractShape.prototype.renderOrdered = function (dc) {
            this.currentData = this.shapeDataCache[dc.globeStateKey];

            this.beginDrawing(dc);
            try {
                this.doRenderOrdered(dc);
            } finally {
                this.endDrawing(dc);
            }
        };

        // Internal. Intentionally not documented.
        AbstractShape.prototype.makeOrderedRenderable = function (dc) {
            var or = this.doMakeOrderedRenderable(dc);
            this.currentData.verticalExaggeration = dc.verticalExaggeration;

            return or;
        };

        /**
         * Called during rendering. Subclasses must override this method with one that creates and enques an
         * ordered renderable for this shape. Applications do not call this method.
         * @param {DrawContext} dc The current draw context.
         * @protected
         */
        AbstractShape.prototype.doMakeOrderedRenderable = function (dc) {
            throw new UnsupportedOperationError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "AbstractShape", "makeOrderedRenderable", "abstractInvocation"));
        };

        /**
         * Called during ordered rendering. Subclasses must override this method.
         * @param {DrawContext} dc The current draw context.
         * @protected
         */
        AbstractShape.prototype.doRenderOrdered = function (dc) {
            throw new UnsupportedOperationError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "AbstractShape", "doRenderOrdered", "abstractInvocation"));
        };

        /**
         * Called during ordered rendering. Subclasses may override this method in order to perform operations prior
         * to drawing the shape. Applications do not call this method.
         * @param {DrawContext} dc The current draw context.
         * @protected
         */
        AbstractShape.prototype.beginDrawing = function (dc) {
        };

        /**
         * Called during ordered rendering. Subclasses may override this method in order to perform operations after
         * the shape is drawn. Applications do not call this method.
         * @param {DrawContext} dc The current draw context.
         * @protected
         */
        AbstractShape.prototype.endDrawing = function (dc) {
        };

        // Internal. Intentionally not documented.
        AbstractShape.prototype.intersectsFrustum = function (dc) {
            if (this.currentData && this.currentData.extent) {
                if (dc.pickingMode) {
                    return this.currentData.extent.intersectsFrustum(dc.pickFrustum);
                } else {
                    return this.currentData.extent.intersectsFrustum(dc.navigatorState.frustumInModelCoordinates);
                }
            } else {
                return true;
            }
        };

        // Internal. Intentionally not documented.
        AbstractShape.prototype.establishCurrentData = function (dc) {
            this.currentData = this.shapeDataCache[dc.globeStateKey];
            if (!this.currentData || !this.isShapeDataCurrent(dc, this.currentData)) {
                this.currentData = this.createShapeDataObject();
                this.shapeDataCache[dc.globeStateKey] = this.currentData;
            }
        };

        /**
         * Creates a new shape data object for the current globe state. Subclasses may override this method to
         * modify the shape data object that this method creates, but must also call this method on this base class.
         * Applications do not call this method.
         * @returns {Object} The shape data object.
         * @protected
         */
        AbstractShape.prototype.createShapeDataObject = function () {
            return {
                transformationMatrix: Matrix.fromIdentity(),
                referencePoint: new Vec3(0, 0, 0),
                // The random addition in the line below keeps all shapes from regenerating during the same frame.
                expiryTime: Date.now() + this.expirationInterval + 1e3 * Math.random()
            };
        };

        /**
         * Indicates whether a specified shape data object is current. Subclasses may override this method to add
         * criteria indicating whether the shape data object is current, but must also call this method on this base
         * class. Applications do not call this method.
         * @param {DrawContext} dc The current draw context.
         * @param {Object} shapeData The object to validate.
         * @returns {boolean} True if the object is current, otherwise false.
         * @protected
         */
        AbstractShape.prototype.isShapeDataCurrent = function (dc, shapeData) {
            return shapeData.verticalExaggeration === dc.verticalExaggeration
                && shapeData.expiryTime > Date.now();
        };

        // Internal. Intentionally not documented.
        AbstractShape.prototype.determineActiveAttributes = function (dc) {
            if (this.highlighted && this.highlightAttributes) {
                this.activeAttributes = this.highlightAttributes;
            } else {
                this.activeAttributes = this.attributes;
            }
        };

        AbstractShape.prototype.isWithinProjectionLimits = function (dc) {
            return true;
        };

        return AbstractShape;
    });