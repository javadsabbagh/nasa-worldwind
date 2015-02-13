/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfaceImage
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../pick/PickedObject',
        '../render/SurfaceTile'
    ],
    function (ArgumentError,
              Logger,
              PickedObject,
              SurfaceTile) {
        "use strict";

        /**
         * Constructs a surface image shape for a specified sector and image path.
         * @alias SurfaceImage
         * @constructor
         * @augments SurfaceTile
         * @classdesc Represents an image drawn on the terrain.
         * @param {Sector} sector The sector spanned by this surface image.
         * @param {String} imagePath The image path of the image to draw on the terrain.
         * @throws {ArgumentError} If either the specified sector or image path is null or undefined.
         */
        var SurfaceImage = function (sector, imagePath) {
            if (!sector) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceImage", "constructor",
                    "missingSector"));
            }

            if (!imagePath) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceImage", "constructor",
                    "missingPath"));
            }

            SurfaceTile.call(this, sector);

            /**
             * Indicates whether this surface image is drawn.
             * @type {boolean}
             * @default true
             */
            this.enabled = true;

            /**
             * The path to the image.
             * @type {String}
             */
            this._imagePath = imagePath;

            /**
             * This surface image's opacity. When this surface image is drawn, the actual opacity is the product of
             * this opacity and the opacity of the layer containing this surface image.
             * @type {number}
             */
            this.opacity = 1;

            /**
             * This surface image's display name;
             * @type {string}
             */
            this.displayName = "Surface Image";
        };

        SurfaceImage.prototype = Object.create(SurfaceTile.prototype);

        Object.defineProperties(SurfaceImage.prototype, {
            imagePath: {
                get: function () {
                    return this._imagePath;
                },
                set: function (imagePath) {
                    if (!imagePath) {
                        throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceImage", "imagePath",
                            "missingPath"));
                    }

                    this._imagePath = imagePath;
                    this.imagePathWasUpdated = true;
                }
            }
        });

        SurfaceImage.prototype.bind = function (dc) {
            var texture = dc.gpuResourceCache.resourceForKey(this._imagePath);
            if (texture && !this.imagePathWasUpdated) {
                return texture.bind(dc);
            } else {
                dc.gpuResourceCache.retrieveTexture(dc.currentGlContext, this._imagePath);
                this.imagePathWasUpdated = false;
            }
        };

        SurfaceImage.prototype.applyInternalTransform = function (dc, matrix) {
            // No need to apply the transform.
        };

        /**
         * Displays this surface image. Called by the layer containing this surface image.
         * @param {DrawContext} dc The current draw context.
         */
        SurfaceImage.prototype.render = function (dc) {
            if (!this.enabled || !this.sector.overlaps(dc.terrain.sector)) {
                return;
            }

            if (dc.pickingMode) {
                this.pickColor = dc.uniquePickColor();
            }

            dc.surfaceTileRenderer.renderTiles(dc, [this], this.opacity * dc.currentLayer.opacity);

            if (dc.pickingMode) {
                var po = new PickedObject(this.pickColor.clone(), this.pickDelegate ? this.pickDelegate : this,
                    null, this.layer, false);
                dc.resolvePick(po);
            }

            dc.currentLayer.inCurrentFrame = true;
        };

        return SurfaceImage;
    });