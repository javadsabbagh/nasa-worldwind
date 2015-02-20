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
        '../geom/BoundingBox',
        '../util/Logger',
        '../geom/Matrix',
        '../render/Renderable',
        '../shapes/ShapeAttributes',
        '../error/UnsupportedOperationError',
        '../geom/Vec3'
    ],
    function (ArgumentError,
              BoundingBox,
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
         * @classdesc Provides a base class for many shapes.
         * This is an abstract class and is meant to be instantiated only by subclasses.
         */
        var AbstractShape = function () {

            Renderable.call(this);

            this.enabled = true;

            this.displayName = "Shape";

            this.attributes = new ShapeAttributes(null);

            this.highlightAttributes = null;

            this.highlighted = false;

            this._altitudeMode = WorldWind.ABSOLUTE;

            this.pickDelegate = null;

            this.referencePosition = null;

            this.shapeDataCache = {};

            this.currentData = null;

            this.activeAttributes = null;

            this.extent = null;
        };

        AbstractShape.prototype = Object.create(Renderable.prototype);

        Object.defineProperties(AbstractShape.prototype, {
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

            if (this.currentData.extent) {
                if (dc.pickingMode) {
                    if (!this.currentData.extent.intersectsFrustum(dc.pickFrustum)) {
                        return;
                    }
                } else if (!this.currentData.extent.intersectsFrustum(dc.frustumInModelCoordinates)) {
                    return;
                }

                if (dc.isSmall(this.currentData.extent, 1)) {
                    return;
                }
            }

            this.determineActiveAttributes(dc);
            if (!this.activeAttributes) {
                return;
            }

            var orderedRenderable = this.makeOrderedRenderable(dc);
            if (orderedRenderable) {
                orderedRenderable.layer = dc.currentLayer;
                dc.addOrderedRenderable(orderedRenderable);
            }
        };

        AbstractShape.prototype.renderOrdered = function (dc) {
            this.establishCurrentData(dc);
            this.doRenderOrdered(dc);
        };

        AbstractShape.prototype.makeOrderedRenderable = function (dc) {
            throw new UnsupportedOperationError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "AbstractShape", "makeOrderedRenderable", "abstractInvocation"));
        };

        AbstractShape.prototype.doRenderOrdered = function (dc) {
            throw new UnsupportedOperationError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "AbstractShape", "doRenderOrdered", "abstractInvocation"));
        };

        AbstractShape.prototype.establishCurrentData = function (dc) {
            this.currentData = this.shapeDataCache[dc.globe.stateKey];

            if (!this.currentData) {
                this.currentData = this.createShapeDataObject();
                this.shapeDataCache[dc.globe.stateKey] = this.currentData;
            }
        };

        AbstractShape.prototype.createShapeDataObject = function () {
            return {
                transformationMatrix: Matrix.fromIdentity(),
                referencePoint: new Vec3(0, 0, 0),
                extent: new BoundingBox()
            };
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